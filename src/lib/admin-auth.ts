import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  adminOnlyRoles,
  commercialManagerRoles,
  contentManagerRoles,
  signedInAdminRoles,
  type AdminRole,
} from "@/lib/admin-role-policy";
import { prisma } from "@/lib/db";

export {
  adminOnlyRoles,
  commercialManagerRoles,
  contentManagerRoles,
  signedInAdminRoles,
};
export type { AdminRole };

export type VerifiedAdminSession = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: AdminRole;
    leadNotificationsReadAt: Date | null;
  };
};

export function hasAdminRole(role: UserRole | string | null | undefined): role is AdminRole {
  return role === "ADMIN" || role === "EDITOR" || role === "VIEWER";
}

export function canManageContent(role: UserRole | string | null | undefined) {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageCommercial(role: UserRole | string | null | undefined) {
  return role === "ADMIN";
}

export function canViewLeadPII(role: UserRole | string | null | undefined) {
  return role === "ADMIN";
}

export function canContactLead(role: UserRole | string | null | undefined) {
  return canViewLeadPII(role);
}

export function canManageUsers(role: UserRole | string | null | undefined) {
  return role === "ADMIN";
}

export async function getVerifiedAdminSession(
  allowedRoles: readonly AdminRole[] = signedInAdminRoles,
): Promise<VerifiedAdminSession | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      active: true,
      sessionVersion: true,
      leadNotificationsReadAt: true,
    },
  });

  if (
    !user?.active ||
    !allowedRoles.includes(user.role) ||
    session.user.sessionVersion !== user.sessionVersion
  ) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      leadNotificationsReadAt: user.leadNotificationsReadAt,
    },
  };
}

export async function requireVerifiedAdminSession(
  allowedRoles: readonly AdminRole[] = signedInAdminRoles,
): Promise<VerifiedAdminSession> {
  const session = await getVerifiedAdminSession(allowedRoles);
  if (!session) redirect("/admin/login");

  return session;
}
