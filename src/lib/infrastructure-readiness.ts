import { getMediaStorageStatus } from "@/lib/media-storage";

export type InfrastructureReadiness = {
  distributedRateLimitReady: boolean;
  persistentMediaStorageReady: boolean;
  productionDatabaseReady: boolean;
  trustedProxyReady: boolean;
};

export function getInfrastructureReadiness(
  env: Record<string, string | undefined> = process.env,
): InfrastructureReadiness {
  const databaseUrl = env.DATABASE_URL?.trim().toLowerCase() || "";
  const mediaStorage = getMediaStorageStatus(env);

  return {
    distributedRateLimitReady: env.RATE_LIMIT_STORE === "database",
    persistentMediaStorageReady: mediaStorage.persistent,
    productionDatabaseReady:
      databaseUrl.startsWith("postgresql://") ||
      databaseUrl.startsWith("postgres://"),
    trustedProxyReady:
      env.TRUST_PROXY_PROVIDER === "cloudflare" ||
      env.TRUST_PROXY_PROVIDER === "vercel" ||
      Boolean(env.VERCEL || env.CF_PAGES),
  };
}
