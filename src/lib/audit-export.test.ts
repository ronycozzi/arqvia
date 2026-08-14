import { describe, expect, it, vi } from "vitest";
import {
  buildAuditExportFilename,
  buildAuditLogWhere,
  createAuditExportStream,
  type AuditExportRecord,
  parseAuditLogFilters,
} from "./audit-export";

describe("audit export", () => {
  it("normalizes supported filters and ignores unknown values", () => {
    const filters = parseAuditLogFilters(
      new URLSearchParams(
        "accion=PRIVACY_ERASURE&entidad=PrivacyRequest&q=solicitud",
      ),
    );

    expect(filters).toEqual({
      action: "PRIVACY_ERASURE",
      entity: "PrivacyRequest",
      query: "solicitud",
    });
    expect(buildAuditLogWhere(filters)).toEqual({
      action: "PRIVACY_ERASURE",
      entity: "PrivacyRequest",
      OR: [
        { summary: { contains: "solicitud" } },
        { entity: { contains: "solicitud" } },
        { action: { contains: "solicitud" } },
        { user: { is: { name: { contains: "solicitud" } } } },
        { user: { is: { email: { contains: "solicitud" } } } },
      ],
    });
    expect(buildAuditExportFilename(filters)).toBe(
      "arqvia-actividad-privacyrequest-privacy_erasure.csv",
    );

    expect(
      parseAuditLogFilters(
        new URLSearchParams("accion=UNKNOWN&entidad=Unknown"),
      ),
    ).toEqual({ action: null, entity: null, query: null });
  });

  it("streams the captured snapshot in bounded batches", async () => {
    const logs = Array.from({ length: 5 }, (_, index) => makeAuditLog(index));
    const byId = new Map(logs.map((log) => [log.id, log]));
    const fetchPage = vi.fn(async ({ where }) => {
      const ids = (where.id as { in: string[] }).in;
      return ids.map((id) => byId.get(id)).filter(Boolean) as AuditExportRecord[];
    });

    const csv = await new Response(
      createAuditExportStream({
        batchSize: 2,
        fetchPage,
        snapshotIds: logs.map((log) => log.id),
      }),
    ).text();

    expect(csv.trimEnd().split("\r\n")).toHaveLength(6);
    expect(csv).toContain('"EXPORT_ACTIVITY"');
    expect(csv).toContain('"Actividad 4"');
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls[0]?.[0].where).toEqual({
      id: { in: ["audit-0000", "audit-0001"] },
    });
    expect(fetchPage.mock.calls[2]?.[0].where).toEqual({
      id: { in: ["audit-0004"] },
    });
  });

  it("neutralizes spreadsheet formulas in exported summaries", async () => {
    const log = makeAuditLog(0, "=WEBSERVICE(\"https://example.com\")");
    const stream = createAuditExportStream({
      fetchPage: async () => [log],
      snapshotIds: [log.id],
    });

    const csv = await new Response(stream).text();
    expect(csv).toContain("'=WEBSERVICE");
  });
});

function makeAuditLog(index: number, summary = `Actividad ${index}`): AuditExportRecord {
  return {
    action: "EXPORT_ACTIVITY",
    createdAt: new Date(Date.UTC(2026, 6, 16, 10, index)),
    entity: "AuditLog",
    entityId: null,
    id: `audit-${String(index).padStart(4, "0")}`,
    summary,
    user: {
      email: "admin@arqvia.local",
      name: "Admin Arqvia",
    },
  };
}
