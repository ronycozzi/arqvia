// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logServerError: vi.fn(),
  rateLimit: vi.fn(),
  releaseRateLimitReservation: vi.fn(),
  removeStoredLeadAttachments: vi.fn(),
  revalidateLeadSurfaces: vi.fn(),
  storeLeadAttachmentFiles: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));

vi.mock("@/lib/lead-attachments", () => ({
  removeStoredLeadAttachments: mocks.removeStoredLeadAttachments,
  storeLeadAttachmentFiles: mocks.storeLeadAttachmentFiles,
}));

vi.mock("@/lib/lead-automation-config", () => ({
  readLeadAutomationConfig: () => ({ captureEnabled: false }),
}));

vi.mock("@/lib/logger", () => ({
  logServerError: mocks.logServerError,
}));

vi.mock("@/lib/rate-limit", () => ({
  buildRateLimitKey: (scope: string, value: string) => `${scope}:${value}`,
  getClientIp: () => "203.0.113.10",
  rateLimit: mocks.rateLimit,
  releaseRateLimitReservation: mocks.releaseRateLimitReservation,
}));

vi.mock("@/lib/revalidation", () => ({
  revalidateLeadSurfaces: mocks.revalidateLeadSurfaces,
}));

import { POST } from "@/app/api/leads/route";

const validLead = {
  city: "Cordoba Capital",
  email: "cliente@example.com",
  hasPlans: false,
  message: "Quiero remodelar una cocina y necesito orientacion inicial.",
  name: "Cliente Arqvia",
  needsVisit: false,
  phone: "+54 351 555 1212",
  projectType: "Remodelacion",
  sourcePage: "/contacto",
};

const acceptedReservationKeys = [
  "lead:ip:203.0.113.10",
  "lead:email:cliente@example.com",
  "lead:phone:543515551212",
];

function leadRequest(body: object) {
  return new Request("https://arqvia.test/api/leads", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      host: "arqvia.test",
      origin: "https://arqvia.test",
    },
    method: "POST",
  });
}

function expectAllAcceptedReservationsReleased() {
  expect(mocks.releaseRateLimitReservation.mock.calls.map(([key]) => key)).toEqual(
    acceptedReservationKeys,
  );
}

describe("POST /api/leads rate-limit compensation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 2,
      resetAt: Date.now() + 60_000,
    });
    mocks.releaseRateLimitReservation.mockResolvedValue(undefined);
    mocks.removeStoredLeadAttachments.mockResolvedValue(undefined);
    mocks.storeLeadAttachmentFiles.mockResolvedValue({
      attachments: [],
      ok: true,
    });
    mocks.transaction.mockResolvedValue({
      deduped: false,
      estimate: null,
      leadId: "lead-1",
    });
  });

  it("releases accepted reservations when attachment storage fails operationally", async () => {
    mocks.storeLeadAttachmentFiles.mockResolvedValue({
      message: "No pudimos guardar los archivos.",
      ok: false,
      status: 503,
    });

    const response = await POST(leadRequest(validLead));

    expect(response.status).toBe(503);
    expectAllAcceptedReservationsReleased();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("keeps reservations for attachment validation errors", async () => {
    mocks.storeLeadAttachmentFiles.mockResolvedValue({
      message: "Formato no permitido.",
      ok: false,
      status: 400,
    });

    const response = await POST(leadRequest(validLead));

    expect(response.status).toBe(400);
    expect(mocks.releaseRateLimitReservation).not.toHaveBeenCalled();
  });

  it("rejects stale estimator values before storing files and keeps abuse reservations", async () => {
    mocks.transaction.mockImplementation(
      (callback: (tx: object) => Promise<unknown>) =>
        callback({
          estimateConfig: {
            findUnique: vi.fn().mockResolvedValue({ enabled: true, version: 2 }),
          },
          estimateRule: {
            findUnique: vi.fn().mockResolvedValue({ active: true }),
          },
        }),
    );

    const response = await POST(
      leadRequest({
        ...validLead,
        estimateAreaM2: 80,
        estimateConfigVersion: 1,
        estimateRuleId: "rule-remodelacion",
        estimateTier: "BALANCED",
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.releaseRateLimitReservation).not.toHaveBeenCalled();
    expect(mocks.storeLeadAttachmentFiles).not.toHaveBeenCalled();
    expect(mocks.removeStoredLeadAttachments).not.toHaveBeenCalled();
  });

  it("releases accepted reservations after a terminal persistence failure", async () => {
    const persistenceError = new Error("database unavailable");
    const releaseError = new Error("rate-limit store unavailable");
    mocks.transaction.mockRejectedValue(persistenceError);
    mocks.releaseRateLimitReservation
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(releaseError)
      .mockResolvedValueOnce(undefined);

    const response = await POST(leadRequest(validLead));

    expect(response.status).toBe(503);
    expectAllAcceptedReservationsReleased();
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "lead.persist_failed",
      persistenceError,
      { attempt: 1 },
    );
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "lead.rate_limit_release_failed",
      releaseError,
      {
        compensationReason: "persistence_failed",
        failedReservationIndex: 1,
        reservationCount: 3,
      },
    );
  });

  it("releases accepted reservations when persistence returns no result", async () => {
    mocks.transaction.mockResolvedValue(null);

    const response = await POST(leadRequest(validLead));

    expect(response.status).toBe(503);
    expectAllAcceptedReservationsReleased();
    expect(mocks.removeStoredLeadAttachments).toHaveBeenCalledWith([]);
  });

  it("does not release reservations for rejected validation or abuse", async () => {
    const invalidResponse = await POST(
      leadRequest({ ...validLead, message: "hola" }),
    );
    expect(invalidResponse.status).toBe(400);
    expect(mocks.releaseRateLimitReservation).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mocks.rateLimit
      .mockResolvedValueOnce({
        allowed: true,
        remaining: 7,
        resetAt: Date.now() + 60_000,
      })
      .mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60_000,
      });

    const blockedResponse = await POST(leadRequest(validLead));
    expect(blockedResponse.status).toBe(429);
    expect(mocks.releaseRateLimitReservation).not.toHaveBeenCalled();
  });

  it("does not release reservations after successful persistence", async () => {
    const response = await POST(leadRequest(validLead));

    expect(response.status).toBe(201);
    expect(mocks.releaseRateLimitReservation).not.toHaveBeenCalled();
    expect(mocks.revalidateLeadSurfaces).toHaveBeenCalledWith("lead-1");
  });
});
