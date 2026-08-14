"use server";

import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import {
  buildMediaRightsData,
  getMediaApproverLabel,
  type MediaRightsFieldErrors,
  mediaRightsSchema,
} from "@/lib/media-rights";
import { revalidateMediaSurfaces } from "@/lib/media-revalidation";

export type MediaRightsActionState = {
  errors?: MediaRightsFieldErrors;
  message: string;
  ok: boolean;
};

export async function saveMediaRights(
  _previousState: MediaRightsActionState,
  formData: FormData,
): Promise<MediaRightsActionState> {
  void _previousState;

  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) {
    return {
      message: "Tu rol no puede modificar la procedencia de imágenes.",
      ok: false,
    };
  }

  const parsed = mediaRightsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.id) {
    return {
      errors: parsed.success
        ? { id: ["No se pudo identificar la imagen."] }
        : parsed.error.flatten().fieldErrors,
      message: "Revisá los campos marcados.",
      ok: false,
    };
  }

  const input = parsed.data;
  const approvedBy = getMediaApproverLabel(session.user);

  try {
    await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.update({
        where: { id: input.id },
        data: buildMediaRightsData(input, approvedBy),
        select: { id: true, title: true },
      });

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "MediaAsset",
          entityId: asset.id,
          summary: input.rightsApproved
            ? `Aprobó derechos de uso de imagen: ${asset.title}`
            : `Marcó pendiente la aprobación de imagen: ${asset.title}`,
          userId: session.user.id,
        },
      });
    });
  } catch (error) {
    logServerError("media.rights_update_failed", error, {
      assetId: input.id,
      userId: session.user.id,
    });
    return {
      message: "No se pudo guardar la procedencia y los derechos.",
      ok: false,
    };
  }

  revalidateMediaSurfaces();
  return {
    message: input.rightsApproved
      ? "Derechos aprobados y registrados."
      : "Datos guardados; la imagen quedó pendiente de aprobación.",
    ok: true,
  };
}
