import { describe, expect, it } from "vitest";
import { buildSystemReadiness } from "@/lib/system-readiness";

const productionEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://arqvia.example.com",
  DATABASE_URL: "postgresql://user:password@db.example.com/arqvia",
  MEDIA_STORAGE_PROVIDER: "s3",
  S3_BUCKET: "arqvia-media",
  S3_REGION: "us-east-1",
  S3_PUBLIC_BASE_URL: "https://media.example.com",
  S3_ACCESS_KEY_ID: "access-key",
  S3_SECRET_ACCESS_KEY: "secret-key",
  RATE_LIMIT_STORE: "database",
  PRIVATE_OBJECT_DELETION_CRON_SECRET:
    "private-object-deletion-worker-secret-2026",
  TRUST_PROXY_PROVIDER: "vercel",
  ARQVIA_STRICT_PUBLIC_URL: "true",
  NEXT_PUBLIC_ANALYTICS_PROVIDER: "ga4",
  NEXT_PUBLIC_ANALYTICS_ID: "G-ABCD1234",
  LEAD_AUTOMATION_CAPTURE_ENABLED: "true",
  LEAD_AUTOMATION_ENABLED: "true",
  LEAD_WEBHOOK_URL: "https://crm.example.com/arqvia",
  LEAD_WEBHOOK_ALLOWED_HOSTS: "crm.example.com",
  LEAD_WEBHOOK_SECRET: "w".repeat(40),
  AUTOMATION_CRON_SECRET: "c".repeat(40),
  LEAD_RETENTION_ENABLED: "false",
  ARQVIA_BACKUP_RESTORE_APPROVED_BY: "Operaciones",
  ARQVIA_BACKUP_RESTORE_APPROVED_AT: "2026-07-01T12:00:00.000Z",
};

describe("system readiness", () => {
  it("reports a fully configured production runtime without attention items", () => {
    const result = buildSystemReadiness({
      databaseConnected: true,
      env: productionEnv,
    });

    expect(result.databaseProvider).toBe("PostgreSQL");
    expect(result.environmentLabel).toBe("Producción");
    expect(result.attentionCount).toBe(0);
    expect(result.readyCount).toBe(8);
  });

  it("separates disabled local integrations from actionable infrastructure gaps", () => {
    const result = buildSystemReadiness({
      databaseConnected: true,
      env: {
        NODE_ENV: "development",
        DATABASE_URL: "file:./dev.db",
        NEXT_PUBLIC_ANALYTICS_PROVIDER: "none",
        LEAD_AUTOMATION_CAPTURE_ENABLED: "false",
        LEAD_AUTOMATION_ENABLED: "false",
      },
    });

    expect(result.databaseProvider).toBe("SQLite");
    expect(result.environmentLabel).toBe("Desarrollo local");
    expect(result.checks.find((check) => check.id === "analytics")?.state).toBe(
      "disabled",
    );
    expect(
      result.checks.find((check) => check.id === "database-persistence")?.state,
    ).toBe("attention");
    expect(result.attentionCount).toBe(3);
  });

  it("flags enabled retention until both cron and approval are present", () => {
    const result = buildSystemReadiness({
      databaseConnected: true,
      env: {
        ...productionEnv,
        LEAD_RETENTION_ENABLED: "true",
        DATA_RETENTION_CRON_SECRET: "",
      },
    });

    expect(result.checks.find((check) => check.id === "retention")?.state).toBe(
      "attention",
    );
  });
});
