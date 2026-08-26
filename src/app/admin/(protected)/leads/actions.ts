"use server";

import { Prisma } from "@prisma/client";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { buildLeadCommercialActivities } from "@/lib/lead-commercial-profile";
import {
  LeadPrivacyLockedError,
  updateLeadUnlessPrivacyLocked,
} from "@/lib/lead-activity";
import { logServerError } from "@/lib/logger";
import { revalidateLeadSurfaces } from "@/lib/revalidation";
import { parseCordobaDateTime } from "@/lib/technical-visit-config";
import {
  leadCommercialProfileSchema,
} from "@/lib/validations";

export type LeadCommercialActionValues = {
  assignedUserId: string;
  lostReason: string;
  nextFollowUpAt: string;
  quotedAmountUsd: string;
  wonAmountUsd: string;
};

export type LeadCommercialActionState = {
  errors?: Partial<Record<string, string[]>>;
  message: string;
  ok: boolean;
  revision?: number;
  values?: LeadCommercialActionValues;
};

function getRawCommercialValues(
  input: Record<string, FormDataEntryValue>,
): LeadCommercialActionValues {
  const getString = (key: string) =>
    typeof input[key] === "string" ? input[key] : "";

  return {
    assignedUserId: getString("assignedUserId"),
    lostReason: getString("lostReason"),
    nextFollowUpAt: getString("nextFollowUpAt"),
    quotedAmountUsd: getString("quotedAmountUsd"),
    wonAmountUsd: getString("wonAmountUsd"),
  };
}

function getParsedCommercialValues(input: {
  assignedUserId?: string;
  lostReason?: string;
  nextFollowUpAt?: string;
  quotedAmountUsd?: number | null;
  wonAmountUsd?: number | null;
}): LeadCommercialActionValues {
  return {
    assignedUserId: input.assignedUserId || "",
    lostReason: input.lostReason || "",
    nextFollowUpAt: input.nextFollowUpAt || "",
    quotedAmountUsd: input.quotedAmountUsd?.toString() || "",
    wonAmountUsd: input.wonAmountUsd?.toString() || "",
  };
}

class CommercialLeadNotFoundError extends Error {}
class CommercialAssigneeNotFoundError extends Error {}
class CommercialProfileValidationError extends Error {}

export async function saveLeadCommercialProfile(
  _previousState: LeadCommercialActionState,
  formData: FormData,
): Promise<LeadCommercialActionState> {
  void _previousState;
  const revision = Date.now();
  const rawInput = Object.fromEntries(formData);
  const rawValues = getRawCommercialValues(rawInput);
  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session?.user) {
    return {
      ok: false,
      message: "Tu rol no puede editar el seguimiento comercial.",
      revision,
      values: rawValues,
    };
  }

  const parsed = leadCommercialProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los datos del seguimiento.",
      errors: parsed.error.flatten().fieldErrors,
      revision,
      values: rawValues,
    };
  }

  const input = parsed.data;
  const submittedValues = getParsedCommercialValues(input);
  const [followUpDate = "", followUpTime = ""] =
    input.nextFollowUpAt?.split("T") || [];
  const parsedFollowUp = input.nextFollowUpAt
    ? parseCordobaDateTime(followUpDate, followUpTime)
    : null;

  if (input.nextFollowUpAt && !parsedFollowUp) {
    return {
      ok: false,
      message: "La fecha de seguimiento no es válida.",
      errors: { nextFollowUpAt: ["Elegí una fecha y hora válidas"] },
      revision,
      values: submittedValues,
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const current = await tx.lead.findUnique({
          where: { id: input.leadId },
          select: {
            assignedUserId: true,
            id: true,
            lostReason: true,
            name: true,
            nextFollowUpAt: true,
            quotedAmountUsd: true,
            status: true,
            wonAmountUsd: true,
          },
        });
        if (!current) throw new CommercialLeadNotFoundError();

        const assignee = input.assignedUserId
          ? await tx.user.findFirst({
              where: { id: input.assignedUserId, active: true },
              select: { email: true, id: true, name: true },
            })
          : null;
        if (input.assignedUserId && !assignee) {
          throw new CommercialAssigneeNotFoundError();
        }

        if (current.status === "QUOTED" && !input.quotedAmountUsd) {
          throw new CommercialProfileValidationError(
            "Las consultas presupuestadas necesitan un monto en USD.",
          );
        }
        if (current.status === "WON" && !input.wonAmountUsd) {
          throw new CommercialProfileValidationError(
            "Las consultas ganadas necesitan un valor final en USD.",
          );
        }
        if (current.status === "LOST" && !input.lostReason) {
          throw new CommercialProfileValidationError(
            "Las consultas perdidas necesitan un motivo.",
          );
        }

        const isClosed = current.status === "WON" || current.status === "LOST";
        const next = {
          assignedUserId: assignee?.id || null,
          nextFollowUpAt: isClosed ? null : parsedFollowUp,
          quotedAmountUsd: input.quotedAmountUsd ?? null,
          wonAmountUsd: input.wonAmountUsd ?? null,
          lostReason: input.lostReason || null,
        };
        const activities = buildLeadCommercialActivities({
          assignedUserLabel: assignee?.name || assignee?.email || null,
          current,
          next,
        });

        await updateLeadUnlessPrivacyLocked(tx, current.id, {
          ...next,
          lastActivityAt: new Date(),
        });

        if (activities.length) {
          await tx.leadActivity.createMany({
            data: activities.map((activity) => ({
              ...activity,
              leadId: current.id,
              userId: session.user.id,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            action: "UPDATE",
            entity: "Lead",
            entityId: current.id,
            summary: `Actualizó responsable, seguimiento y valores de ${current.name}.`,
            userId: session.user.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof CommercialLeadNotFoundError) {
      return {
        ok: false,
        message: "La consulta ya no existe.",
        revision,
        values: submittedValues,
      };
    }
    if (error instanceof CommercialAssigneeNotFoundError) {
      return {
        ok: false,
        message: "El responsable seleccionado no está disponible.",
        errors: { assignedUserId: ["Elegí un usuario activo"] },
        revision,
        values: submittedValues,
      };
    }
    if (error instanceof CommercialProfileValidationError) {
      return {
        ok: false,
        message: error.message,
        revision,
        values: submittedValues,
      };
    }
    if (error instanceof LeadPrivacyLockedError) {
      return {
        ok: false,
        message: "La consulta está bloqueada por una eliminación de privacidad.",
        revision,
        values: submittedValues,
      };
    }
    logServerError("admin.lead_commercial_profile_update_failed", error, {
      leadId: input.leadId,
      userId: session.user.id,
    });
    return {
      ok: false,
      message: "No pudimos guardar el seguimiento. Intentá nuevamente.",
      revision,
      values: submittedValues,
    };
  }

  revalidateLeadSurfaces(input.leadId);

  return {
    ok: true,
    message: "Seguimiento comercial actualizado.",
    revision,
    values: submittedValues,
  };
}
