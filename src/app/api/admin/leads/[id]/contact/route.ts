import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/bounded-request";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import {
  LeadPrivacyLockedError,
  updateLeadUnlessPrivacyLocked,
} from "@/lib/lead-activity";
import { logServerError } from "@/lib/logger";
import { revalidateLeadSurfaces } from "@/lib/revalidation";
import { isJsonRequest, isSameOriginRequest } from "@/lib/request-security";
import { leadContactSchema } from "@/lib/validations";

class ContactLeadNotFoundError extends Error {}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session?.user) {
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
  const parsed = leadContactSchema.safeParse(payload.value);
  if (!parsed.success) {
    return NextResponse.json({ message: "Canal inválido" }, { status: 400 });
  }

  const { id } = await params;
  const channelLabel = parsed.data.channel === "WHATSAPP" ? "WhatsApp" : "email";

  try {
    await prisma.$transaction(
      async (tx) => {
        const lead = await tx.lead.findUnique({
          where: { id },
          select: { id: true, name: true },
        });
        if (!lead) throw new ContactLeadNotFoundError();

        const contactedAt = new Date();
        await updateLeadUnlessPrivacyLocked(tx, lead.id, {
          lastActivityAt: contactedAt,
        });
        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: "CONTACT_RECORDED",
            summary: `Registró un contacto por ${channelLabel}.`,
            metadataJson: JSON.stringify({ channel: parsed.data.channel }),
            userId: session.user.id,
          },
        });
        await tx.auditLog.create({
          data: {
            action: "CONTACT",
            entity: "Lead",
            entityId: lead.id,
            summary: `Contactó a ${lead.name} por ${channelLabel}.`,
            userId: session.user.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof ContactLeadNotFoundError) {
      return NextResponse.json(
        { message: "Consulta no encontrada" },
        { status: 404 },
      );
    }
    if (error instanceof LeadPrivacyLockedError) {
      return NextResponse.json(
        { message: "La consulta está bloqueada por una eliminación de privacidad." },
        { status: 409 },
      );
    }
    logServerError("admin.lead_contact_record_failed", error, {
      channel: parsed.data.channel,
      leadId: id,
      userId: session.user.id,
    });
    return NextResponse.json(
      { message: "No se pudo registrar el contacto." },
      { status: 503 },
    );
  }

  revalidateLeadSurfaces(id);
  return NextResponse.json({ ok: true });
}
