// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    area: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  };

  return {
    areaSafeParse: vi.fn(),
    committed: false,
    revalidateAreaSurfaces: vi.fn(),
    syncContentRedirects: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  RedirectType: { replace: "replace" },
}));
vi.mock("@/lib/admin-auth", () => ({
  contentManagerRoles: ["ADMIN", "EDITOR"],
  getVerifiedAdminSession: vi.fn().mockResolvedValue({
    user: { id: "editor-1" },
  }),
}));
vi.mock("@/lib/content-redirects", () => ({
  buildContentPath: vi.fn(
    (_type: string, slug: string) => `/zonas/${slug}`,
  ),
  ContentPathConflictError: class ContentPathConflictError extends Error {},
  deleteContentRedirects: vi.fn(),
  syncContentRedirects: mocks.syncContentRedirects,
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/revalidation", () => ({
  revalidateAreaSurfaces: mocks.revalidateAreaSurfaces,
}));
vi.mock("@/lib/validations", () => ({
  areaFormSchema: { safeParse: mocks.areaSafeParse },
}));

import { saveArea } from "@/app/admin/(protected)/areas/actions";

const area = {
  active: true,
  description: "Descripción actualizada",
  id: "area-1",
  name: "Villa Allende",
  seoDescription: "Zona de cobertura actualizada",
  seoTitle: "Arquitectos en Villa Allende",
  slug: "villa-allende-norte",
};
const expectedUpdatedAt = "2026-07-16T12:00:00.000Z";
const savedUpdatedAt = new Date("2026-07-16T12:05:00.000Z");

describe("content redirect admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.committed = false;
    mocks.areaSafeParse.mockReturnValue({ success: true, data: area });
    mocks.transactionClient.area.findUnique.mockResolvedValue({
      slug: "villa-allende",
    });
    mocks.transactionClient.area.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.area.findUniqueOrThrow.mockResolvedValue({
      ...area,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.syncContentRedirects.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) => {
        const result = await callback(mocks.transactionClient);
        mocks.committed = true;
        return result;
      },
    );
    mocks.revalidateAreaSurfaces.mockImplementation(() => {
      expect(mocks.committed).toBe(true);
    });
  });

  it("reads the previous slug in the redirect transaction and revalidates after commit", async () => {
    const formData = new FormData();
    formData.set("expectedUpdatedAt", expectedUpdatedAt);
    const result = await saveArea({ ok: false, message: "" }, formData);

    expect(result).toMatchObject({
      ok: true,
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      resource: { id: area.id, slug: area.slug },
    });
    expect(mocks.transactionClient.area.findUnique).toHaveBeenCalledWith({
      where: { id: area.id },
      select: { slug: true },
    });
    expect(mocks.transactionClient.area.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: area.id,
          updatedAt: new Date(expectedUpdatedAt),
        },
      }),
    );
    expect(mocks.syncContentRedirects).toHaveBeenCalledWith(
      mocks.transactionClient,
      {
        currentPath: "/zonas/villa-allende-norte",
        previousPath: "/zonas/villa-allende",
        resourceId: area.id,
        resourceType: "AREA",
      },
    );
    expect(mocks.revalidateAreaSurfaces).toHaveBeenCalledWith([
      "villa-allende",
    ]);
  });
});
