import { lstat } from "node:fs/promises";
import path from "node:path";

export function assertInsideDirectory(candidate, directory, message) {
  const relative = path.relative(directory, candidate);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error(message);
  }
}

export async function assertRegularFile(filePath, message) {
  const fileStat = await lstat(filePath);
  if (!fileStat.isFile()) throw new Error(message);
  return fileStat;
}

export function integrityCheckPassed(integrity) {
  return (
    Array.isArray(integrity) &&
    integrity.some((entry) => Object.values(entry).join(":").toLowerCase() === "ok")
  );
}

export function validateBackupManifest(manifest, backupPath) {
  const manifestFile = typeof manifest?.file === "string" ? path.resolve(manifest.file) : "";
  const validCounts = [
    "automationDeliveries",
    "leadActivities",
    "leadAttachments",
    "leadEstimates",
    "leadNotes",
    "leads",
    "privateObjectDeletions",
    "projects",
    "services",
    "technicalVisits",
    "users",
  ].every(
    (key) => Number.isSafeInteger(manifest?.counts?.[key]) && manifest.counts[key] >= 0,
  );
  const validIntegrity =
    Array.isArray(manifest?.integrityCheck) &&
    manifest.integrityCheck.some((entry) => String(entry).toLowerCase() === "ok");
  const createdAt = Date.parse(manifest?.createdAt || "");
  const expectedAttachmentDir = `${path.resolve(backupPath)}.attachments`;
  const attachmentFiles = manifest?.attachments?.files;
  const validAttachmentFiles =
    Array.isArray(attachmentFiles) &&
    attachmentFiles.every(
      (entry) =>
        typeof entry?.storageKey === "string" &&
        entry.storageKey === `local:${entry.filename}` &&
        typeof entry.filename === "string" &&
        entry.filename === path.basename(entry.filename) &&
        Number.isSafeInteger(entry.sizeBytes) &&
        entry.sizeBytes >= 0 &&
        /^[a-f0-9]{64}$/.test(entry.sha256 || ""),
    ) &&
    new Set(attachmentFiles.map((entry) => entry.storageKey)).size ===
      attachmentFiles.length;
  const validAttachments =
    path.resolve(manifest?.attachments?.directory || "") ===
      expectedAttachmentDir &&
    Number.isSafeInteger(manifest?.attachments?.externalCount) &&
    manifest.attachments.externalCount >= 0 &&
    validAttachmentFiles &&
    attachmentFiles.length + manifest.attachments.externalCount ===
      manifest?.counts?.leadAttachments;

  if (
    manifest?.database !== "sqlite" ||
    manifest?.verified !== true ||
    manifestFile !== path.resolve(backupPath) ||
    !Number.isSafeInteger(manifest?.sizeBytes) ||
    manifest.sizeBytes <= 0 ||
    !/^[a-f0-9]{64}$/.test(manifest?.sha256 || "") ||
    !validCounts ||
    !validAttachments ||
    !validIntegrity ||
    !Number.isFinite(createdAt) ||
    createdAt > Date.now() + 60_000
  ) {
    throw new Error("SQLite backup manifest is invalid or incomplete.");
  }
}
