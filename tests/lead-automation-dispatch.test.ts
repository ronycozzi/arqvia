// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    leadAutomationDelivery: database,
  },
}));
vi.mock("@/lib/outbound-network", () => ({
  assertPublicWebhookDestination: vi.fn().mockResolvedValue(undefined),
  UnsafeOutboundDestinationError: class UnsafeOutboundDestinationError extends Error {},
}));

import {
  dispatchLeadAutomationDelivery,
  processLeadAutomationBatch,
} from "@/lib/lead-automation";

const deliveryId = "delivery-test-1";
const createdAt = new Date("2026-07-14T12:00:00.000Z");

function enableAutomation() {
  vi.stubEnv("LEAD_AUTOMATION_ENABLED", "true");
  vi.stubEnv("LEAD_WEBHOOK_ALLOWED_HOSTS", "crm.example.com");
  vi.stubEnv("LEAD_WEBHOOK_URL", "https://crm.example.com/arqvia");
  vi.stubEnv("LEAD_WEBHOOK_SECRET", "w".repeat(32));
  vi.stubEnv("AUTOMATION_CRON_SECRET", "c".repeat(32));
  vi.stubEnv("LEAD_WEBHOOK_TIMEOUT_MS", "5000");
  vi.stubEnv("LEAD_AUTOMATION_MAX_ATTEMPTS", "5");
}

function arrangeClaimedDelivery(payloadJson: string) {
  database.updateMany.mockResolvedValue({ count: 1 });
  database.findUnique.mockImplementation(async () => ({
    attempts: 1,
    claimToken: database.updateMany.mock.calls[0][0].data.claimToken,
    createdAt,
    event: "LEAD_CREATED",
    id: deliveryId,
    payloadJson,
  }));
}

describe("lead automation dispatcher", () => {
  beforeEach(() => {
    enableAutomation();
    database.findUnique.mockReset();
    database.updateMany.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("delivers the immutable snapshot with protected envelope fields", async () => {
    arrangeClaimedDelivery(
      JSON.stringify({
        deliveryId: "forged-delivery",
        event: "forged.event",
        lead: { id: "lead-1", message: "Consulta original" },
        occurredAt: "2099-01-01T00:00:00.000Z",
        schemaVersion: 999,
      }),
    );
    const response = new Response("accepted", { status: 200 });
    const cancelBody = vi.spyOn(response.body!, "cancel");
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchLeadAutomationDelivery(deliveryId);

    expect(result).toEqual({
      deliveryId,
      outcome: "delivered",
      responseStatus: 200,
    });
    const [url, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));
    expect(url).toBe("https://crm.example.com/arqvia");
    expect(body).toMatchObject({
      deliveryId,
      event: "lead.created",
      occurredAt: createdAt.toISOString(),
      schemaVersion: 1,
      lead: { id: "lead-1", message: "Consulta original" },
    });
    expect(request.headers["x-arqvia-delivery"]).toBe(deliveryId);
    expect(request.headers["x-arqvia-event"]).toBe("lead.created");
    expect(request.headers["x-arqvia-signature"]).toMatch(
      /^t=\d+,v1=[a-f0-9]{64}$/,
    );
    expect(request.redirect).toBe("manual");
    expect(cancelBody).toHaveBeenCalledOnce();
    expect(database.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: deliveryId,
          status: "PROCESSING",
        }),
        data: expect.objectContaining({
          claimToken: null,
          responseStatus: 200,
          status: "DELIVERED",
        }),
      }),
    );
  });

  it("does not claim deliveries when capture is active but dispatch is paused", async () => {
    vi.stubEnv("LEAD_AUTOMATION_CAPTURE_ENABLED", "true");
    vi.stubEnv("LEAD_AUTOMATION_ENABLED", "false");

    const result = await dispatchLeadAutomationDelivery(deliveryId);

    expect(result).toEqual({ deliveryId, outcome: "configuration_error" });
    expect(database.findUnique).not.toHaveBeenCalled();
    expect(database.updateMany).not.toHaveBeenCalled();
  });

  it("reports a paused worker while capture continues", async () => {
    vi.stubEnv("LEAD_AUTOMATION_CAPTURE_ENABLED", "true");
    vi.stubEnv("LEAD_AUTOMATION_ENABLED", "false");
    database.updateMany.mockResolvedValue({ count: 0 });

    const result = await processLeadAutomationBatch();

    expect(result).toEqual({
      configuration: "disabled",
      delivered: 0,
      failed: 0,
      processed: 0,
    });
    expect(database.findUnique).not.toHaveBeenCalled();
  });

  it("records a sanitized retry after an HTTP failure", async () => {
    arrangeClaimedDelivery(JSON.stringify({ lead: { id: "lead-2" } }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );
    const before = Date.now();

    const result = await dispatchLeadAutomationDelivery(deliveryId);

    expect(result).toEqual({
      deliveryId,
      outcome: "failed",
      responseStatus: 503,
    });
    expect(database.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimToken: null,
          lastErrorCode: "HTTP_503",
          responseStatus: 503,
          status: "FAILED",
        }),
      }),
    );
    const retryAt = database.updateMany.mock.calls.at(-1)?.[0].data.nextAttemptAt;
    expect(retryAt).toBeInstanceOf(Date);
    expect(retryAt.getTime()).toBeGreaterThanOrEqual(before + 59_000);
  });

  it("does not finalize a delivery after losing its fenced claim", async () => {
    arrangeClaimedDelivery(JSON.stringify({ lead: { id: "lead-3" } }));
    database.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    );

    const result = await dispatchLeadAutomationDelivery(deliveryId);

    expect(result).toEqual({ deliveryId, outcome: "skipped" });
    const finalWhere = database.updateMany.mock.calls[1][0].where;
    expect(finalWhere).toMatchObject({
      id: deliveryId,
      status: "PROCESSING",
    });
    expect(finalWhere.claimToken).toEqual(expect.any(String));
  });
});
