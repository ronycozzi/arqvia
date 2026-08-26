// @vitest-environment node

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getLatestVerifiedLocalBackup } from "@/lib/local-backup-status";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function backupFixture({
  tamperedAttachment = false,
  tamperedDatabase = false,
} = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "arqvia-backup-"));
  directories.push(directory);
  const backupPath = path.join(directory, "arqvia-test.db");
  const manifestPath = `${backupPath}.json`;
  const attachmentDirectory = `${backupPath}.attachments`;
  const attachmentFilename = "opaque-plan.pdf";
  const attachmentPath = path.join(attachmentDirectory, attachmentFilename);
  const bytes = Buffer.from("verified sqlite backup fixture");
  const attachmentBytes = Buffer.from("verified private attachment fixture");
  await writeFile(backupPath, bytes);
  await mkdir(attachmentDirectory);
  await writeFile(attachmentPath, attachmentBytes);
  await writeFile(
    manifestPath,
    JSON.stringify({
      createdAt: "2026-07-01T12:00:00.000Z",
      database: "sqlite",
      file: backupPath,
      integrityCheck: ["ok"],
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
      verified: true,
      counts: { leadAttachments: 1, privateObjectDeletions: 0 },
      attachments: {
        directory: attachmentDirectory,
        externalCount: 0,
        files: [
          {
            filename: attachmentFilename,
            sha256: createHash("sha256").update(attachmentBytes).digest("hex"),
            sizeBytes: attachmentBytes.length,
            storageKey: `local:${attachmentFilename}`,
          },
        ],
      },
    }),
  );
  if (tamperedDatabase) {
    await writeFile(backupPath, Buffer.from("changed after manifest"));
  }
  if (tamperedAttachment) {
    await writeFile(attachmentPath, Buffer.from("changed attachment"));
  }
  return { bytes, directory };
}

describe("local backup status", () => {
  it("reports only a backup whose live bytes still match the manifest", async () => {
    const { bytes, directory } = await backupFixture();

    await expect(getLatestVerifiedLocalBackup(directory)).resolves.toEqual({
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      sizeBytes: bytes.length,
    });
  });

  it("hides a backup changed after its manifest was written", async () => {
    const { directory } = await backupFixture({ tamperedDatabase: true });

    await expect(getLatestVerifiedLocalBackup(directory)).resolves.toBeNull();
  });

  it("hides a backup when an attachment no longer matches its manifest", async () => {
    const { directory } = await backupFixture({ tamperedAttachment: true });

    await expect(getLatestVerifiedLocalBackup(directory)).resolves.toBeNull();
  });

  it("falls back to an older valid backup when the newest manifest is corrupt", async () => {
    const { bytes, directory } = await backupFixture();
    const corruptManifest = path.join(directory, "arqvia-newest.db.json");
    await writeFile(corruptManifest, "{not-json");
    const newer = new Date("2026-08-20T12:00:00.000Z");
    await utimes(corruptManifest, newer, newer);

    await expect(getLatestVerifiedLocalBackup(directory)).resolves.toEqual({
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      sizeBytes: bytes.length,
    });
  });
});
