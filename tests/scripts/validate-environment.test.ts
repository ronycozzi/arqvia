import {
  validateProductionEnvironment,
  type Environment,
} from "../../scripts/validate-environment";
import { describe, expect, it } from "vitest";

const validEnvironment: Environment = {
  ARQVIA_STRICT_PUBLIC_URL: "true",
  AUTH_SECRET: "a-private-production-secret-with-more-than-32-characters-2026",
  AUTH_URL: "https://arqvia.com.ar",
  DATABASE_URL: "postgresql://user:password@db.example.net:5432/arqvia",
  DATA_RETENTION_CRON_SECRET: "",
  LEAD_RETENTION_BATCH_SIZE: "25",
  LEAD_RETENTION_DAYS: "730",
  LEAD_RETENTION_ENABLED: "false",
  MEDIA_STORAGE_PROVIDER: "s3",
  NEXT_PUBLIC_ANALYTICS_ID: "G-ABCD1234",
  NEXT_PUBLIC_ANALYTICS_PROVIDER: "ga4",
  NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "5493517778899",
  PRIVATE_OBJECT_DELETION_CRON_SECRET:
    "private-object-deletion-worker-secret-2026",
  RATE_LIMIT_STORE: "database",
  S3_ACCESS_KEY_ID: "access-key",
  S3_BUCKET: "arqvia-media",
  S3_PUBLIC_BASE_URL: "https://media.arqvia.com.ar",
  S3_REGION: "auto",
  S3_SECRET_ACCESS_KEY: "a-private-storage-secret-with-more-than-32-characters",
  TRUST_PROXY_PROVIDER: "cloudflare",
};

describe("production environment validation", () => {
  it("accepts a complete production configuration", () => {
    expect(validateProductionEnvironment(validEnvironment).every((item) => item.ok)).toBe(true);
  });

  it("blocks local database, origins, bootstrap credentials, and weak controls", () => {
    const checks = validateProductionEnvironment({
      ...validEnvironment,
      ADMIN_PASSWORD: "ChangeMe123!",
      ARQVIA_ALLOW_PRODUCTION_SEED: "true",
      AUTH_SECRET: "change-me",
      AUTH_URL: "http://localhost:3000",
      DATABASE_URL: "file:./dev.db",
      MEDIA_STORAGE_PROVIDER: "local",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      RATE_LIMIT_STORE: "memory",
    });

    expect(checks.filter((item) => !item.ok).map((item) => item.id)).toEqual([
      "ENV-URL-001",
      "ENV-AUTH-001",
      "ENV-DB-001",
      "ENV-STORAGE-001",
      "ENV-ABUSE-001",
    ]);
  });

  it("does not expose secret values in check details", () => {
    const secret = "a-private-production-secret-with-more-than-32-characters-2026";
    const checks = validateProductionEnvironment({
      ...validEnvironment,
      AUTH_SECRET: secret,
      DATABASE_URL: "file:./dev.db",
    });

    expect(JSON.stringify(checks)).not.toContain(secret);
  });

  it("rejects public and auth URLs that are not bare origins", () => {
    const checks = validateProductionEnvironment({
      ...validEnvironment,
      AUTH_URL: "https://arqvia.com.ar/admin",
      NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar/web",
    });

    expect(checks.find((item) => item.id === "ENV-URL-001")?.ok).toBe(false);
  });

  it("requires an explicit retention policy even when retention is disabled", () => {
    const missingRetentionDays = { ...validEnvironment };
    delete missingRetentionDays.LEAD_RETENTION_DAYS;
    const checks = validateProductionEnvironment(missingRetentionDays);

    expect(checks.find((item) => item.id === "ENV-RETENTION-001")?.ok).toBe(
      false,
    );
  });
});
