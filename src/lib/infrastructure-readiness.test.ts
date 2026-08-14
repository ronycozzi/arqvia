import { describe, expect, it } from "vitest";
import { getInfrastructureReadiness } from "./infrastructure-readiness";

describe("getInfrastructureReadiness", () => {
  it("flags local-only infrastructure", () => {
    expect(
      getInfrastructureReadiness({
        DATABASE_URL: "file:./dev.db",
        MEDIA_STORAGE_PROVIDER: "local",
        RATE_LIMIT_STORE: "memory",
      }),
    ).toEqual({
      distributedRateLimitReady: false,
      persistentMediaStorageReady: false,
      productionDatabaseReady: false,
      trustedProxyReady: false,
    });
  });

  it("recognizes a configured PostgreSQL, S3 and database rate-limit stack", () => {
    expect(
      getInfrastructureReadiness({
        DATABASE_URL: "postgresql://user:pass@db.example.com/arqvia",
        MEDIA_STORAGE_PROVIDER: "s3",
        RATE_LIMIT_STORE: "database",
        TRUST_PROXY_PROVIDER: "cloudflare",
        S3_ACCESS_KEY_ID: "key",
        S3_BUCKET: "arqvia-media",
        S3_PUBLIC_BASE_URL: "https://media.arqvia.com.ar",
        S3_REGION: "auto",
        S3_SECRET_ACCESS_KEY: "secret",
      }),
    ).toEqual({
      distributedRateLimitReady: true,
      persistentMediaStorageReady: true,
      productionDatabaseReady: true,
      trustedProxyReady: true,
    });
  });
});
