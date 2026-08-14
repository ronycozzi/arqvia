import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { readBoundedJson } from "@/lib/bounded-request";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { touchLeadActivity } from "@/lib/lead-activity";
import { logServerError } from "@/lib/logger";
import { revalidateLeadSurfaces } from "@/lib/revalidation";
import { isJsonRequest, isSameOriginRequest } from "@/lib/request-security";
import { leadNoteSchema } from "@/lib/validations";

class LeadNoteLeadNotFoundError extends Error {}

export async function POST(
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

  const { id } = await params;
  const payload = await readBoundedJson(request);
  if (!payload.ok) {
    return NextResponse.json(
      {
        message:
          payload.status === 413
            ? "La solicitud es demasiado grande."
            : "Datos inválidos",
      },
      { status: payload.status },
    );
  }
  const body = payload.value;
  const parsed = leadNoteSchema.safeParse({
    leadId: id,
    body:
      body && typeof body === "object" && "body" in body
        ? body.body
        : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos" },
      { status: 400 },
    );
  }

  let note: { id: string };
  try {
    note = await prisma.$transaction(
      async (tx) => {
        const lead = await tx.lead.findUnique({
          where: { id },
          select: { id: true, name: true },
        });
        if (!lead) throw new LeadNoteLeadNotFoundError();

        const createdNote = await tx.leadNote.create({
          data: {
            leadId: lead.id,
            body: parsed.data.body,
            userId: session.user.id,
          },
          select: { id: true },
        });
        await touchLeadActivity(tx, lead.id, new Date());
        await tx.auditLog.create({
          data: {
            action: "CREATE",
            entity: "LeadNote",
            entityId: lead.id,
            summary: `Agregó una nota interna a la consulta de ${lead.name}`,
            userId: session.user.id,
          },
        });
        return createdNote;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof LeadNoteLeadNotFoundError) {
      return NextResponse.json(
        { message: "Consulta no encontrada" },
        { status: 404 },
      );
    }

    logServerError("admin.lead_note_create_failed", error, {
      leadId: id,
      userId: session.user.id,
    });
    return NextResponse.json(
      { message: "No se pudo guardar la nota. Reintentá en unos segundos." },
      { status: 503 },
    );
  }

  revalidateLeadSurfaces(id);

  return NextResponse.json({ ok: true, noteId: note.id });
}
