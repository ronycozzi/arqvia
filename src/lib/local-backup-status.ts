import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type LocalBackupSummary = {
  createdAt: Date;
  sizeBytes: number;
};

export async function getLatestVerifiedLocalBackup(
  backupDirectory = path.resolve("backups"),
): Promise<LocalBackupSummary | null> {
  try {
    const manifests = (await readdir(backupDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".db.json"))
      .map((entry) => path.resolve(backupDirectory, entry.name));
    if (!manifests.length) return null;

    const ranked = await Promise.all(
      manifests.map(async (manifestPath) => ({
        manifestPath,
        stats: await stat(manifestPath),
      })),
    );
    ranked.sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);

    for (const candidate of ranked) {
      try {
        const result = await verifyBackupCandidate(
          candidate.manifestPath,
          candidate.stats.size,
        );
        if (result) return result;
      } catch {
        // A damaged recent candidate must not hide an older valid restore point.
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function verifyBackupCandidate(
  manifestPath: string,
  manifestSize: number,
): Promise<LocalBackupSummary | null> {
  if (manifestSize <= 0 || manifestSize > 1_000_000) return null;

  const backupPath = manifestPath.slice(0, -".json".length);
  const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as {
    attachments?: {
      directory?: unknown;
      externalCount?: unknown;
      files?: Array<{
        filename?: unknown;
        sha256?: unknown;
        sizeBytes?: unknown;
        storageKey?: unknown;
      }>;
    };
    counts?: {
      leadAttachments?: unknown;
      privateObjectDeletions?: unknown;
    };
    createdAt?: unknown;
    database?: unknown;
    file?: unknown;
    integrityCheck?: unknown;
    sha256?: unknown;
    sizeBytes?: unknown;
    verified?: unknown;
  };
  const createdAt = new Date(String(parsed.createdAt || ""));
  const integrityPassed =
    Array.isArray(parsed.integrityCheck) &&
    parsed.integrityCheck.some((entry) => String(entry).toLowerCase() === "ok");
  const attachmentDirectory = path.resolve(
    String(parsed.attachments?.directory || ""),
  );
  const attachmentFiles = parsed.attachments?.files;
  const attachmentCount = parsed.counts?.leadAttachments;
  const externalAttachmentCount = parsed.attachments?.externalCount;
  const attachmentsStructured =
    attachmentDirectory === path.resolve(`${backupPath}.attachments`) &&
    Array.isArray(attachmentFiles) &&
    Number.isSafeInteger(externalAttachmentCount) &&
    Number(externalAttachmentCount) >= 0 &&
    Number.isSafeInteger(attachmentCount) &&
    Number.isSafeInteger(parsed.counts?.privateObjectDeletions) &&
    Number(parsed.counts?.privateObjectDeletions) >= 0 &&
    Number(attachmentCount) ===
      attachmentFiles.length + Number(externalAttachmentCount);
  if (
    parsed.database !== "sqlite" ||
    parsed.verified !== true ||
    path.resolve(String(parsed.file || "")) !== path.resolve(backupPath) ||
    !Number.isFinite(createdAt.getTime()) ||
    createdAt.getTime() > Date.now() + 60_000 ||
    typeof parsed.sizeBytes !== "number" ||
    !Number.isSafeInteger(parsed.sizeBytes) ||
    parsed.sizeBytes <= 0 ||
    !/^[a-f0-9]{64}$/.test(String(parsed.sha256 || "")) ||
    !integrityPassed ||
    !attachmentsStructured
  ) {
    return null;
  }

  const backupStats = await stat(backupPath);
  if (!backupStats.isFile() || backupStats.size !== parsed.sizeBytes) return null;
  const checksum = createHash("sha256")
    .update(await readFile(backupPath))
    .digest("hex");
  if (checksum !== parsed.sha256) return null;

  for (const attachment of attachmentFiles || []) {
    const filename = String(attachment.filename || "");
    const storageKey = String(attachment.storageKey || "");
    const candidatePath = path.resolve(attachmentDirectory, filename);
    const relative = path.relative(attachmentDirectory, candidatePath);
    if (
      !filename ||
      filename !== path.basename(filename) ||
      storageKey !== `local:${filename}` ||
      !relative ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative) ||
      !Number.isSafeInteger(attachment.sizeBytes) ||
      Number(attachment.sizeBytes) < 0 ||
      !/^[a-f0-9]{64}$/.test(String(attachment.sha256 || ""))
    ) {
      return null;
    }

    const attachmentStats = await stat(candidatePath);
    if (
      !attachmentStats.isFile() ||
      attachmentStats.size !== attachment.sizeBytes
    ) {
      return null;
    }
    const attachmentChecksum = createHash("sha256")
      .update(await readFile(candidatePath))
      .digest("hex");
    if (attachmentChecksum !== attachment.sha256) return null;
  }

  return { createdAt, sizeBytes: parsed.sizeBytes };
}
