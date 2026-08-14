import sharp from "sharp";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import {
  formatMediaBytes,
  isAllowedMediaMimeType,
  isMediaAssetCategory,
  mediaUploadMaxBytes,
  mediaUploadMaxDimension,
  mediaUploadMaxPixels,
} from "@/lib/media";
import {
  buildMediaRightsData,
  mediaRightsSchema,
} from "@/lib/media-rights";
import { storeMediaObject } from "@/lib/media-storage";

export type MediaUploadInput = {
  approvedBy: string;
  altText: string;
  category: string;
  file: File;
  rightsApproved: boolean;
  rightsNote: string;
  sourceUrl: string;
  title: string;
  userId: string;
};

export type MediaUploadErrors = Partial<
  Record<
    | "altText"
    | "category"
    | "file"
    | "rightsApproved"
    | "rightsNote"
    | "sourceUrl"
    | "title",
    string[]
  >
>;

export type MediaActionState = {
  errors?: MediaUploadErrors;
  message: string;
  ok: boolean;
};

export type MediaUploadResult =
  | { ok: true; asset: { id: string; title: string; url: string } }
  | {
      errors?: MediaUploadErrors;
      message: string;
      ok: false;
      status?: 400 | 503;
    };

export function cleanMediaText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function slugifyFilename(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

  return base || "arqvia-imagen";
}

function hasValidSignature(mimeType: string, bytes: Uint8Array) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }

  if (mimeType === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  if (mimeType === "image/avif") {
    return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  }

  return false;
}

export async function createMediaAssetFromFile({
  approvedBy,
  altText,
  category,
  file,
  rightsApproved,
  rightsNote,
  sourceUrl,
  title,
  userId,
}: MediaUploadInput): Promise<MediaUploadResult> {
  const errors: MediaUploadErrors = {};
  const parsedRights = mediaRightsSchema.safeParse({
    rightsApproved,
    rightsNote,
    sourceUrl,
  });

  if (!title || title.length < 3) errors.title = ["Indicá un título claro."];
  if (!altText || altText.length < 10) {
    errors.altText = ["Escribí un alt text descriptivo."];
  }
  if (!category || category.length < 3) {
    errors.category = ["Elegí una categoría."];
  } else if (!isMediaAssetCategory(category)) {
    errors.category = ["Elegí una categoría válida de la biblioteca."];
  }
  if (!file.size) errors.file = ["Seleccioná una imagen."];
  if (!parsedRights.success) {
    const rightsErrors = parsedRights.error.flatten().fieldErrors;
    errors.rightsApproved = rightsErrors.rightsApproved;
    errors.rightsNote = rightsErrors.rightsNote;
    errors.sourceUrl = rightsErrors.sourceUrl;
  }

  if (!parsedRights.success || Object.keys(errors).length) {
    return { ok: false, message: "Revisá los campos marcados.", errors };
  }

  if (!isAllowedMediaMimeType(file.type)) {
    return {
      ok: false,
      message: "Formato no permitido. Usá JPG, PNG, WebP o AVIF.",
      errors: { file: ["Formato no permitido."] },
    };
  }
  if (file.size > mediaUploadMaxBytes) {
    return {
      ok: false,
      message: "La imagen supera el máximo permitido.",
      errors: {
        file: [`Subí una imagen de hasta ${formatMediaBytes(mediaUploadMaxBytes)}.`],
      },
    };
  }

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(file.type, sourceBuffer)) {
    return {
      ok: false,
      message: "El archivo no coincide con el formato declarado.",
      errors: { file: ["Verificá que sea una imagen válida."] },
    };
  }

  let buffer: Buffer;
  let dimensions: { height: number; width: number };
  try {
    const image = sharp(sourceBuffer, {
      animated: false,
      failOn: "error",
      limitInputPixels: mediaUploadMaxPixels,
    });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error("Missing dimensions");
    if (
      metadata.width > mediaUploadMaxDimension ||
      metadata.height > mediaUploadMaxDimension ||
      metadata.width * metadata.height > mediaUploadMaxPixels
    ) {
      return {
        ok: false,
        message: "La imagen tiene dimensiones demasiado grandes.",
        errors: {
          file: [
            `Usá una imagen de hasta ${mediaUploadMaxDimension}px por lado y 40 megapíxeles.`,
          ],
        },
      };
    }

    const normalized = await image
      .rotate()
      .resize({
        fit: "inside",
        height: 3840,
        width: 3840,
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .webp({ effort: 4, quality: 88 })
      .toBuffer({ resolveWithObject: true });

    buffer = normalized.data;
    dimensions = {
      height: normalized.info.height,
      width: normalized.info.width,
    };
  } catch {
    return {
      ok: false,
      message: "No se pudo decodificar la imagen.",
      errors: {
        file: ["Verificá que el archivo no esté dañado o incompleto."],
      },
    };
  }

  const filename = `${slugifyFilename(title)}.webp`;
  let storedObject: Awaited<ReturnType<typeof storeMediaObject>> | null = null;

  try {
    storedObject = await storeMediaObject({
      bytes: buffer,
      contentType: "image/webp",
      filename,
    });

    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          title,
          altText,
          category,
          height: dimensions.height,
          mimeType: "image/webp",
          ...buildMediaRightsData(parsedRights.data, approvedBy),
          sizeBytes: buffer.length,
          source: "upload",
          url: storedObject!.url,
          width: dimensions.width,
        },
        select: { id: true, title: true, url: true },
      });

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "MediaAsset",
          entityId: created.id,
          summary: `Subió imagen al media library: ${created.title}`,
          userId,
        },
      });

      return created;
    });

    return { ok: true, asset };
  } catch (error) {
    if (storedObject) {
      try {
        await storedObject.remove();
      } catch (cleanupError) {
        logServerError("media.upload_compensation_failed", cleanupError, {
          userId,
        });
      }
    }
    logServerError("media.asset_create_failed", error, { userId });
    return {
      ok: false,
      message: "No se pudo guardar la imagen. Intentá con otro nombre o archivo.",
      status: 503,
    };
  }
}
