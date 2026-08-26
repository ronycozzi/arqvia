import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  findUnique: vi.fn(),
  getSession: vi.fn(),
  leadActivityCreate: vi.fn(),
  leadUpdateMany: vi.fn(),
  logServerError: vi.fn(),
  revalidate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  commercialManagerRoles: ["ADMIN"],
  getVerifiedAdminSession: mocks.getSession,
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/logger", () => ({ logServerError: mocks.logServerError }));
vi.mock("@/lib/revalidation", () => ({
  revalidateLeadSurfaces: mocks.revalidate,
}));

import { PATCH } from "@/app/api/admin/leads/[id]/route";

const routeContext = { params: Promise.resolve({ id: "lead-1" }) };
const transactionClient = {
  auditLog: { create: mocks.auditCreate },
  lead: {
    findUnique: mocks.findUnique,
    updateMany: mocks.leadUpdateMany,
  },
  leadActivity: { create: mocks.leadActivityCreate },
};

function statusRequest(status: string, origin = "https://arqvia.test") {
  return new Request("https://arqvia.test/api/admin/leads/lead-1", {
    body: JSON.stringify({ status }),
    headers: {
      "content-type": "application/json",
      host: "arqvia.test",
      origin,
    },
    method: "PATCH",
  });
}

describe("admin lead status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });
    mocks.transaction.mockImplementation(
      (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
    mocks.findUnique.mockResolvedValue({
      id: "lead-1",
      lostReason: null,
      name: "Cliente",
      quotedAmountUsd: null,
      status: "CONTACTED",
      wonAmountUsd: null,
    });
    mocks.leadUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("treats an unchanged status as a no-op without activity side effects", async () => {
    const response = await PATCH(statusRequest("CONTACTED"), routeContext);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "lead-1",
      ok: true,
      status: "CONTACTED",
    });
    expect(mocks.leadUpdateMany).not.toHaveBeenCalled();
    expect(mocks.leadActivityCreate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("records and revalidates a real status transition", async () => {
    const response = await PATCH(statusRequest("QUALIFIED"), routeContext);

    expect(response.status).toBe(200);
    expect(mocks.leadUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "QUALIFIED" }),
        where: {
          id: "lead-1",
          privacyErasureRequestedAt: null,
        },
      }),
    );
    expect(mocks.leadActivityCreate).toHaveBeenCalledOnce();
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
    expect(mocks.revalidate).toHaveBeenCalledWith("lead-1");
  });

  it("preserves RBAC before starting a transaction", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await PATCH(statusRequest("QUALIFIED"), routeContext);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("preserves the same-origin guard before starting a transaction", async () => {
    const response = await PATCH(
      statusRequest("QUALIFIED", "https://evil.example"),
      routeContext,
    );

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
