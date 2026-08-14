import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

function loadEnv() {
  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    process.env[key] ||= rawValue.replace(/^"|"$/g, "");
  }
}

function assertSafeSqliteUrl() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  if (!url.startsWith("file:")) {
    throw new Error(
      "db:init only supports a local SQLite DATABASE_URL beginning with file:. Use db:postgres:deploy for PostgreSQL.",
    );
  }

  const sqlitePath = url.replace("file:", "");
  const absolute = resolve("prisma", sqlitePath);
  const prismaDir = resolve("prisma");
  const pathFromPrisma = relative(prismaDir, absolute);
  if (
    pathFromPrisma === ".." ||
    pathFromPrisma.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(pathFromPrisma)
  ) {
    throw new Error("Refusing to initialize a SQLite database outside prisma/.");
  }
}

loadEnv();
assertSafeSqliteUrl();
const prismaCli = resolve("node_modules", "prisma", "build", "index.js");
const tsxCli = resolve("node_modules", "tsx", "dist", "cli.mjs");

execFileSync(process.execPath, [prismaCli, "db", "push"], {
  stdio: "inherit",
});

execFileSync(process.execPath, [tsxCli, "scripts/backfill-lead-activity.ts"], {
  stdio: "inherit",
});

execFileSync(process.execPath, [tsxCli, "scripts/backfill-lead-identities.ts"], {
  stdio: "inherit",
});

execFileSync(process.execPath, [tsxCli, "scripts/backfill-technical-visits.ts"], {
  stdio: "inherit",
});

console.log("Database schema is ready. Run npm run db:seed to load Arqvia content.");
