import { describe, expect, it } from "vitest";
import {
  buildAdminActivitySearchParams,
  buildAdminActivityScopedWhere,
  buildAdminActivityWhere,
  getAdminAuditResourceTarget,
  hasInvalidDateRange,
  parseAdminActivityFilters,
} from "./admin-activity-investigation";

describe("admin activity investigation", () => {
  it("parses actor and calendar filters and builds an Argentina date window", () => {
    const filters = parseAdminActivityFilters(
      new URLSearchParams(
        "q=delivery-1&entidad=LeadAutomationDelivery&accion=REQUEUE&actor=user_1&desde=2026-07-01&hasta=2026-07-16",
      ),
    );

    expect(filters).toEqual({
      action: "REQUEUE",
      actor: "user_1",
      entity: "LeadAutomationDelivery",
      fromDate: "2026-07-01",
      query: "delivery-1",
      toDate: "2026-07-16",
    });
    expect(buildAdminActivityWhere(filters)).toMatchObject({
      action: "REQUEUE",
      createdAt: {
        gte: new Date("2026-07-01T03:00:00.000Z"),
        lte: new Date("2026-07-17T02:59:59.999Z"),
      },
      entity: "LeadAutomationDelivery",
      userId: "user_1",
    });
    expect(buildAdminActivityWhere(filters).OR).toContainEqual({
      entityId: { contains: "delivery-1" },
    });
  });

  it("supports system activity and rejects malformed values", () => {
    expect(
      buildAdminActivityWhere(
        parseAdminActivityFilters(
          new URLSearchParams("actor=system&desde=2026-02-30"),
        ),
      ),
    ).toEqual({ userId: null });

    expect(
      parseAdminActivityFilters(
        new URLSearchParams("actor=not/valid&hasta=16-07-2026"),
      ),
    ).toMatchObject({ actor: null, fromDate: null, toDate: null });

    expect(
      parseAdminActivityFilters(
        new URLSearchParams({ q: `  ${"x".repeat(200)}  ` }),
      ).query,
    ).toHaveLength(160);
  });

  it("returns no rows for an inverted range and preserves filters in links", () => {
    const filters = parseAdminActivityFilters(
      new URLSearchParams("actor=system&desde=2026-07-16&hasta=2026-07-01"),
    );

    expect(hasInvalidDateRange(filters.fromDate, filters.toDate)).toBe(true);
    expect(buildAdminActivityWhere(filters)).toMatchObject({
      id: { in: [] },
    });
    expect(buildAdminActivitySearchParams(filters).toString()).toBe(
      "actor=system&desde=2026-07-16&hasta=2026-07-01",
    );
  });

  it("intersects breakdown scopes without replacing active filters", () => {
    const baseWhere = buildAdminActivityWhere(
      parseAdminActivityFilters(
        new URLSearchParams("entidad=Project&accion=CREATE"),
      ),
    );

    expect(
      buildAdminActivityScopedWhere(baseWhere, { action: "UPDATE" }),
    ).toEqual({
      AND: [
        { action: "CREATE", entity: "Project" },
        { action: "UPDATE" },
      ],
    });
  });

  it("derives safe contextual destinations and avoids deleted detail routes", () => {
    expect(
      getAdminAuditResourceTarget({
        action: "UPDATE",
        entity: "Project",
        entityId: "project-1",
      }),
    ).toEqual({ href: "/admin/projects/project-1", label: "Abrir proyecto" });
    expect(
      getAdminAuditResourceTarget({
        action: "REQUEUE",
        entity: "LeadAutomationDelivery",
        entityId: "delivery-1",
      }),
    ).toEqual({
      href: "/admin/automations?entrega=delivery-1",
      label: "Ver entrega",
    });
    expect(
      getAdminAuditResourceTarget({
        action: "DELETE",
        entity: "Project",
        entityId: "project-1",
      }),
    ).toEqual({ href: "/admin/projects", label: "Ver proyectos" });
    expect(
      getAdminAuditResourceTarget({
        action: "UPDATE",
        entity: "Project",
        entityId: "project-1/settings?danger=true",
      }),
    ).toEqual({ href: "/admin/projects", label: "Ver proyectos" });
  });
});
