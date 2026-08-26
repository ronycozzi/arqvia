// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  erase: vi.fn(),
  findMany: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: { lead: { findMany: mocks.findMany } },
}));
vi.mock("@/lib/lead-privacy", () => ({ eraseLeadData: mocks.erase }));
vi.mock("@/lib/logger", () => ({ logServerError: mocks.logError }));

import {
  leadRetentionAudit,
  processLeadRetentionBatch,
  readLeadRetentionConfig,
} from "@/lib/lead-retention";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("lead retention", () => {
  it("remains disabled unless the policy and a strong cron secret are set", () => {
    expect(readLeadRetentionConfig({})).toMatchObject({
      days: 730,
      enabled: false,
      ready: false,
    });
    expect(
      readLeadRetentionConfig({
        DATA_RETENTION_CRON_SECRET: "short",
        LEAD_RETENTION_ENABLED: "true",
      }),
    ).toMatchObject({ enabled: true, ready: false });
  });

  it.each(["", " ", "-1", "89", "3651", "90.5", "invalid"])(
    "rejects an explicitly invalid retention period: %j",
    (days) => {
      const result = readLeadRetentionConfig({
        ARQVIA_RETENTION_APPROVED_AT: "2026-07-01T12:00:00.000Z",
        ARQVIA_RETENTION_APPROVED_BY: "Operaciones",
        DATA_RETENTION_CRON_SECRET: "r".repeat(32),
        LEAD_RETENTION_DAYS: days,
        LEAD_RETENTION_ENABLED: "true",
      });

      expect(result.ready).toBe(false);
      expect(result.days).toBe(730);
      expect(result.issues).toContain(
        "LEAD_RETENTION_DAYS debe ser un entero entre 90 y 3650.",
      );
    },
  );

  it("deletes only the bounded lost-lead candidates selected by the policy", async () => {
    vi.stubEnv("LEAD_RETENTION_ENABLED", "true");
    vi.stubEnv("LEAD_RETENTION_DAYS", "365");
    vi.stubEnv("LEAD_RETENTION_BATCH_SIZE", "2");
    vi.stubEnv("DATA_RETENTION_CRON_SECRET", "r".repeat(32));
    vi.stubEnv("ARQVIA_RETENTION_APPROVED_BY", "Operaciones");
    vi.stubEnv("ARQVIA_RETENTION_APPROVED_AT", "2026-07-01T12:00:00.000Z");
    mocks.findMany.mockResolvedValue([{ id: "lead-1" }, { id: "lead-2" }]);
    mocks.erase.mockResolvedValue(undefined);
    const now = new Date("2026-07-16T12:00:00.000Z");

    const result = await processLeadRetentionBatch(now);

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        lastActivityAt: { lt: new Date("2025-07-16T12:00:00.000Z") },
        status: "LOST",
      },
      orderBy: [{ lastActivityAt: "asc" }, { id: "asc" }],
      select: { id: true },
      take: 2,
    });
    expect(mocks.erase).toHaveBeenCalledTimes(2);
    expect(mocks.erase).toHaveBeenCalledWith({
      actorUserId: null,
      audit: leadRetentionAudit,
      eligibility: {
        lastActivityBefore: new Date("2025-07-16T12:00:00.000Z"),
        status: "LOST",
      },
      leadId: "lead-1",
    });
    expect(result).toEqual({
      configuration: "ready",
      deleted: 2,
      failed: 0,
      processed: 2,
    });
  });

  it("continues the batch after one isolated erasure failure", async () => {
    vi.stubEnv("LEAD_RETENTION_ENABLED", "true");
    vi.stubEnv("DATA_RETENTION_CRON_SECRET", "r".repeat(32));
    vi.stubEnv("ARQVIA_RETENTION_APPROVED_BY", "Operaciones");
    vi.stubEnv("ARQVIA_RETENTION_APPROVED_AT", "2026-07-01T12:00:00.000Z");
    mocks.findMany.mockResolvedValue([{ id: "lead-1" }, { id: "lead-2" }]);
    mocks.erase
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockResolvedValueOnce(undefined);

    await expect(processLeadRetentionBatch()).resolves.toMatchObject({
      deleted: 1,
      failed: 1,
      processed: 2,
    });
    expect(mocks.logError).toHaveBeenCalledOnce();
  });
});
