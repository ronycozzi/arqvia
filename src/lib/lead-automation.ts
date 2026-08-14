import "server-only";

import type { LeadAutomationEvent } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  createLeadWebhookSignature,
  getLeadAutomationRetryDelayMs,
  readLeadAutomationConfig,
} from "@/lib/lead-automation-config";
import {
  assertPublicWebhookDestination,
  UnsafeOutboundDestinationError,
} from "@/lib/outbound-network";

const processingLeaseMs = 10 * 60_000;

type DeliveryOutcome =
  | "configuration_error"
  | "delivered"
  | "failed"
  | "skipped";

export type LeadAutomationDispatchResult = {
  deliveryId: string;
  outcome: DeliveryOutcome;
  responseStatus?: number;
};

function eventName(event: LeadAutomationEvent) {
  return event === "LEAD_RECONSULTED" ? "lead.reconsulted" : "lead.created";
}

function safeErrorCode(error: unknown) {
  if (error instanceof UnsafeOutboundDestinationError) {
    return "UNSAFE_DESTINATION";
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "TIMEOUT";
  }
  return "NETWORK_ERROR";
}

async function loadDeliveryPayload(deliveryId: string) {
  const delivery = await prisma.leadAutomationDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      attempts: true,
      claimToken: true,
      createdAt: true,
      event: true,
      id: true,
      payloadJson: true,
    },
  });

  if (!delivery) return null;
  try {
    const snapshot = JSON.parse(delivery.payloadJson) as unknown;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return { delivery, payload: null };
    }
    return {
      delivery,
      payload: {
        ...snapshot,
        schemaVersion: 1,
        event: eventName(delivery.event),
        deliveryId: delivery.id,
        occurredAt: delivery.createdAt.toISOString(),
      },
    };
  } catch {
    return { delivery, payload: null };
  }
}

async function failDelivery(
  deliveryId: string,
  claimToken: string,
  attempts: number,
  errorCode: string,
  responseStatus?: number,
) {
  const config = readLeadAutomationConfig();
  const dead = attempts >= config.maxAttempts;
  const updated = await prisma.leadAutomationDelivery.updateMany({
    where: { id: deliveryId, claimToken, status: "PROCESSING" },
    data: {
      claimToken: null,
      status: dead ? "DEAD" : "FAILED",
      lastErrorCode: errorCode,
      responseStatus: responseStatus ?? null,
      nextAttemptAt: dead
        ? new Date()
        : new Date(Date.now() + getLeadAutomationRetryDelayMs(attempts)),
    },
  });
  return updated.count === 1;
}

export async function dispatchLeadAutomationDelivery(
  deliveryId: string,
): Promise<LeadAutomationDispatchResult> {
  const config = readLeadAutomationConfig();
  if (!config.dispatchReady) {
    return { deliveryId, outcome: "configuration_error" };
  }

  const now = new Date();
  const claimToken = randomUUID();
  const claimed = await prisma.leadAutomationDelivery.updateMany({
    where: {
      id: deliveryId,
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
      attempts: { lt: config.maxAttempts },
    },
    data: {
      attempts: { increment: 1 },
      claimToken,
      lastAttemptAt: now,
      lastErrorCode: null,
      responseStatus: null,
      status: "PROCESSING",
    },
  });
  if (claimed.count !== 1) return { deliveryId, outcome: "skipped" };

  const loaded = await loadDeliveryPayload(deliveryId);
  if (!loaded) return { deliveryId, outcome: "skipped" };
  if (loaded.delivery.claimToken !== claimToken) {
    return { deliveryId, outcome: "skipped" };
  }
  if (!loaded.payload) {
    const failed = await failDelivery(
      deliveryId,
      claimToken,
      loaded.delivery.attempts,
      "INVALID_PAYLOAD",
    );
    return { deliveryId, outcome: failed ? "failed" : "skipped" };
  }
  const body = JSON.stringify(loaded.payload);
  const timestamp = Math.floor(Date.now() / 1_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let response: Response | undefined;

  try {
    await assertPublicWebhookDestination(config.webhookUrl, {
      allowDevelopmentLocalhost: process.env.NODE_ENV !== "production",
    });
    response = await fetch(config.webhookUrl, {
      method: "POST",
      body,
      cache: "no-store",
      redirect: "manual",
      headers: {
        "content-type": "application/json",
        "user-agent": "Arqvia-Lead-Automation/1.0",
        "x-arqvia-delivery": deliveryId,
        "x-arqvia-event": eventName(loaded.delivery.event),
        "x-arqvia-signature": createLeadWebhookSignature(
          body,
          config.webhookSecret,
          timestamp,
        ),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const failed = await failDelivery(
        deliveryId,
        claimToken,
        loaded.delivery.attempts,
        `HTTP_${response.status}`,
        response.status,
      );
      return {
        deliveryId,
        outcome: failed ? "failed" : "skipped",
        responseStatus: response.status,
      };
    }

    const completed = await prisma.leadAutomationDelivery.updateMany({
      where: { id: deliveryId, claimToken, status: "PROCESSING" },
      data: {
        claimToken: null,
        deliveredAt: new Date(),
        lastErrorCode: null,
        responseStatus: response.status,
        status: "DELIVERED",
      },
    });
    if (completed.count !== 1) {
      return { deliveryId, outcome: "skipped" };
    }
    return {
      deliveryId,
      outcome: "delivered",
      responseStatus: response.status,
    };
  } catch (error) {
    const failed = await failDelivery(
      deliveryId,
      claimToken,
      loaded.delivery.attempts,
      safeErrorCode(error),
    );
    return { deliveryId, outcome: failed ? "failed" : "skipped" };
  } finally {
    clearTimeout(timeout);
    await response?.body?.cancel().catch(() => undefined);
  }
}

async function recoverExpiredProcessingLeases() {
  const expiredBefore = new Date(Date.now() - processingLeaseMs);
  const config = readLeadAutomationConfig();
  await prisma.leadAutomationDelivery.updateMany({
    where: {
      status: "PROCESSING",
      lastAttemptAt: { lt: expiredBefore },
      attempts: { gte: config.maxAttempts },
    },
    data: {
      claimToken: null,
      lastErrorCode: "LEASE_EXPIRED",
      nextAttemptAt: new Date(),
      status: "DEAD",
    },
  });
  await prisma.leadAutomationDelivery.updateMany({
    where: {
      status: "PROCESSING",
      lastAttemptAt: { lt: expiredBefore },
      attempts: { lt: config.maxAttempts },
    },
    data: {
      claimToken: null,
      lastErrorCode: "LEASE_EXPIRED",
      nextAttemptAt: new Date(),
      status: "FAILED",
    },
  });
}

export async function processLeadAutomationBatch(limit = 10) {
  await recoverExpiredProcessingLeases();
  const config = readLeadAutomationConfig();
  if (!config.dispatchReady) {
    return {
      configuration: config.dispatchEnabled ? "invalid" : "disabled",
      delivered: 0,
      failed: 0,
      processed: 0,
    };
  }

  const deliveries = await prisma.leadAutomationDelivery.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: config.maxAttempts },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: Math.min(5, Math.max(1, limit)),
    select: { id: true },
  });

  const results = await Promise.all(
    deliveries.map((delivery) =>
      dispatchLeadAutomationDelivery(delivery.id),
    ),
  );

  return {
    configuration: "ready",
    delivered: results.filter((result) => result.outcome === "delivered").length,
    failed: results.filter((result) => result.outcome === "failed").length,
    processed: results.filter((result) => result.outcome !== "skipped").length,
  };
}

export async function retryLeadAutomationDelivery(deliveryId: string) {
  const reset = await prisma.leadAutomationDelivery.updateMany({
    where: { id: deliveryId, status: { in: ["FAILED", "DEAD"] } },
    data: {
      attempts: 0,
      claimToken: null,
      lastErrorCode: null,
      nextAttemptAt: new Date(),
      responseStatus: null,
      status: "PENDING",
    },
  });
  return reset.count === 1;
}

export async function requeueFailedLeadAutomationBatch(limit = 25) {
  const deliveries = await prisma.leadAutomationDelivery.findMany({
    where: { status: { in: ["FAILED", "DEAD"] } },
    orderBy: { updatedAt: "asc" },
    take: Math.min(100, Math.max(1, limit)),
    select: { id: true },
  });
  if (!deliveries.length) return 0;
  const result = await prisma.leadAutomationDelivery.updateMany({
    where: { id: { in: deliveries.map((delivery) => delivery.id) } },
    data: {
      attempts: 0,
      claimToken: null,
      lastErrorCode: null,
      nextAttemptAt: new Date(),
      responseStatus: null,
      status: "PENDING",
    },
  });
  return result.count;
}
