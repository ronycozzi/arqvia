// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: { create: vi.fn() },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    session: { deleteMany: vi.fn() },
  };

  return {
    revalidatePath: vi.fn(),
    safeParse: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  RedirectType: { replace: "replace" },
}));
vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hash") }));
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
  adminUserFormSchema: { safeParse: mocks.safeParse },
}));

import {
  revokeAdminUserAccess,
  revokeAdminUserSessions,
  saveAdminUser,
} from "@/app/admin/(protected)/users/actions";

const baseUser = {
  active: true,
  email: "  Editor@Arqvia.COM  ",
  name: "Editor",
  password: "",
  role: "EDITOR" as const,
};

describe("admin user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) =>
        callback(mocks.transactionClient),
    );
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("canonicalizes email before creating a user", async () => {
    mocks.safeParse.mockReturnValue({ success: true, data: baseUser });
    mocks.transactionClient.user.create.mockResolvedValue({
      email: "editor@arqvia.com",
      id: "user-1",
      name: "Editor",
    });

    const result = await saveAdminUser(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(mocks.transactionClient.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "editor@arqvia.com" }),
    });
    expect(result).toMatchObject({
      ok: true,
      resource: { email: "editor@arqvia.com" },
    });
  });

  it("canonicalizes email before updating a user", async () => {
    mocks.safeParse.mockReturnValue({
      success: true,
      data: { ...baseUser, id: "user-1" },
    });
    mocks.safeParse.mockReturnValue({
      success: true,
      data: {
        ...baseUser,
        id: "user-1",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
    });
    mocks.transactionClient.user.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.user.findUnique.mockResolvedValue({
      email: "editor@arqvia.com",
      id: "user-1",
      name: "Editor",
      updatedAt: new Date("2026-07-16T12:01:00.000Z"),
    });

    await saveAdminUser({ ok: false, message: "" }, new FormData());

    expect(mocks.transactionClient.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        updatedAt: new Date("2026-07-16T12:00:00.000Z"),
      },
      data: expect.objectContaining({ email: "editor@arqvia.com" }),
    });
    expect(mocks.transactionClient.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("rejects a stale edit after another admin revoked the user", async () => {
    mocks.safeParse.mockReturnValue({
      success: true,
      data: {
        ...baseUser,
        active: true,
        id: "user-1",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
    });
    mocks.transactionClient.user.updateMany.mockResolvedValue({ count: 0 });

    const result = await saveAdminUser(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result).toEqual({
      ok: false,
      message:
        "Este usuario cambió en otra sesión. Recargá la página antes de guardar.",
    });
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
  });

  it("revokes access and sessions without deleting the user", async () => {
    mocks.transactionClient.user.findUnique.mockResolvedValue({
      email: "editor@arqvia.com",
      id: "user-1",
    });
    mocks.transactionClient.user.update.mockResolvedValue({
      active: false,
      email: "editor@arqvia.com",
      id: "user-1",
    });
    mocks.transactionClient.session.deleteMany.mockResolvedValue({ count: 2 });
    const formData = new FormData();
    formData.set("id", "user-1");

    await revokeAdminUserAccess(formData);

    expect(mocks.transactionClient.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { active: false, sessionVersion: { increment: 1 } },
    });
    expect(mocks.transactionClient.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "User",
        entityId: "user-1",
        summary: "Revocó el acceso de editor@arqvia.com",
      }),
    });
  });

  it("closes active sessions without disabling the account", async () => {
    mocks.transactionClient.user.findUnique.mockResolvedValue({
      email: "editor@arqvia.com",
      id: "user-1",
    });
    mocks.transactionClient.user.update.mockResolvedValue({
      active: true,
      email: "editor@arqvia.com",
      id: "user-1",
    });
    mocks.transactionClient.session.deleteMany.mockResolvedValue({ count: 2 });
    const formData = new FormData();
    formData.set("id", "user-1");

    await revokeAdminUserSessions(formData);

    expect(mocks.transactionClient.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { sessionVersion: { increment: 1 } },
    });
    expect(mocks.transactionClient.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "User",
        entityId: "user-1",
        summary: "Cerró todas las sesiones de editor@arqvia.com",
      }),
    });
  });
});
