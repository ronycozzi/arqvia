import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  clientConfigFindFirst: vi.fn(),
  leadFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: database.queryRaw,
    clientConfig: { findFirst: database.clientConfigFindFirst },
    lead: { findFirst: database.leadFindFirst },
    user: { findFirst: database.userFindFirst },
  },
}));

import { GET, READINESS_TIMEOUT_MS } from "@/app/api/ready/route";

describe("GET /api/ready", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.queryRaw.mockResolvedValue([{ connected: 1 }]);
    database.clientConfigFindFirst.mockResolvedValue({ id: "config" });
    database.leadFindFirst.mockResolvedValue(null);
    database.userFindFirst.mockResolvedValue({ id: "user" });
  });

  it("reports ready only after connectivity and essential table probes pass", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      checks: { database: "ok", essentialTables: "ok" },
    });
    expect(database.queryRaw).toHaveBeenCalledOnce();
    expect(database.clientConfigFindFirst).toHaveBeenCalledWith({
      select: { id: true },
    });
    expect(database.leadFindFirst).toHaveBeenCalledWith({
      select: { id: true },
    });
    expect(database.userFindFirst).toHaveBeenCalledWith({
      select: { id: true },
    });
  });

  it("allows a cold database to wake within the readiness budget", async () => {
    vi.useFakeTimers();
    database.queryRaw.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([{ connected: 1 }]), 3_000)),
    );

    try {
      const responsePromise = GET();
      await vi.advanceTimersByTimeAsync(3_000);
      const response = await responsePromise;

      expect(READINESS_TIMEOUT_MS).toBeGreaterThan(3_000);
      expect(response.status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 503 without probing tables when connectivity fails", async () => {
    database.queryRaw.mockRejectedValue(
      new Error("postgres://admin:secret@private-database/app"),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      status: "unavailable",
      checks: { database: "unavailable", essentialTables: "unavailable" },
    });
    expect(database.clientConfigFindFirst).not.toHaveBeenCalled();
    expect(JSON.stringify(payload)).not.toMatch(/admin|secret|private-database/);
  });

  it("returns 503 with connectivity intact when an essential table is missing", async () => {
    database.leadFindFirst.mockRejectedValue(
      new Error('relation "Lead" does not exist at postgres://secret'),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      status: "unavailable",
      checks: { database: "ok", essentialTables: "unavailable" },
    });
    expect(JSON.stringify(payload)).not.toMatch(/relation|lead|postgres|secret/i);
  });
});
