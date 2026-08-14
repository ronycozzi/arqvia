import { createHash } from "node:crypto";
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  assertInsideDirectory,
  assertRegularFile,
  integrityCheckPassed,
  validateBackupManifest,
} from "./sqlite-backup-utils.mjs";

const backupDir = resolve("backups");
const manifestPath = await resolveManifestPath(process.argv[2]);
const backupPath = manifestPath.slice(0, -".json".length);
assertInsideBackupDir(manifestPath);
assertInsideBackupDir(backupPath);

const manifestStat = await assertRegularFile(
  manifestPath,
  "SQLite backup manifest is missing or not a regular file.",
);
if (!manifestStat.isFile() || manifestStat.size > 1_000_000) {
  throw new Error("SQLite backup manifest is missing or unexpectedly large.");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
validateBackupManifest(manifest, backupPath);

const sourceStat = await assertRegularFile(
  backupPath,
  "SQLite backup is missing or not a regular file.",
);
const sourceChecksum = createHash("sha256")
  .update(await readFile(backupPath))
  .digest("hex");
if (sourceStat.size !== manifest.sizeBytes || sourceChecksum !== manifest.sha256) {
  throw new Error("SQLite backup does not match its signed manifest metadata.");
}

const restoreDir = await mkdtemp(resolve(backupDir, ".restore-check-"));
const restoredPath = resolve(restoreDir, "restored.db");
let verifier;

try {
  await copyFile(backupPath, restoredPath);
  const restoreChecksum = createHash("sha256")
    .update(await readFile(restoredPath))
    .digest("hex");
  if (restoreChecksum !== manifest.sha256) {
    throw new Error("Restored SQLite copy failed checksum verification.");
  }

  const restoreUrl = `file:${restoredPath.replaceAll("\\", "/")}`;
  verifier = new PrismaClient({ datasources: { db: { url: restoreUrl } } });

  const integrity = await verifier.$queryRawUnsafe("PRAGMA integrity_check");
  if (!integrityCheckPassed(integrity)) {
    throw new Error("Restored SQLite copy failed PRAGMA integrity_check.");
  }

  const counts = {
    automationDeliveries: await verifier.leadAutomationDelivery.count(),
    leads: await verifier.lead.count(),
    projects: await verifier.project.count(),
    services: await verifier.service.count(),
    users: await verifier.user.count(),
  };
  if (JSON.stringify(counts) !== JSON.stringify(manifest.counts)) {
    throw new Error("Restored SQLite counts do not match the backup manifest.");
  }

  const essentialTables = await verifier.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('ClientConfig', 'Lead', 'User', 'AuditLog') ORDER BY name",
  );
  if (!Array.isArray(essentialTables) || essentialTables.length !== 4) {
    throw new Error("Restored SQLite copy is missing an essential table.");
  }

  console.log(`SQLite restore drill passed: ${manifestPath}`);
  console.log(
    `Verified ${sourceStat.size} bytes and ${Object.values(counts).reduce((total, value) => total + value, 0)} indexed records.`,
  );
} finally {
  await verifier?.$disconnect();
  await rm(restoreDir, { force: true, recursive: true });
}

async function resolveManifestPath(argument) {
  if (argument) return resolve(argument);

  const candidates = (await readdir(backupDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".db.json"))
    .map((entry) => resolve(backupDir, entry.name));
  if (!candidates.length) {
    throw new Error("No SQLite backup manifest was found in backups/.");
  }

  const ranked = await Promise.all(
    candidates.map(async (path) => ({ path, mtimeMs: (await stat(path)).mtimeMs })),
  );
  ranked.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return ranked[0].path;
}

function assertInsideBackupDir(path) {
  assertInsideDirectory(path, backupDir, "Refusing to inspect a backup outside backups/.");
}
