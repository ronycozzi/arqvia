import { describe, expect, it, vi } from "vitest";
import {
  type LeadCommercialReportingRecord,
  summarizeLeadCommercialReport,
} from "./lead-reporting";

describe("summarizeLeadCommercialReport", () => {
  it("evaluates every lead across cursor pages beyond the former 1000-row cap", async () => {
    const leads = Array.from({ length: 1005 }, (_, index) =>
      makeCommercialLead(index),
    );
    const fetchPage = vi.fn(async ({ cursor, take }) => {
      const cursorIndex = cursor?.id
        ? leads.findIndex((lead) => lead.id === cursor.id)
        : -1;
      return leads.slice(cursorIndex + 1, cursorIndex + 1 + take);
    });

    const summary = await summarizeLeadCommercialReport({
      where: { status: "NEW" },
      batchSize: 128,
      fetchPage,
    });

    expect(summary.evaluatedCount).toBe(1005);
    expect(summary.highPriorityCount).toBe(1005);
    expect(summary.averageScore).toBe(100);
    expect(summary.highPriorityLeads).toHaveLength(5);
    expect(summary.highPriorityLeads[0]?.lead.id).toBe("lead-1004");
    expect(summary.topReasons[0]?.value).toBe(1005);
    expect(fetchPage).toHaveBeenCalledTimes(8);
    expect(fetchPage.mock.calls[1]?.[0]).toMatchObject({
      cursor: { id: "lead-0127" },
      skip: 1,
      take: 128,
    });
  });

  it("returns an empty summary without inventing scores", async () => {
    const summary = await summarizeLeadCommercialReport({
      where: {},
      fetchPage: vi.fn().mockResolvedValue([]),
    });

    expect(summary).toMatchObject({
      averageScore: 0,
      evaluatedCount: 0,
      highPriorityCount: 0,
      highPriorityLeads: [],
      topReasons: [],
    });
  });
});

function makeCommercialLead(index: number): LeadCommercialReportingRecord {
  return {
    id: `lead-${String(index).padStart(4, "0")}`,
    name: `Lead ${index}`,
    areaM2: "180",
    budgetRange: "Mas de USD 80.000",
    city: "Cordoba",
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
    currentStatus: "Tengo planos",
    hasPlans: true,
    message: "Consulta detallada ".repeat(10),
    needsVisit: true,
    projectType: "Construccion llave en mano",
    referenceLinks: "https://example.com/referencia",
    startDate: "Proximo mes",
  };
}
