// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  process: vi.fn(),
  readConfig: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("@/lib/private-object-deletion", () => ({
  processPrivateObjectDeletionBatch: mocks.process,
}));
vi.mock("@/lib/private-object-deletion-config", () => ({
  readPrivateObjectDeletionConfig: mocks.readConfig,
}));
vi.mock("@/lib/lead-automation-config", () => ({
  verifyAutomationBearerToken: mocks.verifyToken,
}));

import { POST } from "@/app/api/cron/private-object-deletions/route";

function request(token = "worker-secret") {
  return new Request("https://arqvia.test/api/cron/private-object-deletions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("private object deletion cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readConfig.mockReturnValue({
      cronSecret: "worker-secret",
      ready: true,
    });
    mocks.verifyToken.mockReturnValue(true);
    mocks.process.mockResolvedValue({ deleted: 2, failed: 0, processed: 2 });
  });

  it("rejects an invalid bearer token without touching the queue", async () => {
    mocks.verifyToken.mockReturnValue(false);

    const response = await POST(request("wrong"));

    expect(response.status).toBe(401);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("processes a bounded batch with no-store responses", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      deleted: 2,
      failed: 0,
      ok: true,
      processed: 2,
    });
  });
});
