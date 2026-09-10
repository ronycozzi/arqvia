import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

type ReleaseEvidence = {
  sourceRevision: string | null;
  stateFingerprint: string;
};

function gitOutput(args: string[]) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed.`);
  }
  return result.stdout.trim();
}

/**
 * Vercel construye desde un tarball del commit, sin `.git`.
 *
 * Las comprobaciones de git de esta compuerta existen para impedir que un
 * artefacto de producción salga de un árbol de trabajo sucio. En un contenedor
 * recién creado por el proveedor no hay árbol sucio posible: el checkout ES el
 * commit, y el proveedor dice cuál en `VERCEL_GIT_COMMIT_SHA`. Sin esta
 * distinción el build fallaba en la primera línea —`git rev-parse HEAD`— y el
 * proyecto no podía desplegar a producción.
 */
function gitDisponible() {
  const result = spawnSync("git", ["rev-parse", "--git-dir"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return result.status === 0;
}

function providerRevision() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    process.env.ARQVIA_RELEASE_SOURCE_REVISION?.trim() ||
    null
  );
}

function resolveSourceRevision() {
  const provider = providerRevision();

  if (!gitDisponible()) {
    if (!provider) {
      throw new Error(
        "Sin repositorio Git, la revisión tiene que venir del proveedor " +
          "(VERCEL_GIT_COMMIT_SHA, GITHUB_SHA o ARQVIA_RELEASE_SOURCE_REVISION).",
      );
    }
    return provider;
  }

  const checkoutRevision = gitOutput(["rev-parse", "HEAD"]);

  if (provider && provider !== checkoutRevision) {
    throw new Error(
      "Release source revision does not match the checked-out commit.",
    );
  }

  const trackedChanges = gitOutput([
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
    !provider &&
    gitOutput(["status", "--porcelain", "--untracked-files=all"])
  ) {
    throw new Error(
      "A local production release build requires a clean Git worktree or an explicit provider revision.",
    );
  }

  return provider || checkoutRevision;
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
    // Igual que arriba: sin repositorio no hay nada que comparar, y la huella
    // de estado que se verifica más abajo sigue cubriendo el caso.
    if (
      gitDisponible() &&
      gitOutput(["status", "--porcelain", "--untracked-files=no"])
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
