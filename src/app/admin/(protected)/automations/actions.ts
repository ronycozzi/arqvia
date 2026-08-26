"use server";

import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildManualAutomationBatchWhere,
  manualAutomationBatchSize,
} from "@/lib/admin-automation-investigation";
import { prisma } from "@/lib/db";

export type AutomationActionState = {
  message: string;
  ok: boolean;
  revision?: number;
};

const deliveryIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;

export async function requeueAutomationBatch(
  _previousState: AutomationActionState,
  _formData: FormData,
): Promise<AutomationActionState> {
  void _previousState;
  void _formData;

  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) {
    return {
      ok: false,
      message: "Solo un Admin puede reencolar automatizaciones.",
    };
  }

  let requeuedCount;
  try {
    requeuedCount = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const eligibleWhere = buildManualAutomationBatchWhere(now);
      const privacySafeWhere = {
        AND: [
          eligibleWhere,
          { lead: { privacyErasureRequestedAt: null } },
        ],
      };
      const candidates = await tx.leadAutomationDelivery.findMany({
        where: privacySafeWhere,
        orderBy: [
          { nextAttemptAt: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
        select: { id: true },
        take: manualAutomationBatchSize,
      });
      const candidateIds = candidates.map((candidate) => candidate.id);
      if (!candidateIds.length) return 0;

      const reset = await tx.leadAutomationDelivery.updateMany({
        where: {
          AND: [privacySafeWhere, { id: { in: candidateIds } }],
        },
        data: {
          attempts: 0,
          claimToken: null,
          lastErrorCode: null,
          nextAttemptAt: now,
          responseStatus: null,
          status: "PENDING",
        },
      });

      if (reset.count) {
        await tx.auditLog.create({
          data: {
            action: "REQUEUE_BATCH",
            entity: "LeadAutomationDelivery",
            summary: `Reencoló manualmente ${reset.count} ${
              reset.count === 1 ? "entrega" : "entregas"
            } de automatización para el cron protegido.`,
            userId: session.user.id,
          },
        });
      }

      return reset.count;
    });
  } catch {
    return {
      ok: false,
      message: "No se pudo reencolar el lote. Intentá nuevamente.",
    };
  }

  return {
    ok: true,
    message: requeuedCount
      ? `${requeuedCount} ${requeuedCount === 1 ? "entrega reencolada" : "entregas reencoladas"}. El cron protegido realizará el envío.`
      : "No había entregas fallidas listas para reencolar. El envío externo queda a cargo del cron protegido.",
    revision: Date.now(),
  };
}

export async function requeueAutomationDelivery(
  _previousState: AutomationActionState,
  formData: FormData,
): Promise<AutomationActionState> {
  void _previousState;

  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) {
    return {
      ok: false,
      message: "Solo un Admin puede reencolar entregas.",
    };
  }

  const deliveryId = String(formData.get("deliveryId") || "").trim();
  if (!deliveryIdPattern.test(deliveryId)) {
    return { ok: false, message: "La entrega indicada no es válida." };
  }

  let requeued;
  try {
    requeued = await prisma.$transaction(async (tx) => {
      const delivery = await tx.leadAutomationDelivery.findUnique({
        where: { id: deliveryId },
        select: {
          lastErrorCode: true,
          lead: {
            select: { name: true, privacyErasureRequestedAt: true },
          },
          status: true,
        },
      });
      if (
        !delivery ||
        delivery.lead.privacyErasureRequestedAt ||
        (delivery.status !== "FAILED" && delivery.status !== "DEAD")
      ) {
        return false;
      }

      const reset = await tx.leadAutomationDelivery.updateMany({
        where: {
          id: deliveryId,
          lead: { privacyErasureRequestedAt: null },
          status: delivery.status,
        },
        data: {
          attempts: 0,
          claimToken: null,
          lastErrorCode: null,
          nextAttemptAt: new Date(),
          responseStatus: null,
          status: "PENDING",
        },
      });
      if (reset.count !== 1) return false;

      await tx.auditLog.create({
        data: {
          action: "REQUEUE",
          entity: "LeadAutomationDelivery",
          entityId: deliveryId,
          summary: `Reencoló manualmente una entrega de ${delivery.lead.name}${
            delivery.lastErrorCode
              ? ` después del error ${delivery.lastErrorCode}`
              : ""
          } para el cron protegido.`,
          userId: session.user.id,
        },
      });
      return true;
    });
  } catch {
    return {
      ok: false,
      message: "No se pudo reencolar la entrega. Intentá nuevamente.",
    };
  }

  if (!requeued) {
    return {
      ok: false,
      message: "La entrega ya no está disponible para reencolar.",
    };
  }

  return {
    ok: true,
    message:
      "Entrega reencolada. El cron protegido realizará el envío externo.",
    revision: Date.now(),
  };
}
