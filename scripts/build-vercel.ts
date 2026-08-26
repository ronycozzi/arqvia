import { spawnSync } from "node:child_process";
import { resolveVercelBuildScript } from "./vercel-build-policy";

function main() {
  const script = resolveVercelBuildScript(process.env.VERCEL_ENV);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  console.log(`Vercel ${process.env.VERCEL_ENV} build: npm run ${script}`);
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
