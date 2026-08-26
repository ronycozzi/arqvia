import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  canViewLeadPII,
  commercialManagerRoles,
  getVerifiedAdminSession,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { LeadPrivacyLockedError, touchLeadActivity } from "@/lib/lead-activity";
import {
  readPrivateMediaObject,
} from "@/lib/media-storage";
import {
  dispatchPrivateObjectDeletion,
  enqueuePrivateObjectDeletion,
} from "@/lib/private-object-deletion";
import { isSameOriginRequest } from "@/lib/request-security";
import { revalidateLeadSurfaces } from "@/lib/revalidation";

type AttachmentRouteContext = {
  params: Promise<{ attachmentId: string; id: string }>;
};

export async function GET(_request: Request, { params }: AttachmentRouteContext) {
  const session = await getVerifiedAdminSession();
  if (!session || !canViewLeadPII(session.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { attachmentId, id: leadId } = await params;
  const attachment = await prisma.leadAttachment.findFirst({
    where: { id: attachmentId, leadId },
  });
  if (!attachment) {
    return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
  }

  try {
    const bytes = await readPrivateMediaObject(attachment.storageKey);
    const fallbackName = attachment.fileName
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 120);
    const encodedName = encodeURIComponent(attachment.originalName);

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(bytes.length),
        "Content-Type": attachment.mimeType,
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    if (error instanceof LeadPrivacyLockedError) {
      return NextResponse.json(
        { message: "La consulta está bloqueada por una eliminación de privacidad." },
        { status: 409 },
      );
    }
    logServerError("lead_attachment.read_failed", error, {
      attachmentId,
      leadId,
    });
    return NextResponse.json(
      { message: "No pudimos recuperar el archivo." },
      { status: 503 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: AttachmentRouteContext,
) {
  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { attachmentId, id: leadId } = await params;
  const attachment = await prisma.leadAttachment.findFirst({
    where: { id: attachmentId, leadId },
    include: { lead: { select: { name: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
  }

  let deletionJobId: string;
  try {
    deletionJobId = await prisma.$transaction(async (tx) => {
      const deletionJob = await enqueuePrivateObjectDeletion(
        tx,
        attachment.storageKey,
      );
      await tx.leadAttachment.delete({ where: { id: attachment.id } });
      await touchLeadActivity(tx, leadId, new Date());
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "LeadAttachment",
          entityId: leadId,
          summary: `Eliminó el archivo ${attachment.originalName} de ${attachment.lead.name}`,
          userId: session.user.id,
        },
      });
      return deletionJob.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    logServerError("lead_attachment.delete_failed", error, {
      attachmentId,
      leadId,
    });
    return NextResponse.json(
      {
        message:
          "No pudimos confirmar la eliminación completa. Reintentá en unos segundos.",
      },
      { status: 503 },
    );
  }

  let deletionOutcome: "deleted" | "failed" | "skipped" = "skipped";
  try {
    deletionOutcome = await dispatchPrivateObjectDeletion(deletionJobId);
  } catch (error) {
    logServerError("lead_attachment.storage_delete_deferred", error, {
      attachmentId,
      leadId,
    });
  }
  revalidateLeadSurfaces(leadId);
  return NextResponse.json(
    {
      id: attachment.id,
      message:
        deletionOutcome === "deleted"
          ? "Archivo eliminado"
          : "Archivo retirado del lead; la eliminación física quedó en cola segura.",
      ok: true,
      storageDeletionPending: deletionOutcome !== "deleted",
    },
    { status: deletionOutcome === "deleted" ? 200 : 202 },
  );
}
