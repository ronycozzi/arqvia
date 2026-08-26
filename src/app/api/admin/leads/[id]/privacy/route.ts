import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoundedJson } from "@/lib/bounded-request";
import {
  adminOnlyRoles,
  getVerifiedAdminSession,
} from "@/lib/admin-auth";
import {
  eraseLeadForPrivacy,
  LeadPrivacyAutomationBusyError,
  LeadPrivacyNotFoundError,
} from "@/lib/lead-privacy";
import { logServerError } from "@/lib/logger";
import { revalidateLeadSurfaces } from "@/lib/revalidation";
import { isJsonRequest, isSameOriginRequest } from "@/lib/request-security";

const privacyConfirmationSchema = z.object({
  confirmation: z.literal("ELIMINAR"),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json(
      { message: "Origen no permitido" },
      { status: 403 },
    );
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
  const parsed = privacyConfirmationSchema.safeParse(payload.value);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Confirmación inválida." },
      { status: 400 },
    );
  }

  const { id } = await params;
  let result;

  try {
    result = await eraseLeadForPrivacy({
      actorUserId: session.user.id,
      leadId: id,
    });
  } catch (error) {
    if (error instanceof LeadPrivacyNotFoundError) {
      return NextResponse.json(
        { message: "Consulta no encontrada" },
        { status: 404 },
      );
    }

    logServerError("admin.lead_privacy_erasure_failed", error, {
      userId: session.user.id,
    });

    if (error instanceof LeadPrivacyAutomationBusyError) {
      return NextResponse.json(
        {
          message:
            "Hay una automatización terminando de procesarse. El lead quedó bloqueado para nuevos envíos; reintentá en unos minutos.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message:
          "No se pudo completar la eliminación. Podés reintentar de forma segura.",
      },
      { status: 503 },
    );
  }

  revalidateLeadSurfaces(id);
  return NextResponse.json(
    {
      ok: true,
      pendingObjectDeletions: result.pendingObjectDeletions,
    },
    { status: result.pendingObjectDeletions > 0 ? 202 : 200 },
  );
}
