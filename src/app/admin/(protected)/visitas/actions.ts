"use server";

import { Prisma } from "@prisma/client";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { revalidateLeadSurfaces } from "@/lib/revalidation";
import {
  parseCordobaDateTime,
  technicalVisitStatusLabels,
} from "@/lib/technical-visit-config";
import { technicalVisitAdminSchema } from "@/lib/validations";
import { buildTechnicalVisitScheduleUpdate } from "@/lib/technical-visit-update";

export type TechnicalVisitActionState = {
  ok: boolean;
  message: string;
  errors?: Partial<Record<string, string[]>>;
  revision?: number;
  scheduled?: boolean;
  visitId?: string;
};

class VisitScheduleConflictError extends Error {}

export async function saveTechnicalVisit(
  _previousState: TechnicalVisitActionState,
  formData: FormData,
): Promise<TechnicalVisitActionState> {
  void _previousState;
  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session) {
    return { ok: false, message: "Tu rol no puede coordinar visitas." };
  }

  const parsed = technicalVisitAdminSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los datos de la coordinación.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const requiresSchedule = ["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(
    input.status,
  );
  const scheduledAt = requiresSchedule
    ? parseCordobaDateTime(input.scheduledDate || "", input.scheduledTime)
    : null;
  if (requiresSchedule && !scheduledAt) {
    return {
      ok: false,
      message: "La fecha y hora indicadas no son válidas.",
      errors: { scheduledDate: ["Revisá la fecha y hora"] },
    };
  }

  const [lead, assignedUser] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { id: true, name: true },
    }),
    input.assignedUserId
      ? prisma.user.findFirst({
          where: {
            id: input.assignedUserId,
            active: true,
            role: { in: ["ADMIN", "EDITOR"] },
          },
          select: { id: true },
        })
      : null,
  ]);

  if (!lead) return { ok: false, message: "La consulta ya no existe." };
  if (input.assignedUserId && !assignedUser) {
    return {
      ok: false,
      message: "El responsable seleccionado no está disponible.",
      errors: { assignedUserId: ["Elegí un usuario activo"] },
    };
  }

  let savedVisit;
  try {
    savedVisit = await prisma.$transaction(async (tx) => {
      if (
        assignedUser?.id &&
        scheduledAt &&
        ["SCHEDULED", "CONFIRMED"].includes(input.status)
      ) {
        const scheduledEnd = new Date(
          scheduledAt.getTime() + input.durationMinutes * 60_000,
        );
        const possibleConflicts = await tx.technicalVisit.findMany({
          where: {
            assignedUserId: assignedUser.id,
            leadId: { not: lead.id },
            scheduledAt: {
              gte: new Date(scheduledAt.getTime() - 4 * 60 * 60_000),
              lt: scheduledEnd,
            },
            status: { in: ["SCHEDULED", "CONFIRMED"] },
          },
          select: { durationMinutes: true, scheduledAt: true },
        });
        const overlaps = possibleConflicts.some((visit) => {
          if (!visit.scheduledAt) return false;
          const visitEnd = new Date(
            visit.scheduledAt.getTime() + visit.durationMinutes * 60_000,
          );
          return visitEnd > scheduledAt;
        });
        if (overlaps) throw new VisitScheduleConflictError();
      }

      const visit = await tx.technicalVisit.upsert({
        where: { leadId: lead.id },
        create: {
          leadId: lead.id,
          status: input.status,
          preferredWindow: "FLEXIBLE",
          scheduledAt,
          durationMinutes: input.durationMinutes,
          address: input.address || null,
          internalNotes: input.internalNotes || null,
          assignedUserId: assignedUser?.id || null,
        },
        update: {
          status: input.status,
          address: input.address || null,
          internalNotes: input.internalNotes || null,
          ...buildTechnicalVisitScheduleUpdate({
            assignedUserId: assignedUser?.id || null,
            durationMinutes: input.durationMinutes,
            scheduledAt,
            status: input.status,
          }),
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { lastActivityAt: new Date(), needsVisit: true },
      });

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "TechnicalVisit",
          entityId: lead.id,
          summary: `Coordinó visita de ${lead.name}: ${technicalVisitStatusLabels[input.status]}`,
          userId: session.user.id,
        },
      });

      return visit;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  } catch (error) {
    if (error instanceof VisitScheduleConflictError) {
      return {
        ok: false,
        message:
          "El responsable ya tiene otra visita en ese horario. Elegí otro horario o responsable.",
        errors: {
          assignedUserId: ["Hay una visita superpuesta para este responsable"],
        },
      };
    }
    return {
      ok: false,
      message: "No pudimos guardar la coordinación. Intentá nuevamente.",
    };
  }

  revalidateLeadSurfaces(lead.id);

  return {
    ok: true,
    message: "Coordinación actualizada correctamente.",
    revision: Date.now(),
    scheduled: Boolean(savedVisit.scheduledAt),
    visitId: savedVisit.id,
  };
}
