import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  findUnique: vi.fn(),
  getSession: vi.fn(),
  logServerError: vi.fn(),
  noteCreate: vi.fn(),
  revalidate: vi.fn(),
  touchLeadActivity: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  commercialManagerRoles: ["ADMIN"],
  getVerifiedAdminSession: mocks.getSession,
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/lead-activity", () => ({
  touchLeadActivity: mocks.touchLeadActivity,
}));
vi.mock("@/lib/logger", () => ({ logServerError: mocks.logServerError }));
vi.mock("@/lib/revalidation", () => ({
  revalidateLeadSurfaces: mocks.revalidate,
}));

import { POST } from "@/app/api/admin/leads/[id]/notes/route";

const routeContext = { params: Promise.resolve({ id: "lead-1" }) };
const transactionClient = {
  auditLog: { create: mocks.auditCreate },
  lead: { findUnique: mocks.findUnique },
  leadNote: { create: mocks.noteCreate },
};

function noteRequest(body: string) {
  return new Request("https://arqvia.test/api/admin/leads/lead-1/notes", {
    body,
    headers: {
      "content-type": "application/json",
      host: "arqvia.test",
      origin: "https://arqvia.test",
    },
    method: "POST",
  });
}

describe("admin lead note route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.transaction.mockImplementation(
      (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
    mocks.findUnique.mockResolvedValue({ id: "lead-1", name: "Cliente" });
    mocks.noteCreate.mockResolvedValue({ id: "note-1" });
  });

  it("returns 404 atomically when the lead no longer exists", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(
      noteRequest(JSON.stringify({ body: "Seguimiento administrativo" })),
      routeContext,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Consulta no encontrada",
    });
    expect(mocks.noteCreate).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("returns 503 and logs a controlled event on transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      noteRequest(JSON.stringify({ body: "Seguimiento administrativo" })),
      routeContext,
    );

    expect(response.status).toBe(503);
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "admin.lead_note_create_failed",
      expect.any(Error),
      { leadId: "lead-1", userId: "admin-1" },
    );
  });

  it("rejects oversized JSON before starting a transaction", async () => {
    const response = await POST(
      noteRequest(JSON.stringify({ body: "x".repeat(20_000) })),
      routeContext,
    );

    expect(response.status).toBe(413);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
