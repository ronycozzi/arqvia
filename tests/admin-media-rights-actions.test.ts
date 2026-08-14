// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: { create: vi.fn() },
    mediaAsset: { update: vi.fn() },
  };

  return {
    revalidateMediaSurfaces: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("@/lib/admin-auth", () => ({
  contentManagerRoles: ["ADMIN", "EDITOR"],
  getVerifiedAdminSession: vi.fn().mockResolvedValue({
    user: {
      email: "ana@arqvia.com.ar",
      id: "editor-1",
      name: "Ana Editora",
    },
  }),
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/media-revalidation", () => ({
  revalidateMediaSurfaces: mocks.revalidateMediaSurfaces,
}));

import { saveMediaRights } from "@/app/admin/(protected)/media/actions";

function rightsForm(approved: boolean, note: string) {
  const formData = new FormData();
  formData.set("id", "media-1");
  formData.set("sourceUrl", "https://fotografo.example/casa-patio");
  formData.set("rightsNote", note);
  if (approved) formData.set("rightsApproved", "true");
  return formData;
}

describe("media rights admin action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transactionClient.mediaAsset.update.mockResolvedValue({
      id: "media-1",
      title: "Casa Patio",
    });
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) =>
        callback(mocks.transactionClient),
    );
  });

  it("stamps the verified admin identity and writes the audit entry", async () => {
    const result = await saveMediaRights(
      { message: "", ok: false },
      rightsForm(
        true,
        "Fotografía propia autorizada para la web institucional.",
      ),
    );

    expect(result).toMatchObject({ ok: true });
    expect(mocks.transactionClient.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: "media-1" },
      data: expect.objectContaining({
        rightsApprovedAt: expect.any(Date),
        rightsApprovedBy: "Ana Editora",
        rightsNote: "Fotografía propia autorizada para la web institucional.",
      }),
      select: { id: true, title: true },
    });
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "MediaAsset",
        entityId: "media-1",
        userId: "editor-1",
      }),
    });
    expect(mocks.revalidateMediaSurfaces).toHaveBeenCalledOnce();
  });

  it("rejects approval without enough evidence before opening a transaction", async () => {
    const result = await saveMediaRights(
      { message: "", ok: false },
      rightsForm(true, "Propia"),
    );

    expect(result.ok).toBe(false);
    expect(result.errors?.rightsNote).toBeDefined();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("clears approval identity and timestamp when approval is revoked", async () => {
    const result = await saveMediaRights(
      { message: "", ok: false },
      rightsForm(false, "Procedencia registrada, autorización todavía pendiente."),
    );

    expect(result).toMatchObject({ ok: true });
    expect(mocks.transactionClient.mediaAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rightsApprovedAt: null,
          rightsApprovedBy: null,
        }),
      }),
    );
  });
});
