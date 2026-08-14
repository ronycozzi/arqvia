import { z } from "zod";

const serverEnvSchema = z.object({
  AUTH_SECRET: z
    .string()
    .trim()
    .min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_URL: z.string().trim().url().optional(),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  PRISMA_LOG_QUERIES: z.enum(["true", "false"]).default("false"),
  RATE_LIMIT_STORE: z.enum(["memory", "database"]).default("memory"),
  TRUST_PROXY_PROVIDER: z
    .enum(["none", "cloudflare", "vercel"])
    .default("none"),
});

type ServerEnvRaw = Record<string, string | undefined>;

const placeholderSecrets = new Set([
  "replace-with-a-long-random-secret",
  "change-me",
  "changeme",
  "secret",
]);

function isStrictServerEnvContext(env: ServerEnvRaw) {
  return (
    env.NODE_ENV === "production" ||
    env.ARQVIA_STRICT_PUBLIC_URL === "true" ||
    env.VERCEL_ENV === "production" ||
    env.RENDER === "true" ||
    env.RAILWAY_ENVIRONMENT === "production" ||
    (env.NETLIFY === "true" && env.CONTEXT === "production")
  );
}

export function validateServerEnv(env: ServerEnvRaw = process.env) {
  const parsed = serverEnvSchema.safeParse({
    AUTH_SECRET: env.AUTH_SECRET,
    AUTH_URL: env.AUTH_URL || undefined,
    DATABASE_URL: env.DATABASE_URL,
    PRISMA_LOG_QUERIES: env.PRISMA_LOG_QUERIES || "false",
    RATE_LIMIT_STORE: env.RATE_LIMIT_STORE || "memory",
    TRUST_PROXY_PROVIDER: env.TRUST_PROXY_PROVIDER || "none",
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  if (isStrictServerEnvContext(env)) {
    const secret = parsed.data.AUTH_SECRET.trim();
    if (
      secret.length < 32 ||
      placeholderSecrets.has(secret.toLowerCase()) ||
      secret.toLowerCase().includes("replace-with")
    ) {
      throw new Error(
        "AUTH_SECRET must be a unique production secret with at least 32 characters before deployment.",
      );
    }
  }

  return parsed.data;
}

export const serverEnv = validateServerEnv();
