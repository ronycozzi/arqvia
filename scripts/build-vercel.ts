import { spawnSync } from "node:child_process";
import {
  releaseGateApplies,
  resolveVercelBuildScript,
} from "./vercel-build-policy";

function main() {
  const script = resolveVercelBuildScript(process.env.VERCEL_ENV);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  console.log(`Vercel ${process.env.VERCEL_ENV} build: npm run ${script}`);
  if (process.env.VERCEL_ENV === "production" && !releaseGateApplies()) {
    console.log(
      "El sitio se publica en un subdominio de Vercel: la compuerta de release " +
        "queda para cuando NEXT_PUBLIC_SITE_URL apunte al dominio definitivo.",
    );
  }
  const result = spawnSync(npmCommand, ["run", script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm run ${script} failed.`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Vercel build failed.");
  process.exitCode = 1;
}
