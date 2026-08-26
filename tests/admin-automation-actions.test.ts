// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: { create: vi.fn() },
    leadAutomationDelivery: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    committed: false,
    getVerifiedAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/admin-auth", () => ({
  adminOnlyRoles: ["ADMIN"],
  getVerifiedAdminSession: mocks.getVerifiedAdminSession,
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import {
  requeueAutomationBatch,
  requeueAutomationDelivery,
} from "@/app/admin/(protected)/automations/actions";

function createFormData() {
  const formData = new FormData();
  formData.set("deliveryId", "delivery-1");
  return formData;
}

describe("automation admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.committed = false;
    mocks.getVerifiedAdminSession.mockResolvedValue({
      user: { id: "admin-1" },
    });
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) => {
        const result = await callback(mocks.transactionClient);
        mocks.committed = true;
        return result;
      },
    );
    mocks.transactionClient.leadAutomationDelivery.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.transactionClient.leadAutomationDelivery.findUnique.mockResolvedValue({
      lastErrorCode: "HTTP_503",
      lead: { name: "Consulta Norte" },
      status: "FAILED",
    });
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.revalidatePath.mockImplementation(() => {
      expect(mocks.committed).toBe(true);
    });
  });

  it("requeues the delivery and writes its audit log in one transaction", async () => {
    const result = await requeueAutomationDelivery(
      { ok: false, message: "" },
      createFormData(),
    );

    expect(result).toMatchObject({ ok: true });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(
      mocks.transactionClient.leadAutomationDelivery.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "delivery-1",
          lead: { privacyErasureRequestedAt: null },
          status: "FAILED",
        },
      }),
    );
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "REQUEUE",
        entityId: "delivery-1",
        summary: expect.stringContaining("HTTP_503"),
      }),
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not report success or revalidate when the audit write fails", async () => {
    mocks.transactionClient.auditLog.create.mockRejectedValue(
      new Error("audit unavailable"),
    );

    const result = await requeueAutomationDelivery(
      { ok: false, message: "" },
      createFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: "No se pudo reencolar la entrega. Intentá nuevamente.",
    });
    expect(mocks.committed).toBe(false);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects unauthorized and malformed requeue attempts before opening a transaction", async () => {
    mocks.getVerifiedAdminSession.mockResolvedValueOnce(null);

    await expect(
      requeueAutomationDelivery(
        { ok: false, message: "" },
        createFormData(),
      ),
    ).resolves.toEqual({
      ok: false,
      message: "Solo un Admin puede reencolar entregas.",
    });

    const invalidFormData = new FormData();
    invalidFormData.set("deliveryId", "../delivery-1");
    await expect(
      requeueAutomationDelivery(
        { ok: false, message: "" },
        invalidFormData,
      ),
    ).resolves.toEqual({
      ok: false,
      message: "La entrega indicada no es válida.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not audit a delivery lost to a concurrent requeue", async () => {
    mocks.transactionClient.leadAutomationDelivery.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await requeueAutomationDelivery(
      { ok: false, message: "" },
      createFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: "La entrega ya no está disponible para reencolar.",
    });
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
  });

  it("requeues a deterministic batch and records the committed count", async () => {
    mocks.transactionClient.leadAutomationDelivery.findMany.mockResolvedValue([
      { id: "delivery-1" },
    ]);

    const result = await requeueAutomationBatch(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result).toMatchObject({
      ok: true,
      message: expect.stringContaining("1 entrega reencolada"),
    });
    expect(
      mocks.transactionClient.leadAutomationDelivery.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { nextAttemptAt: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
        where: {
          AND: [
            {
              nextAttemptAt: { lte: expect.any(Date) },
              status: { in: ["FAILED", "DEAD"] },
            },
            { lead: { privacyErasureRequestedAt: null } },
          ],
        },
      }),
    );
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "REQUEUE_BATCH",
        summary: expect.stringContaining("1 entrega"),
      }),
    });
  });

  it("does not create audit noise when a batch has no eligible deliveries", async () => {
    mocks.transactionClient.leadAutomationDelivery.findMany.mockResolvedValue([]);

    const result = await requeueAutomationBatch(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result).toMatchObject({
      ok: true,
      message: expect.stringContaining("No había entregas fallidas"),
    });
    expect(
      mocks.transactionClient.leadAutomationDelivery.updateMany,
    ).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
