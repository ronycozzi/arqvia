import { describe, expect, it, vi } from "vitest";
import {
  buildLeadExportFilename,
  buildLeadExportWhere,
  createLeadExportStream,
  type LeadExportRecord,
  parseLeadExportFilters,
  toCsvRow,
} from "./lead-export";

describe("lead export", () => {
  it("streams every lead across cursor pages beyond the former 1000-row cap", async () => {
    const leads = Array.from({ length: 1005 }, (_, index) =>
      makeExportLead(index),
    );
    const fetchPage = vi.fn(async ({ cursor, take }) => {
      const cursorIndex = cursor?.id
        ? leads.findIndex((lead) => lead.id === cursor.id)
        : -1;
      return leads.slice(cursorIndex + 1, cursorIndex + 1 + take);
    });
    const stream = createLeadExportStream({
      where: { status: "NEW" },
      batchSize: 137,
      fetchPage,
    });

    const csv = await new Response(stream).text();
    const lines = csv.trimEnd().split("\r\n");

    expect(lines).toHaveLength(1006);
    expect(lines[0]).toContain("Nombre");
    expect(csv).toContain('"Lead 0"');
    expect(csv).toContain('"Lead 1004"');
    expect(fetchPage).toHaveBeenCalledTimes(8);
    expect(fetchPage.mock.calls[1]?.[0]).toMatchObject({
      cursor: { id: "lead-0136" },
      skip: 1,
      take: 137,
    });
  });

  it("keeps filters and filenames tied to one export snapshot", () => {
    const snapshotAt = new Date("2026-07-15T15:00:00.000Z");
    const filters = parseLeadExportFilters(
      new URLSearchParams("dias=30&estado=WON&seguimiento=sin-notas&q=Cordoba"),
      snapshotAt,
    );

    expect(buildLeadExportFilename(filters)).toBe(
      "arqvia-leads-30d-won-sin-notas.csv",
    );
    expect(buildLeadExportWhere(filters)).toEqual({
      AND: [
        {
          createdAt: {
            gte: new Date("2026-06-15T15:00:00.000Z"),
            lte: snapshotAt,
          },
        },
        { status: "WON" },
        { notes: { none: {} } },
        {
          OR: [
            { name: { contains: "Cordoba" } },
            { email: { contains: "Cordoba" } },
            { phone: { contains: "Cordoba" } },
            { city: { contains: "Cordoba" } },
            { projectType: { contains: "Cordoba" } },
            { message: { contains: "Cordoba" } },
          ],
        },
      ],
    });
  });

  it("filters stale new leads by their latest real activity", () => {
    const snapshotAt = new Date("2026-07-15T15:00:00.000Z");
    const filters = parseLeadExportFilters(
      new URLSearchParams("seguimiento=sin-contactar"),
      snapshotAt,
    );

    expect(buildLeadExportWhere(filters)).toEqual({
      AND: [
        { createdAt: { lte: snapshotAt } },
        {
          lastActivityAt: {
            lte: new Date("2026-07-13T15:00:00.000Z"),
          },
          status: "NEW",
        },
      ],
    });
  });

  it("exports overdue and user-owned follow-up queues consistently", () => {
    const snapshotAt = new Date("2026-07-15T15:00:00.000Z");
    const overdueFilters = parseLeadExportFilters(
      new URLSearchParams("seguimiento=vencidos"),
      snapshotAt,
    );
    const ownedFilters = parseLeadExportFilters(
      new URLSearchParams("seguimiento=mios"),
      snapshotAt,
    );

    expect(buildLeadExportWhere(overdueFilters)).toEqual({
      AND: [
        { createdAt: { lte: snapshotAt } },
        {
          nextFollowUpAt: { lte: snapshotAt },
          status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
        },
      ],
    });
    expect(buildLeadExportWhere(ownedFilters, "admin-1")).toEqual({
      AND: [
        { createdAt: { lte: snapshotAt } },
        {
          assignedUserId: "admin-1",
          status: { in: ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"] },
        },
      ],
    });
  });

  it("streams only the captured ID snapshot in bounded batches", async () => {
    const leads = Array.from({ length: 5 }, (_, index) => makeExportLead(index));
    const byId = new Map(leads.map((lead) => [lead.id, lead]));
    const fetchPage = vi.fn(async ({ where }) => {
      const ids = (where.id as { in: string[] }).in;
      return ids.map((id) => byId.get(id)).filter(Boolean) as LeadExportRecord[];
    });
    const snapshotIds = leads.map((lead) => lead.id);

    const csv = await new Response(
      createLeadExportStream({
        batchSize: 2,
        fetchPage,
        snapshotIds,
        where: { status: "NEW" },
      }),
    ).text();

    expect(csv.trimEnd().split("\r\n")).toHaveLength(6);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls[0]?.[0].where).toEqual({
      id: { in: ["lead-0000", "lead-0001"] },
    });
    expect(fetchPage.mock.calls[2]?.[0].where).toEqual({
      id: { in: ["lead-0004"] },
    });
  });

  it("neutralizes spreadsheet formulas in CSV cells", () => {
    expect(toCsvRow(["=1+1", " +SUM(A1:A2)", "normal"])).toBe(
      '"\'=1+1","\' +SUM(A1:A2)","normal"',
    );
  });
});

function makeExportLead(index: number): LeadExportRecord {
  return {
    id: `lead-${String(index).padStart(4, "0")}`,
    name: `Lead ${index}`,
    email: `lead-${index}@example.com`,
    phone: "+543515550000",
    city: "Cordoba",
    clientType: "Particular",
    projectType: "Construccion llave en mano",
    currentStatus: "Tengo planos",
    areaM2: "180",
    budgetRange: "Mas de USD 80.000",
    startDate: "Proximo mes",
    needsVisit: true,
    hasPlans: true,
    referenceLinks: "https://example.com/referencia",
    status: "NEW",
    assignedUserId: null,
    nextFollowUpAt: null,
    quotedAmountUsd: null,
    wonAmountUsd: null,
    lostReason: null,
    sourcePage: "/contacto",
    message: "Consulta detallada ".repeat(10),
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
    lastActivityAt: new Date(Date.UTC(2026, 0, 1, 1, index)),
    assignedUser: null,
    estimate: null,
    automationDeliveries: [],
    notes: [],
  };
}
