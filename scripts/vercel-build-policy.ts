export type VercelBuildTarget = "preview" | "production";

export function resolveVercelBuildScript(
  target: string | undefined,
): "build:postgres" | "build:release" {
  if (target === "preview") return "build:postgres";
  if (target === "production") return "build:release";

  throw new Error(
    "VERCEL_ENV must be preview or production before running the Vercel build.",
  );
}
