// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAdminReferenceOptions: vi.fn(),
  getVerifiedAdminSession: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getVerifiedAdminSession: mocks.getVerifiedAdminSession,
}));

vi.mock("@/lib/admin-reference-options", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/admin-reference-options")
  >();
  return {
    ...original,
    findAdminReferenceOptions: mocks.findAdminReferenceOptions,
  };
});

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
  rateLimit: mocks.rateLimit,
}));

import { GET } from "@/app/api/admin/references/route";

function referenceRequest(query = "type=services&q=obra") {
  return new Request(`https://arqvia.test/api/admin/references?${query}`);
}

describe("GET /api/admin/references", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedAdminSession.mockResolvedValue({
      user: { id: "viewer-1", role: "VIEWER" },
    });
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 89,
      resetAt: Date.now() + 60_000,
    });
    mocks.findAdminReferenceOptions.mockResolvedValue({
      hasMore: false,
      options: [{ id: "service-1", label: "Obra llave en mano" }],
    });
  });

  it("rejects anonymous access without querying content", async () => {
    mocks.getVerifiedAdminSession.mockResolvedValue(null);
    const response = await GET(referenceRequest());

    expect(response.status).toBe(403);
    expect(mocks.findAdminReferenceOptions).not.toHaveBeenCalled();
  });

  it("rejects unsupported relation types", async () => {
    const response = await GET(referenceRequest("type=users&q=admin"));

    expect(response.status).toBe(400);
    expect(mocks.findAdminReferenceOptions).not.toHaveBeenCalled();
  });

  it("rate limits authenticated searches", async () => {
    mocks.rateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 3_000,
    });
    const response = await GET(referenceRequest());

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(mocks.findAdminReferenceOptions).not.toHaveBeenCalled();
  });

  it("returns minimal options to every verified admin role", async () => {
    const response = await GET(
      referenceRequest("type=projects&q=casa&take=20&selectedId=project-2"),
    );

    expect(response.status).toBe(200);
    expect(mocks.findAdminReferenceOptions).toHaveBeenCalledWith({
      q: "casa",
      selectedId: "project-2",
      take: 20,
      type: "projects",
    });
    await expect(response.json()).resolves.toEqual({
      hasMore: false,
      options: [{ id: "service-1", label: "Obra llave en mano" }],
    });
  });
});
