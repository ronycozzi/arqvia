"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { adminUserFormSchema } from "@/lib/validations";

export type AdminUserActionState = {
  ok: boolean;
  message: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    email: string;
    id: string;
    title: string;
    updatedAt?: string;
  };
};

class UserVersionConflictError extends Error {}
class LastActiveAdminError extends Error {}

const initialUserState: AdminUserActionState = {
  ok: false,
  message: "",
};

async function assertCanManageUsers() {
  return getVerifiedAdminSession(adminOnlyRoles);
}

async function runSerializableUserTransaction<T>(
  mutation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(mutation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3;
      if (!canRetry) throw error;
    }
  }

  throw new Error("User transaction retry limit reached");
}

async function assertActiveAdminWillRemain(
  tx: Prisma.TransactionClient,
  currentUser: { active: boolean; role: UserRole },
  nextUser: { active: boolean; role: UserRole },
) {
  const removesActiveAdmin =
    currentUser.active &&
    currentUser.role === UserRole.ADMIN &&
    (!nextUser.active || nextUser.role !== UserRole.ADMIN);

  if (!removesActiveAdmin) return;

  const activeAdminCount = await tx.user.count({
    where: { active: true, role: UserRole.ADMIN },
  });
  if (activeAdminCount <= 1) throw new LastActiveAdminError();
}

function revalidateUserSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/activity");
}

export async function saveAdminUser(
  _previousState: AdminUserActionState = initialUserState,
  formData: FormData,
): Promise<AdminUserActionState> {
  void _previousState;

  const session = await assertCanManageUsers();

  if (!session) {
    return {
      ok: false,
      message: "Solo un Admin puede gestionar usuarios.",
    };
  }

  const parsed = adminUserFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const email = input.email.trim().toLowerCase();
  const isUpdate = Boolean(input.id);
  const isSelf = input.id === session.user.id;

  if (isSelf && (!input.active || input.role !== "ADMIN")) {
    return {
      ok: false,
      message: "No podés quitarte el acceso Admin desde tu propia sesión.",
    };
  }

  const passwordHash = input.password ? await hash(input.password, 12) : undefined;

  let user;
  try {
    user = await runSerializableUserTransaction(async (tx) => {
      let savedUser;
      if (isUpdate) {
        const currentUser = await tx.user.findUnique({
          where: { id: input.id },
          select: { active: true, role: true },
        });
        if (!currentUser) throw new UserVersionConflictError();

        await assertActiveAdminWillRemain(tx, currentUser, {
          active: input.active,
          role: input.role as UserRole,
        });

        const updated = await tx.user.updateMany({
          where: {
            id: input.id,
            updatedAt: new Date(input.updatedAt || ""),
          },
          data: {
            active: input.active,
            email,
            name: input.name,
            role: input.role as UserRole,
            ...(!isSelf || passwordHash
              ? { sessionVersion: { increment: 1 } }
              : {}),
            ...(passwordHash ? { passwordHash } : {}),
          },
        });
        if (updated.count !== 1) throw new UserVersionConflictError();
        savedUser = await tx.user.findUnique({ where: { id: input.id } });
        if (!savedUser) throw new UserVersionConflictError();
        if (!isSelf || passwordHash) {
          await tx.session.deleteMany({ where: { userId: input.id } });
        }
      } else {
        savedUser = await tx.user.create({
          data: {
            name: input.name,
            email,
            role: input.role as UserRole,
            active: input.active,
            passwordHash,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "User",
          entityId: savedUser.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} el usuario ${savedUser.email}`,
          userId: session.user.id,
        },
      });

      return savedUser;
    });

  } catch (error) {
    if (error instanceof LastActiveAdminError) {
      return {
        ok: false,
        message: "Debe quedar al menos un Admin activo.",
      };
    }
    if (error instanceof UserVersionConflictError) {
      return {
        ok: false,
        message:
          "Este usuario cambió en otra sesión. Recargá la página antes de guardar.",
      };
    }
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un usuario con ese email."
        : "No se pudo guardar el usuario.";

    return {
      ok: false,
      message,
    };
  }

  revalidateUserSurfaces();

  return {
    ok: true,
    message: `Usuario ${isUpdate ? "actualizado" : "creado"} correctamente.`,
    resource: {
      email: user.email || email,
      id: user.id,
      title: user.name || input.name || email,
      updatedAt: user.updatedAt?.toISOString(),
    },
  };
}

export async function revokeAdminUserAccess(formData: FormData) {
  const session = await assertCanManageUsers();
  const id = String(formData.get("id") || "");

  if (!session || !id) {
    return redirect("/admin/users", RedirectType.replace);
  }

  if (id === session.user.id) {
    return redirect("/admin/users?error=self-delete", RedirectType.replace);
  }

  let user;
  try {
    user = await runSerializableUserTransaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id },
        select: { active: true, email: true, id: true, role: true },
      });
      if (!existingUser) throw new Error("User not found");

      await assertActiveAdminWillRemain(tx, existingUser, {
        active: false,
        role: existingUser.role,
      });

      const revokedUser = await tx.user.update({
        where: { id },
        data: {
          active: false,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.session.deleteMany({ where: { userId: id } });

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "User",
          entityId: revokedUser.id,
          summary: `Revocó el acceso de ${existingUser.email}`,
          userId: session.user.id,
        },
      });

      return revokedUser;
    });
  } catch (error) {
    if (error instanceof LastActiveAdminError) {
      return redirect("/admin/users?error=last-admin", RedirectType.replace);
    }
    logServerError("admin.user.revoke_failed", error, {
      revokedUserId: id,
      userId: session.user.id,
    });
  }

  if (!user) {
    return redirect("/admin/users?error=delete-failed", RedirectType.replace);
  }

  revalidateUserSurfaces();
  redirect("/admin/users", RedirectType.replace);
}

export async function revokeAdminUserSessions(formData: FormData) {
  const session = await assertCanManageUsers();
  const id = String(formData.get("id") || "");

  if (!session || !id) redirect("/admin/users", RedirectType.replace);

  if (id === session.user.id) {
    redirect(`/admin/users/${id}?sessions=self`, RedirectType.replace);
  }

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id },
        select: { email: true, id: true },
      });
      if (!existingUser) throw new Error("User not found");

      const updatedUser = await tx.user.update({
        where: { id },
        data: { sessionVersion: { increment: 1 } },
      });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "User",
          entityId: updatedUser.id,
          summary: `Cerró todas las sesiones de ${existingUser.email}`,
          userId: session.user.id,
        },
      });

      return updatedUser;
    });
  } catch (error) {
    logServerError("admin.user.sessions_revoke_failed", error, {
      revokedUserId: id,
      userId: session.user.id,
    });
  }

  revalidateUserSurfaces();
  redirect(
    `/admin/users/${id}?sessions=${user ? "revoked" : "failed"}`,
    RedirectType.replace,
  );
}
