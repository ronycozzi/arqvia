import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { revalidateMediaSurfaces } from "@/lib/media-revalidation";
import { deleteStoredMediaObject } from "@/lib/media-storage";
import { getMediaUsage } from "@/lib/media-usage";
import { isSameOriginRequest } from "@/lib/request-security";

class MediaNotFoundError extends Error {}
class MediaInUseError extends Error {
  constructor(readonly labels: string[]) {
    super("Media asset is in use");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Imagen no encontrada" }, { status: 404 });
  }

  let asset;
  try {
    asset = await prisma.$transaction(
      async (tx) => {
        const current = await tx.mediaAsset.findUnique({ where: { id } });
        if (!current) throw new MediaNotFoundError();
        const usage = await getMediaUsage(current.url, tx);
        if (usage.total > 0) throw new MediaInUseError(usage.labels);

        await tx.mediaAsset.delete({ where: { id: current.id } });
        await tx.auditLog.create({
          data: {
            action: "DELETE",
            entity: "MediaAsset",
            entityId: current.id,
            summary: `Eliminó imagen de la biblioteca visual: ${current.title}`,
            userId: session.user.id,
          },
        });
        return current;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof MediaNotFoundError) {
      return NextResponse.json(
        { message: "Imagen no encontrada" },
        { status: 404 },
      );
    }
    if (error instanceof MediaInUseError) {
      return NextResponse.json(
        {
          message: `No se puede eliminar porque está en uso: ${error.labels.slice(0, 3).join(", ")}.`,
        },
        { status: 409 },
      );
    }
    logServerError("media.metadata_delete_failed", error, { assetId: id });
    return NextResponse.json(
      {
        message: "No se pudo actualizar la biblioteca. Reintentá.",
      },
      { status: 503 },
    );
  }

  const restoreMetadata = async (reason: string) => {
    await prisma.$transaction(async (tx) => {
      await tx.mediaAsset.upsert({
        where: { id: asset.id },
        create: asset,
        update: {},
      });
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "MediaAsset",
          entityId: asset.id,
          summary: `Restauró imagen tras cancelar su eliminación: ${reason}`,
          userId: session.user.id,
        },
      });
    });
  };

  const concurrentUsage = await getMediaUsage(asset.url);
  if (concurrentUsage.total > 0) {
    await restoreMetadata("apareció una referencia concurrente");
    return NextResponse.json(
      {
        message: `La imagen empezó a usarse mientras se eliminaba: ${concurrentUsage.labels.slice(0, 3).join(", ")}.`,
      },
      { status: 409 },
    );
  }

  try {
    await deleteStoredMediaObject(asset.url);
  } catch (error) {
    await restoreMetadata("falló el almacenamiento");
    logServerError("media.storage_delete_failed", error, {
      assetId: asset.id,
      provider: process.env.MEDIA_STORAGE_PROVIDER || "local",
    });
    return NextResponse.json(
      {
        message:
          "No se pudo eliminar el archivo del almacenamiento. La imagen fue restaurada en la biblioteca.",
      },
      { status: 503 },
    );
  }

  revalidateMediaSurfaces();

  return NextResponse.json({ id: asset.id, message: "Imagen eliminada", ok: true });
}
