import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  adminNavigationItems,
  canAccessAdminHref,
  canManageAdminHref,
  getAdminPermissionHint,
  getVisibleAdminNavigation,
} from "@/lib/admin-navigation";

describe("admin navigation", () => {
  it("keeps every module href unique", () => {
    const hrefs = adminNavigationItems.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("shows the complete panel only to Admin", () => {
    expect(getVisibleAdminNavigation("ADMIN")).toHaveLength(21);
    expect(getVisibleAdminNavigation("EDITOR").map((item) => item.href)).toEqual(
      getVisibleAdminNavigation("VIEWER").map((item) => item.href),
    );
    expect(getVisibleAdminNavigation("EDITOR")).toHaveLength(13);
    expect(canAccessAdminHref("/admin/system", "ADMIN")).toBe(true);
    expect(canAccessAdminHref("/admin/estimador", "ADMIN")).toBe(true);
    expect(
      getVisibleAdminNavigation("ADMIN").some(
        (item) => item.href === "/admin/estimador",
      ),
    ).toBe(false);
    expect(canAccessAdminHref("/admin/system", "EDITOR")).toBe(false);
    expect(canAccessAdminHref("/admin/legal/privacidad", "ADMIN")).toBe(true);
    expect(canAccessAdminHref("/admin/legal/privacidad", "EDITOR")).toBe(false);
    expect(canAccessAdminHref("/admin/home", "EDITOR")).toBe(true);
    expect(canManageAdminHref("/admin/home", "VIEWER")).toBe(false);
    expect(canAccessAdminHref("/admin/pages", "EDITOR")).toBe(true);
    expect(canAccessAdminHref("/admin/pages/nosotros", "VIEWER")).toBe(true);
    expect(canManageAdminHref("/admin/pages/proceso", "EDITOR")).toBe(true);
    expect(canManageAdminHref("/admin/pages/proceso", "VIEWER")).toBe(false);
    expect(canAccessAdminHref("/admin/users/new", "VIEWER")).toBe(false);
  });

  it("resolves module descendants without authorizing unknown admin paths", () => {
    expect(canAccessAdminHref("/admin/media", "VIEWER")).toBe(true);
    expect(canAccessAdminHref("/admin/projects/new", "VIEWER")).toBe(true);
    expect(canAccessAdminHref("/admin/unknown", "ADMIN")).toBe(false);
    expect(canAccessAdminHref("/contacto", "VIEWER")).toBe(true);
  });

  it("describes commercial permissions without promising edit access", () => {
    const leads = adminNavigationItems.find(
      (item) => item.href === "/admin/leads",
    );
    expect(leads).toBeDefined();
    expect(getAdminPermissionHint(leads!, "ADMIN")).toBe("Gestionar consultas");
    expect(getAdminPermissionHint(leads!, "EDITOR")).toBe("Lectura protegida");
    expect(getAdminPermissionHint(leads!, "VIEWER")).toBe("Lectura protegida");
  });

  it("keeps viewing and management permissions explicit for every module", () => {
    expect(adminNavigationItems.every((item) => item.roles.length > 0)).toBe(true);
    expect(canManageAdminHref("/admin/projects/new", "EDITOR")).toBe(true);
    expect(canManageAdminHref("/admin/projects/new", "VIEWER")).toBe(false);
    expect(canManageAdminHref("/admin/leads/lead-1", "EDITOR")).toBe(false);
    expect(canManageAdminHref("/admin/leads/lead-1", "ADMIN")).toBe(true);
    expect(canManageAdminHref("/admin/settings", "ADMIN")).toBe(true);
    expect(canManageAdminHref("/admin/unknown", "ADMIN")).toBe(false);
  });

  it("catalogs every top-level protected admin route", () => {
    const protectedRoot = resolve(process.cwd(), "src/app/admin/(protected)");
    const routeHrefs = readdirSync(protectedRoot, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(resolve(protectedRoot, entry.name, "page.tsx")),
      )
      .map((entry) => `/admin/${entry.name}`)
      .sort();
    const catalogHrefs = adminNavigationItems
      .filter((item) => item.href !== "/admin")
      .map((item) => item.href)
      .sort();

    expect(catalogHrefs).toEqual(routeHrefs);
  });
});
