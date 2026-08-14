// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_CONCURRENCY_CONFLICT_MESSAGE } from "@/lib/content-concurrency";

const mocks = vi.hoisted(() => {
  const tx = {
    auditLog: { create: vi.fn() },
    legalPage: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    revalidateLegalSurfaces: vi.fn(),
    session: {
      user: { id: "admin-1", role: "ADMIN" },
    } as { user: { id: string; role: string } } | null,
    transaction: vi.fn(),
    tx,
  };
});

vi.mock("@/lib/admin-auth", () => ({
  adminOnlyRoles: ["ADMIN"],
  getVerifiedAdminSession: vi.fn(() => Promise.resolve(mocks.session)),
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/revalidation", () => ({
  revalidateLegalSurfaces: mocks.revalidateLegalSurfaces,
}));

import { saveLegalPage } from "@/app/admin/(protected)/legal/actions";

const expectedUpdatedAt = "2026-07-20T12:00:00.000Z";
const savedUpdatedAt = new Date("2026-07-20T12:05:00.000Z");

function legalFormData(overrides: Record<string, string> = {}) {
  const values = {
    content:
      "Este documento explica el alcance y las condiciones del servicio institucional. ".repeat(
        3,
      ),
    expectedUpdatedAt,
    reviewedBy: "Asesoría legal",
    seoDescription:
      "Información legal de Arqvia sobre privacidad y tratamiento de datos personales.",
    seoTitle: "Política de privacidad | Arqvia",
    slug: "privacidad",
    status: "PUBLISHED",
    summary:
      "Información sobre el tratamiento de datos enviados por los canales de consulta.",
    title: "Política de privacidad",
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("admin legal actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = { user: { id: "admin-1", role: "ADMIN" } };
    mocks.tx.legalPage.findUnique.mockResolvedValue({
      id: "legal-1",
      slug: "privacidad",
    });
    mocks.tx.legalPage.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.legalPage.findUniqueOrThrow.mockResolvedValue({
      id: "legal-1",
      slug: "privacidad",
      status: "PUBLISHED",
      title: "Política de privacidad",
      updatedAt: savedUpdatedAt,
    });
    mocks.tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );
  });

  it("publishes a reviewed document with concurrency and audit controls", async () => {
    const result = await saveLegalPage(
      { message: "", ok: false },
      legalFormData(),
    );

    expect(result).toMatchObject({
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      ok: true,
      resource: { slug: "privacidad", status: "PUBLISHED" },
    });
    expect(mocks.tx.legalPage.updateMany).toHaveBeenCalledWith({
      where: {
        id: "legal-1",
        updatedAt: new Date(expectedUpdatedAt),
      },
      data: expect.objectContaining({
        reviewedAt: expect.any(Date),
        reviewedBy: "Asesoría legal",
        status: "PUBLISHED",
      }),
    });
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "LegalPage",
        entityId: "legal-1",
        userId: "admin-1",
      }),
    });
    expect(mocks.revalidateLegalSurfaces).toHaveBeenCalledWith("privacidad");
  });

  it("rejects stale writes before audit or revalidation", async () => {
    mocks.tx.legalPage.updateMany.mockResolvedValue({ count: 0 });

    const result = await saveLegalPage(
      { message: "", ok: false },
      legalFormData(),
    );

    expect(result).toEqual({
      expectedUpdatedAt,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      ok: false,
    });
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidateLegalSurfaces).not.toHaveBeenCalled();
  });

  it("denies writes when the session is not an active admin", async () => {
    mocks.session = null;

    const result = await saveLegalPage(
      { message: "", ok: false },
      legalFormData(),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/solo un administrador/i);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
