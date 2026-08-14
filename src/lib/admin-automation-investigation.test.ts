import { describe, expect, it } from "vitest";
import {
  buildAdminAutomationSearchParams,
  buildAdminAutomationWhere,
  buildManualAutomationBatchWhere,
  getAutomationErrorPresentation,
  hasInvalidAutomationDateRange,
  parseAdminAutomationFilters,
} from "./admin-automation-investigation";

describe("admin automation investigation", () => {
  it("parses supported operational filters", () => {
    const filters = parseAdminAutomationFilters(
      new URLSearchParams(
        "entrega=delivery_1&q=HTTP_503&estado=FAILED&evento=LEAD_CREATED&resultado=HTTP_5XX&recuperacion=READY&desde=2026-07-01&hasta=2026-07-16",
      ),
    );

    expect(filters).toEqual({
      deliveryId: "delivery_1",
      event: "LEAD_CREATED",
      fromDate: "2026-07-01",
      query: "HTTP_503",
      recovery: "READY",
      result: "HTTP_5XX",
      status: "FAILED",
      toDate: "2026-07-16",
    });
    expect(buildAdminAutomationSearchParams(filters).toString()).toContain(
      "entrega=delivery_1",
    );
    expect(buildAdminAutomationWhere(filters).createdAt).toEqual({
      gte: new Date("2026-07-01T03:00:00.000Z"),
      lte: new Date("2026-07-17T02:59:59.999Z"),
    });
  });

  it("combines text, result and recovery constraints instead of overriding them", () => {
    const now = new Date("2026-07-16T12:00:00.000Z");
    const filters = parseAdminAutomationFilters(
      new URLSearchParams(
        "q=Córdoba&estado=FAILED&resultado=HTTP_5XX&recuperacion=READY",
      ),
    );
    const where = buildAdminAutomationWhere(filters, now);

    expect(where.status).toBe("FAILED");
    expect(where.AND).toEqual([
      {
        OR: expect.arrayContaining([
          { lead: { is: { city: { contains: "Córdoba" } } } },
        ]),
      },
      { responseStatus: { gte: 500 } },
      {
        nextAttemptAt: { lte: now },
        status: { in: ["FAILED", "DEAD"] },
      },
    ]);
  });

  it("rejects inverted ranges without throwing", () => {
    const filters = parseAdminAutomationFilters(
      new URLSearchParams("desde=2026-07-20&hasta=2026-07-01"),
    );

    expect(
      hasInvalidAutomationDateRange(filters.fromDate, filters.toDate),
    ).toBe(true);
    expect(buildAdminAutomationWhere(filters).AND).toContainEqual({
      id: { in: [] },
    });
  });

  it("shares the exact eligibility window used by manual batch recovery", () => {
    const now = new Date("2026-07-16T12:00:00.000Z");

    expect(buildManualAutomationBatchWhere(now)).toEqual({
      nextAttemptAt: { lte: now },
      status: { in: ["FAILED", "DEAD"] },
    });
  });

  it("turns technical codes into actionable recovery guidance", () => {
    expect(getAutomationErrorPresentation("HTTP_503", 503)).toMatchObject({
      requeueRecommended: true,
      title: "Falla del servicio receptor (HTTP 503)",
      tone: "warning",
    });
    expect(getAutomationErrorPresentation("INVALID_PAYLOAD", null)).toMatchObject({
      requeueRecommended: false,
      title: "La carga guardada no es válida",
      tone: "danger",
    });
    expect(getAutomationErrorPresentation(null, null)).toBeNull();
  });
});
