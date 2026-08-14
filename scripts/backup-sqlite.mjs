import "dotenv/config";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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
assertInsideDirectory(backupPath, backupDir, "Refusing to write a backup outside backups/.");

await mkdir(backupDir, { recursive: true });

const prisma = new PrismaClient();
try {
  const sqlitePath = backupPath.replaceAll("\\", "/").replaceAll("'", "''");
  await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlitePath}'`);
  await chmod(backupPath, 0o600);

  const backupUrl = `file:${backupPath.replaceAll("\\", "/")}`;
  const verifier = new PrismaClient({ datasources: { db: { url: backupUrl } } });
  let counts;
  let integrity;
  try {
    integrity = await verifier.$queryRawUnsafe("PRAGMA integrity_check");
    counts = {
      automationDeliveries: await verifier.leadAutomationDelivery.count(),
      leads: await verifier.lead.count(),
      projects: await verifier.project.count(),
      services: await verifier.service.count(),
      users: await verifier.user.count(),
    };
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
