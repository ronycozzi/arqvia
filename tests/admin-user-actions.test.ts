// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: { create: vi.fn() },
    user: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    session: { deleteMany: vi.fn() },
  };

  return {
    getSession: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    safeParse: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  RedirectType: { replace: "replace" },
}));
vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hash") }));
vi.mock("@/lib/admin-auth", () => ({
  adminOnlyRoles: ["ADMIN"],
  getVerifiedAdminSession: mocks.getSession,
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
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1" } });
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
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
  });

  it("preserves Admin-only RBAC before validating or mutating", async () => {
    mocks.getSession.mockResolvedValue(null);

    const result = await saveAdminUser(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: "Solo un Admin puede gestionar usuarios.",
    });
    expect(mocks.safeParse).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
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

  it.each([
    { active: false, role: "ADMIN" as const },
    { active: true, role: "EDITOR" as const },
  ])("protects the last active Admin from update: %o", async (change) => {
    mocks.safeParse.mockReturnValue({
      success: true,
      data: {
        ...baseUser,
        ...change,
        id: "admin-2",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
    });
    mocks.transactionClient.user.findUnique.mockResolvedValue({
      active: true,
      role: "ADMIN",
    });
    mocks.transactionClient.user.count.mockResolvedValue(1);

    const result = await saveAdminUser(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: "Debe quedar al menos un Admin activo.",
    });
    expect(mocks.transactionClient.user.updateMany).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
  });

  it("allows demotion when another active Admin remains", async () => {
    mocks.safeParse.mockReturnValue({
      success: true,
      data: {
        ...baseUser,
        active: true,
        id: "admin-2",
        role: "EDITOR",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
    });
    mocks.transactionClient.user.findUnique
      .mockResolvedValueOnce({ active: true, role: "ADMIN" })
      .mockResolvedValueOnce({
        active: true,
        email: "admin2@arqvia.com",
        id: "admin-2",
        name: "Admin dos",
        role: "EDITOR",
        updatedAt: new Date("2026-07-16T12:01:00.000Z"),
      });
    mocks.transactionClient.user.count.mockResolvedValue(2);
    mocks.transactionClient.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await saveAdminUser(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result.ok).toBe(true);
    expect(mocks.transactionClient.user.updateMany).toHaveBeenCalledOnce();
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalledOnce();
  });

  it("rejects self-disable before opening a transaction", async () => {
    mocks.safeParse.mockReturnValue({
      success: true,
      data: {
        ...baseUser,
        active: false,
        id: "admin-1",
        role: "ADMIN",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
    });

    const result = await saveAdminUser(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: "No podés quitarte el acceso Admin desde tu propia sesión.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("revokes access and sessions without deleting the user", async () => {
    mocks.transactionClient.user.findUnique.mockResolvedValue({
      active: true,
      email: "editor@arqvia.com",
      id: "user-1",
      role: "EDITOR",
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

  it("protects the last active Admin from access revocation", async () => {
    mocks.transactionClient.user.findUnique.mockResolvedValue({
      active: true,
      email: "admin2@arqvia.com",
      id: "admin-2",
      role: "ADMIN",
    });
    mocks.transactionClient.user.count.mockResolvedValue(1);
    const formData = new FormData();
    formData.set("id", "admin-2");

    await revokeAdminUserAccess(formData);

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/users?error=last-admin",
      "replace",
    );
    expect(mocks.transactionClient.user.update).not.toHaveBeenCalled();
    expect(mocks.transactionClient.session.deleteMany).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects self-revocation before opening a transaction", async () => {
    const formData = new FormData();
    formData.set("id", "admin-1");

    await revokeAdminUserAccess(formData);

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/users?error=self-delete",
      "replace",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("closes active sessions without disabling the account", async () => {
    mocks.transactionClient.user.findUnique.mockResolvedValue({
      active: true,
      email: "editor@arqvia.com",
      id: "user-1",
      role: "EDITOR",
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
