// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: { create: vi.fn() },
    estimateConfig: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    estimateRule: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    committed: false,
    revalidatePath: vi.fn(),
    ruleSafeParse: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/admin-auth", () => ({
  adminOnlyRoles: ["ADMIN"],
  getVerifiedAdminSession: vi.fn().mockResolvedValue({
    user: { id: "admin-1" },
  }),
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/validations", () => ({
  estimateConfigSchema: { safeParse: vi.fn() },
  estimateRuleSchema: { safeParse: mocks.ruleSafeParse },
}));

import { saveEstimateRule } from "@/app/admin/(protected)/estimador/actions";

const rule = {
  active: false,
  description: "Rango de prueba",
  id: "rule-1",
  key: "remodelacion",
  label: "Remodelación",
  maxUsdPerM2: 1_200,
  minimumProjectUsd: 20_000,
  minUsdPerM2: 800,
  sortOrder: 1,
};

function createFormData() {
  const formData = new FormData();
  formData.set("expectedVersion", "4");
  return formData;
}

describe("estimator admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.committed = false;
    mocks.ruleSafeParse.mockReturnValue({ success: true, data: rule });
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) => {
        const result = await callback(mocks.transactionClient);
        mocks.committed = true;
        return result;
      },
    );
    mocks.transactionClient.estimateConfig.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.transactionClient.estimateConfig.findUnique.mockResolvedValue({
      enabled: true,
    });
    mocks.transactionClient.estimateRule.count.mockResolvedValue(0);
    mocks.transactionClient.estimateRule.update.mockResolvedValue({
      id: rule.id,
      label: rule.label,
    });
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.revalidatePath.mockImplementation(() => {
      expect(mocks.committed).toBe(true);
    });
  });

  it("blocks deactivating the last active rule while the estimator is enabled", async () => {
    const result = await saveEstimateRule(
      { ok: false, message: "" },
      createFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message:
        "No podés desactivar la última categoría activa mientras el estimador está publicado.",
    });
    expect(mocks.transactionClient.estimateRule.update).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.committed).toBe(false);
  });

  it("allows deactivation when another active rule remains and revalidates after commit", async () => {
    mocks.transactionClient.estimateRule.count.mockResolvedValue(1);

    const result = await saveEstimateRule(
      { ok: false, message: "" },
      createFormData(),
    );

    expect(result).toMatchObject({
      ok: true,
      resource: { id: rule.id, version: 5 },
    });
    expect(mocks.transactionClient.estimateRule.update).toHaveBeenCalledWith({
      where: { id: rule.id },
      data: expect.objectContaining({ active: false }),
    });
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/", "layout"],
      ["/estimador"],
      ["/sitemap.xml"],
    ]);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/admin/estimador");
  });
});
