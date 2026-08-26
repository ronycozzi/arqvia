import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/bounded-request";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { leadStatusLabels } from "@/lib/lead-utils";
import {
  LeadPrivacyLockedError,
  updateLeadUnlessPrivacyLocked,
} from "@/lib/lead-activity";
import { logServerError } from "@/lib/logger";
import { revalidateLeadSurfaces } from "@/lib/revalidation";
import { isJsonRequest, isSameOriginRequest } from "@/lib/request-security";
import { leadStatusSchema } from "@/lib/validations";

class LeadNotFoundError extends Error {}
class LeadTransitionRequirementError extends Error {}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }
  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { message: "La solicitud debe enviarse como JSON." },
      { status: 415 },
    );
  }

  const payload = await readBoundedJson(request);
  if (!payload.ok) {
    return NextResponse.json(
      {
        message:
          payload.status === 413
            ? "La solicitud es demasiado grande."
            : "La solicitud contiene JSON inválido.",
      },
      { status: payload.status },
    );
  }
  const parsed = leadStatusSchema.safeParse(payload.value);
  if (!parsed.success) {
    return NextResponse.json({ message: "Estado inválido" }, { status: 400 });
  }

  const { id } = await params;
  let changed: boolean | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      changed = await prisma.$transaction(
        async (tx) => {
          const currentLead = await tx.lead.findUnique({
            where: { id },
            select: {
              id: true,
              lostReason: true,
              name: true,
              quotedAmountUsd: true,
              status: true,
              wonAmountUsd: true,
            },
          });
          if (!currentLead) throw new LeadNotFoundError();
          if (currentLead.status === parsed.data.status) return false;

          if (parsed.data.status === "QUOTED" && !currentLead.quotedAmountUsd) {
            throw new LeadTransitionRequirementError(
              "Registrá el monto presupuestado en el detalle antes de cambiar este estado.",
            );
          }
          if (parsed.data.status === "WON" && !currentLead.wonAmountUsd) {
            throw new LeadTransitionRequirementError(
              "Registrá el valor ganado en el detalle antes de cerrar la consulta.",
            );
          }
          if (parsed.data.status === "LOST" && !currentLead.lostReason) {
            throw new LeadTransitionRequirementError(
              "Registrá el motivo de pérdida en el detalle antes de cerrar la consulta.",
            );
          }

          await updateLeadUnlessPrivacyLocked(tx, id, {
              lastActivityAt: new Date(),
              status: parsed.data.status,
              ...(parsed.data.status === "WON" || parsed.data.status === "LOST"
                ? { nextFollowUpAt: null }
                : {}),
              ...(parsed.data.status !== "WON" ? { wonAmountUsd: null } : {}),
              ...(parsed.data.status !== "LOST" ? { lostReason: null } : {}),
          });
          await tx.leadActivity.create({
            data: {
              leadId: id,
              type: "STATUS_CHANGED",
              summary: `Cambió el estado de ${leadStatusLabels[currentLead.status]} a ${leadStatusLabels[parsed.data.status]}.`,
              metadataJson: JSON.stringify({
                from: currentLead.status,
                to: parsed.data.status,
              }),
              userId: session.user.id,
            },
          });
          await tx.auditLog.create({
            data: {
              action: "UPDATE",
              entity: "Lead",
              entityId: id,
              summary: `Cambió el estado de ${currentLead.name}: ${currentLead.status} -> ${parsed.data.status}`,
              userId: session.user.id,
            },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      break;
    } catch (error) {
      if (error instanceof LeadNotFoundError) {
        return NextResponse.json(
          { message: "Consulta no encontrada" },
          { status: 404 },
        );
      }
      if (error instanceof LeadTransitionRequirementError) {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }
      if (error instanceof LeadPrivacyLockedError) {
        return NextResponse.json(
          { message: "La consulta está bloqueada por una eliminación de privacidad." },
          { status: 409 },
        );
      }

      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3;
      if (canRetry) continue;

      logServerError("admin.lead_status_update_failed", error, {
        leadId: id,
        userId: session.user.id,
      });
      return NextResponse.json(
        { message: "No se pudo actualizar el estado. Reintentá." },
        { status: 503 },
      );
    }
  }

  if (changed === null) {
    return NextResponse.json(
      { message: "No se pudo actualizar el estado. Reintentá." },
      { status: 503 },
    );
  }

  if (changed) revalidateLeadSurfaces(id);

  return NextResponse.json({ ok: true, id, status: parsed.data.status });
}
