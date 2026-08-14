import path from "node:path";
import sharp from "sharp";
import { logServerError } from "@/lib/logger";
import {
  leadAttachmentAllowedMimeTypes,
  leadAttachmentMaxBytes,
  leadAttachmentMaxDimension,
  leadAttachmentMaxFiles,
  leadAttachmentMaxPixels,
  leadAttachmentMaxTotalBytes,
} from "@/lib/lead-attachment-config";
import { storePrivateMediaObject } from "@/lib/media-storage";

export type StoredLeadAttachment = {
  fileName: string;
  mimeType: string;
  originalName: string;
  remove: () => Promise<void> | void;
  sizeBytes: number;
  storageKey: string;
};

export type StoreLeadAttachmentsResult =
  | { ok: true; attachments: StoredLeadAttachment[] }
  | { ok: false; message: string; status: 400 | 413 | 503 };

export async function storeLeadAttachmentFiles(
  files: File[],
): Promise<StoreLeadAttachmentsResult> {
  const validationError = validateLeadAttachmentFiles(files);
  if (validationError) return validationError;

  const attachments: StoredLeadAttachment[] = [];

  try {
    for (const file of files) {
      const prepared = await prepareLeadAttachment(file);
      if (!prepared.ok) {
        await removeStoredLeadAttachments(attachments);
        return prepared;
      }

      const stored = await storePrivateMediaObject({
        bytes: prepared.bytes,
        contentType: prepared.mimeType,
        filename: prepared.fileName,
      });
      attachments.push({
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        originalName: sanitizeOriginalName(file.name),
        remove: stored.remove,
        sizeBytes: prepared.bytes.length,
        storageKey: stored.storageKey,
      });
    }

    return { ok: true, attachments };
  } catch (error) {
    await removeStoredLeadAttachments(attachments);
    logServerError("lead_attachment.store_failed", error, {
      storedCount: attachments.length,
    });
    return {
      ok: false,
      message: "No pudimos guardar los archivos. Intentá nuevamente.",
      status: 503,
    };
  }
}

export async function removeStoredLeadAttachments(
  attachments: StoredLeadAttachment[],
) {
  const results = await Promise.allSettled(
    attachments.map((attachment) => attachment.remove()),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logServerError("lead_attachment.compensation_failed", result.reason, {
        attachmentIndex: index,
        storedCount: attachments.length,
      });
    }
  });
}

export function validateLeadAttachmentFiles(
  files: File[],
): Extract<StoreLeadAttachmentsResult, { ok: false }> | null {
  if (files.length > leadAttachmentMaxFiles) {
    return {
      ok: false,
      message: `Podés adjuntar hasta ${leadAttachmentMaxFiles} archivos.`,
      status: 400,
    };
  }

  if (files.some((file) => !file.size || file.size > leadAttachmentMaxBytes)) {
    return {
      ok: false,
      message: "Cada archivo debe pesar hasta 5 MB.",
      status: 413,
    };
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > leadAttachmentMaxTotalBytes) {
    return {
      ok: false,
      message: "Los archivos adjuntos no pueden superar 12 MB en total.",
      status: 413,
    };
  }

  if (
    files.some(
      (file) =>
        !leadAttachmentAllowedMimeTypes.includes(
          file.type as (typeof leadAttachmentAllowedMimeTypes)[number],
        ),
    )
  ) {
    return {
      ok: false,
      message: "Formato no permitido. Usá PDF, JPG, PNG, WebP o AVIF.",
      status: 400,
    };
  }

  return null;
}

async function prepareLeadAttachment(file: File) {
  const source = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    if (source.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return invalidFile("El PDF no coincide con el formato declarado.");
    }
    if (!isPassivePdfDocument(source)) {
      return invalidFile(
        "El PDF está dañado o contiene funciones interactivas no permitidas.",
      );
    }

    return {
      ok: true as const,
      bytes: source,
      fileName: `${safeFilenameBase(file.name)}.pdf`,
      mimeType: "application/pdf",
    };
  }

  if (!hasValidImageSignature(file.type, source)) {
    return invalidFile("Una imagen no coincide con el formato declarado.");
  }

  try {
    const image = sharp(source, {
      animated: false,
      failOn: "error",
      limitInputPixels: leadAttachmentMaxPixels,
    });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error("Missing dimensions");
    if (
      metadata.width > leadAttachmentMaxDimension ||
      metadata.height > leadAttachmentMaxDimension ||
      metadata.width * metadata.height > leadAttachmentMaxPixels
    ) {
      return invalidFile("Una imagen tiene dimensiones demasiado grandes.");
    }

    const normalized = await image
      .rotate()
      .resize({
        fit: "inside",
        height: 3000,
        width: 3000,
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .webp({ effort: 4, quality: 86 })
      .toBuffer();

    return {
      ok: true as const,
      bytes: normalized,
      fileName: `${safeFilenameBase(file.name)}.webp`,
      mimeType: "image/webp",
    };
  } catch {
    return invalidFile("No pudimos procesar una de las imágenes adjuntas.");
  }
}

export function isPassivePdfDocument(source: Uint8Array) {
  if (source.length < 64) return false;

  const text = Buffer.from(source).toString("latin1");
  if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r\n|\r|\n)/.test(text.slice(0, 16))) {
    return false;
  }

  const eofIndex = text.lastIndexOf("%%EOF");
  if (eofIndex < 0 || text.slice(eofIndex + 5).trim().length > 0) return false;

  const tailStart = Math.max(0, eofIndex - 4_096);
  const tail = text.slice(tailStart, eofIndex);
  const startXrefMatches = [...tail.matchAll(/startxref\s+(\d+)\s*$/gm)];
  const offsetText = startXrefMatches.at(-1)?.[1];
  if (!offsetText) return false;

  const xrefOffset = Number(offsetText);
  if (!Number.isSafeInteger(xrefOffset) || xrefOffset < 0 || xrefOffset >= eofIndex) {
    return false;
  }

  const xrefSection = text.slice(xrefOffset, eofIndex);
  const xrefTable = /^xref\b/.test(xrefSection) && /trailer\s*<</.test(xrefSection);
  const xrefStream =
    /^\d+\s+\d+\s+obj\b/.test(xrefSection) &&
    /\/Type\s*\/XRef\b/.test(xrefSection.slice(0, 2_048));
  if (!xrefTable && !xrefStream) return false;
  if (!/\d+\s+\d+\s+obj\b/.test(text) || !/\bendobj\b/.test(text)) {
    return false;
  }

  const decodedNames = text.replace(/#([0-9a-f]{2})/gi, (_match, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  const searchable = decodedNames.replace(/%[^\r\n]*/g, "");
  const blockedNames = [
    "AA",
    "AcroForm",
    "EmbeddedFile",
    "Encrypt",
    "Filespec",
    "GoToR",
    "ImportData",
    "JavaScript",
    "JS",
    "Launch",
    "ObjStm",
    "OpenAction",
    "RichMedia",
    "SubmitForm",
    "XFA",
  ];

  return !blockedNames.some((name) =>
    new RegExp(`/${name}(?![A-Za-z0-9])`).test(searchable),
  );
}

function invalidFile(message: string) {
  return { ok: false as const, message, status: 400 as const };
}

function safeFilenameBase(value: string) {
  const parsed = path.parse(value).name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);

  return parsed || "archivo-arqvia";
}

function sanitizeOriginalName(value: string) {
  return path.basename(value).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 140);
}

function hasValidImageSignature(mimeType: string, bytes: Uint8Array) {
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
