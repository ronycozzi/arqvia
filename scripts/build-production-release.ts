import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

type ReleaseEvidence = {
  sourceRevision: string | null;
  stateFingerprint: string;
};

function commandOutput(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
  return result.stdout.trim();
}

function resolveSourceRevision() {
  const checkoutRevision = commandOutput("git", ["rev-parse", "HEAD"]);
  const providerRevision =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    process.env.ARQVIA_RELEASE_SOURCE_REVISION?.trim();

  if (providerRevision && providerRevision !== checkoutRevision) {
    throw new Error(
      "Release source revision does not match the checked-out commit.",
    );
  }

  const trackedChanges = commandOutput("git", [
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  if (trackedChanges) {
    throw new Error(
      "A production release build requires tracked files to match the checked-out commit.",
    );
  }

  if (
    !providerRevision &&
    commandOutput("git", ["status", "--porcelain", "--untracked-files=all"])
  ) {
    throw new Error(
      "A local production release build requires a clean Git worktree or an explicit provider revision.",
    );
  }

  return providerRevision || checkoutRevision;
}

function runNpmScript(
  name: string,
  extraEnv: Record<string, string> = {},
) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", name], {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`npm run ${name} failed.`);
  }
}

function readEvidence(evidencePath: string) {
  return JSON.parse(readFileSync(evidencePath, "utf8")) as ReleaseEvidence;
}

function main() {
  loadEnvConfig(process.cwd());
  const sourceRevision = resolveSourceRevision();
  const beforePath = path.join(
    tmpdir(),
    `arqvia-release-before-${process.pid}.json`,
  );
  const artifactPath = path.resolve(".next", "release-gate.json");
  const evidenceEnv = {
    ARQVIA_PRODUCTION_RELEASE: "true",
    ARQVIA_RELEASE_SOURCE_REVISION: sourceRevision,
  };

  try {
    // Vercel and other clean builders may have generated the default SQLite
    // client during install. Prepare the production provider before any gate
    // opens a database connection.
    runNpmScript("db:postgres:generate", evidenceEnv);
    runNpmScript("release:env", evidenceEnv);
    runNpmScript("release:check", {
      ...evidenceEnv,
      ARQVIA_RELEASE_EVIDENCE_PATH: beforePath,
    });
    runNpmScript("build:postgres", evidenceEnv);
    if (
      commandOutput("git", [
        "status",
        "--porcelain",
        "--untracked-files=no",
      ])
    ) {
      throw new Error(
        "Tracked source files changed while the release artifact was building.",
      );
    }
    runNpmScript("release:check", {
      ...evidenceEnv,
      ARQVIA_RELEASE_EVIDENCE_PATH: artifactPath,
    });

    const before = readEvidence(beforePath);
    const artifact = readEvidence(artifactPath);
    if (
      before.sourceRevision !== sourceRevision ||
      artifact.sourceRevision !== sourceRevision ||
      before.stateFingerprint !== artifact.stateFingerprint
    ) {
      rmSync(artifactPath, { force: true });
      throw new Error(
        "Release state changed while the artifact was building; rebuild from the current approved state.",
      );
    }

    console.log(
      `\nPRODUCTION BUILD READY: artifact bound to ${sourceRevision.slice(0, 12)} and the verified release state.`,
    );
  } finally {
    rmSync(beforePath, { force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Production build guard failed.",
  );
  process.exitCode = 1;
}
