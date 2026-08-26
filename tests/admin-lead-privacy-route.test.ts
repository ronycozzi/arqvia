// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eraseLeadForPrivacy: vi.fn(),
  getVerifiedAdminSession: vi.fn(),
  logServerError: vi.fn(),
  revalidateLeadSurfaces: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  adminOnlyRoles: ["ADMIN"],
  getVerifiedAdminSession: mocks.getVerifiedAdminSession,
}));

vi.mock("@/lib/lead-privacy", () => ({
  eraseLeadForPrivacy: mocks.eraseLeadForPrivacy,
  LeadPrivacyAutomationBusyError: class LeadPrivacyAutomationBusyError extends Error {},
  LeadPrivacyNotFoundError: class LeadPrivacyNotFoundError extends Error {},
}));

vi.mock("@/lib/logger", () => ({
  logServerError: mocks.logServerError,
}));

vi.mock("@/lib/revalidation", () => ({
  revalidateLeadSurfaces: mocks.revalidateLeadSurfaces,
}));

import { DELETE } from "@/app/api/admin/leads/[id]/privacy/route";

const context = { params: Promise.resolve({ id: "lead-1" }) };

function privacyRequest({
  confirmation = "ELIMINAR",
  origin = "https://arqvia.test",
}: {
  confirmation?: string;
  origin?: string;
} = {}) {
  return new Request("https://arqvia.test/api/admin/leads/lead-1/privacy", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Host: "arqvia.test",
      Origin: origin,
    },
    body: JSON.stringify({ confirmation }),
  });
}

describe("DELETE /api/admin/leads/[id]/privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedAdminSession.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });
    mocks.eraseLeadForPrivacy.mockResolvedValue({
      deletedObjects: 0,
      pendingObjectDeletions: 0,
      queuedObjectDeletions: 0,
    });
  });

  it("requires a verified ADMIN session", async () => {
    mocks.getVerifiedAdminSession.mockResolvedValue(null);

    const response = await DELETE(privacyRequest(), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "No autorizado" });
    expect(mocks.getVerifiedAdminSession).toHaveBeenCalledWith(["ADMIN"]);
    expect(mocks.eraseLeadForPrivacy).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request before invoking the erasure service", async () => {
    const response = await DELETE(
      privacyRequest({ origin: "https://malicious.test" }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks.eraseLeadForPrivacy).not.toHaveBeenCalled();
  });

  it("requires the explicit confirmation token", async () => {
    const response = await DELETE(
      privacyRequest({ confirmation: "BORRAR" }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mocks.eraseLeadForPrivacy).not.toHaveBeenCalled();
  });

  it("runs the erasure with the authenticated actor and revalidates afterward", async () => {
    const response = await DELETE(privacyRequest(), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      pendingObjectDeletions: 0,
    });
    expect(mocks.eraseLeadForPrivacy).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      leadId: "lead-1",
    });
    expect(mocks.revalidateLeadSurfaces).toHaveBeenCalledWith("lead-1");
  });

  it("returns accepted when physical object deletion remains queued", async () => {
    mocks.eraseLeadForPrivacy.mockResolvedValue({
      deletedObjects: 1,
      pendingObjectDeletions: 1,
      queuedObjectDeletions: 2,
    });

    const response = await DELETE(privacyRequest(), context);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      pendingObjectDeletions: 1,
    });
  });
});
