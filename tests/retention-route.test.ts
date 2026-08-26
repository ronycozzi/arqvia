// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  process: vi.fn(),
  readConfig: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("@/lib/lead-retention", () => ({
  processLeadRetentionBatch: mocks.process,
  readLeadRetentionConfig: mocks.readConfig,
}));
vi.mock("@/lib/lead-automation-config", () => ({
  verifyAutomationBearerToken: mocks.verifyToken,
}));

import { POST } from "@/app/api/cron/retention/route";

describe("retention cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readConfig.mockReturnValue({
      cronSecret: "r".repeat(32),
      ready: true,
    });
    mocks.verifyToken.mockReturnValue(true);
  });

  it("returns a retryable status when any erasure fails", async () => {
    mocks.process.mockResolvedValue({
      configuration: "ready",
      deleted: 1,
      failed: 1,
      processed: 2,
    });

    const response = await POST(
      new Request("https://arqvia.test/api/cron/retention", {
        headers: { authorization: "Bearer secret" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns success only when the batch completes without failures", async () => {
    mocks.process.mockResolvedValue({
      configuration: "ready",
      deleted: 2,
      failed: 0,
      processed: 2,
    });

    const response = await POST(
      new Request("https://arqvia.test/api/cron/retention", {
        headers: { authorization: "Bearer secret" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
