import "dotenv/config";
import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  assertInsideDirectory,
  assertRegularFile,
  integrityCheckPassed,
} from "./sqlite-backup-utils.mjs";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
if (!databaseUrl.startsWith("file:")) {
  throw new Error("db:backup:sqlite only supports the local SQLite database.");
}

const configuredSqlitePath = databaseUrl.slice("file:".length).split(/[?#]/, 1)[0];
const sqlitePath = resolve("prisma", configuredSqlitePath);
assertInsideDirectory(
  sqlitePath,
  resolve("prisma"),
  "Refusing to back up a SQLite database outside prisma/.",
);

const backupDir = resolve("backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = resolve(backupDir, `arqvia-${stamp}.db`);
const attachmentBackupDir = `${backupPath}.attachments`;
const privateAttachmentDir = resolve("storage", "lead-attachments");
assertInsideDirectory(backupPath, backupDir, "Refusing to write a backup outside backups/.");
assertInsideDirectory(
  attachmentBackupDir,
  backupDir,
  "Refusing to write attachment backups outside backups/.",
);

await mkdir(backupDir, { recursive: true });
await mkdir(attachmentBackupDir, { recursive: true });

const prisma = new PrismaClient();
try {
  const sqlitePath = backupPath.replaceAll("\\", "/").replaceAll("'", "''");
  await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlitePath}'`);
  await chmod(backupPath, 0o600);

  const backupUrl = `file:${backupPath.replaceAll("\\", "/")}`;
  const verifier = new PrismaClient({ datasources: { db: { url: backupUrl } } });
  let counts;
  let integrity;
  let attachmentRows;
  try {
    integrity = await verifier.$queryRawUnsafe("PRAGMA integrity_check");
    counts = {
      automationDeliveries: await verifier.leadAutomationDelivery.count(),
      leadActivities: await verifier.leadActivity.count(),
      leadAttachments: await verifier.leadAttachment.count(),
      leadEstimates: await verifier.leadEstimate.count(),
      leadNotes: await verifier.leadNote.count(),
      leads: await verifier.lead.count(),
      privateObjectDeletions: await verifier.privateObjectDeletion.count(),
      projects: await verifier.project.count(),
      services: await verifier.service.count(),
      technicalVisits: await verifier.technicalVisit.count(),
      users: await verifier.user.count(),
    };
    attachmentRows = await verifier.leadAttachment.findMany({
      select: { sizeBytes: true, storageKey: true },
    });
  } finally {
    await verifier.$disconnect();
  }

  const integrityResult = Array.isArray(integrity)
    ? integrity.map((entry) => Object.values(entry).join(":"))
    : [];
  if (!integrityCheckPassed(integrity)) {
    throw new Error("SQLite backup failed PRAGMA integrity_check.");
  }

  await assertRegularFile(backupPath, "SQLite backup is not a regular file.");
  const file = await stat(backupPath);
  const checksum = createHash("sha256")
    .update(await readFile(backupPath))
    .digest("hex");
  const localAttachments = [];
  let externalAttachmentCount = 0;
  for (const attachment of attachmentRows) {
    if (!attachment.storageKey.startsWith("local:")) {
      externalAttachmentCount += 1;
      continue;
    }

    const rawFilename = attachment.storageKey.slice("local:".length);
    const filename = basename(rawFilename);
    if (!filename || rawFilename !== filename) {
      throw new Error("A local attachment has an unsafe storage key.");
    }

    const sourcePath = resolve(privateAttachmentDir, filename);
    const destinationPath = resolve(attachmentBackupDir, filename);
    assertInsideDirectory(
      sourcePath,
      privateAttachmentDir,
      "Refusing to read an attachment outside private storage.",
    );
    assertInsideDirectory(
      destinationPath,
      attachmentBackupDir,
      "Refusing to write an attachment outside its backup directory.",
    );
    const sourceStat = await assertRegularFile(
      sourcePath,
      "A local attachment referenced by the database is missing.",
    );
    if (sourceStat.size !== attachment.sizeBytes) {
      throw new Error("A local attachment size does not match database metadata.");
    }
    const bytes = await readFile(sourcePath);
    const attachmentChecksum = createHash("sha256").update(bytes).digest("hex");
    await copyFile(sourcePath, destinationPath);
    await chmod(destinationPath, 0o600);
    localAttachments.push({
      filename,
      sha256: attachmentChecksum,
      sizeBytes: sourceStat.size,
      storageKey: attachment.storageKey,
    });
  }
  const manifestPath = `${backupPath}.json`;
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        database: "sqlite",
        file: backupPath,
        sizeBytes: file.size,
        sha256: checksum,
        verified: true,
        integrityCheck: integrityResult,
        counts,
        attachments: {
          directory: attachmentBackupDir,
          externalCount: externalAttachmentCount,
          files: localAttachments,
        },
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  console.log(`Verified SQLite backup created: ${backupPath}`);
  console.log(`Manifest: ${manifestPath}`);
} finally {
  await prisma.$disconnect();
}
