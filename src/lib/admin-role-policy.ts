import type { UserRole } from "@prisma/client";

export type AdminRole = UserRole;

export const signedInAdminRoles: readonly AdminRole[] = [
  "ADMIN",
  "EDITOR",
  "VIEWER",
];
export const contentManagerRoles: readonly AdminRole[] = ["ADMIN", "EDITOR"];
export const commercialManagerRoles: readonly AdminRole[] = ["ADMIN"];
export const adminOnlyRoles: readonly AdminRole[] = ["ADMIN"];
