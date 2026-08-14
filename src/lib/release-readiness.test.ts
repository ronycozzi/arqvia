import { describe, expect, it } from "vitest";
import { fallbackClientConfig } from "@/lib/client-config";
import { buildReleaseGate, type ReleaseContentSnapshot } from "@/lib/release-readiness";

const content: ReleaseContentSnapshot = {
  areas: 2,
  blogPosts: 3,
  clientConfigs: 1,
  faqs: 5,
  homeContents: 1,
  institutionalPages: 2,
  localMedia: 0,
  legalPages: 4,
  projects: 3,
  publicMedia: 18,
  seedMedia: 0,
  services: 4,
  teamMembers: 1,
  testimonials: 1,
  unapprovedPublicMedia: 0,
  untrackedPublicMedia: 0,
};

const approvalEnv = {
  ARQVIA_BACKUP_RESTORE_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_BACKUP_RESTORE_APPROVED_BY: "Operaciones",
  ARQVIA_AUTOMATION_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_AUTOMATION_APPROVED_BY: "Operaciones CRM",
  ARQVIA_CONTACT_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_CONTACT_APPROVED_BY: "Comercial",
  ARQVIA_CONTENT_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_CONTENT_APPROVED_BY: "Dirección",
  ARQVIA_LEGAL_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_LEGAL_APPROVED_BY: "Asesoría legal",
  ARQVIA_MEDIA_RIGHTS_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_MEDIA_RIGHTS_APPROVED_BY: "Producción",
  ARQVIA_PWA_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_PWA_APPROVED_BY: "QA mobile",
  ARQVIA_STORAGE_APPROVED_AT: "2026-07-01T12:00:00.000Z",
  ARQVIA_STORAGE_APPROVED_BY: "Operaciones de medios",
};

describe("release gate", () => {
  it("blocks local, placeholder and unapproved releases with actionable ids", () => {
    const result = buildReleaseGate({
      config: fallbackClientConfig,
      content: { ...content, seedMedia: 4 },
      env: { DATABASE_URL: "file:./dev.db" },
      estimator: { enabled: true, version: 1 },
    });

    expect(result.ready).toBe(false);
    expect(result.failed.map((item) => item.id)).toEqual(
      expect.arrayContaining(["RG-ENV-001", "RG-CONTENT-001", "RG-EST-001"]),
    );
  });

  it("passes only with final infrastructure, content and approvals", () => {
    const config = {
      ...fallbackClientConfig,
      address: "Córdoba Capital, Argentina",
      businessHours: "Lunes a viernes de 9 a 18",
      email: "hola@arqvia.com.ar",
      phone: "+54 351 777 8899",
      whatsapp: "5493517778899",
    };
    const result = buildReleaseGate({
      config,
      content,
      env: {
        ...approvalEnv,
        ARQVIA_STRICT_PUBLIC_URL: "true",
        AUTH_SECRET: "a-production-secret-that-is-long-and-random-2026",
        AUTH_URL: "https://arqvia.com.ar",
        DATABASE_URL: "postgresql://user:password@db/arqvia",
        LEAD_AUTOMATION_CAPTURE_ENABLED: "true",
        LEAD_AUTOMATION_ENABLED: "false",
        MEDIA_STORAGE_PROVIDER: "s3",
        NEXT_PUBLIC_ANALYTICS_ID: "G-ARQVIA2026",
        NEXT_PUBLIC_ANALYTICS_PROVIDER: "ga4",
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
        NEXT_PUBLIC_WHATSAPP_NUMBER: "5493517778899",
        RATE_LIMIT_STORE: "database",
        S3_ACCESS_KEY_ID: "access-key",
        S3_BUCKET: "arqvia-media",
        S3_PUBLIC_BASE_URL: "https://media.arqvia.com.ar",
        S3_REGION: "auto",
        S3_SECRET_ACCESS_KEY: "private-key",
        TRUST_PROXY_PROVIDER: "vercel",
      },
      estimator: { enabled: false, version: 1 },
    });

    expect(result.failed).toEqual([]);
    expect(result.ready).toBe(true);
  });

  it("blocks public media without per-resource approval or library traceability", () => {
    const result = buildReleaseGate({
      config: fallbackClientConfig,
      content: {
        ...content,
        unapprovedPublicMedia: 3,
        untrackedPublicMedia: 1,
      },
      env: approvalEnv,
      estimator: { enabled: false, version: 1 },
    });

    const mediaCheck = result.failed.find((item) => item.id === "RG-MEDIA-001");
    expect(mediaCheck?.detail).toContain("3 de 18");
    expect(mediaCheck?.detail).toContain("1 referencia");
  });

  it("blocks release until all four legal documents are published", () => {
    const result = buildReleaseGate({
      config: fallbackClientConfig,
      content: { ...content, legalPages: 3 },
      env: approvalEnv,
      estimator: { enabled: false, version: 1 },
    });

    expect(result.failed.map((item) => item.id)).toContain("RG-LEGAL-001");
  });

  it("blocks release when the governed home content is missing", () => {
    const result = buildReleaseGate({
      config: fallbackClientConfig,
      content: { ...content, homeContents: 0 },
      env: approvalEnv,
      estimator: { enabled: false, version: 1 },
    });

    expect(result.failed.map((item) => item.id)).toContain("RG-CONTENT-001");
  });

  it("blocks release when a governed institutional page is missing", () => {
    const result = buildReleaseGate({
      config: fallbackClientConfig,
      content: { ...content, institutionalPages: 1 },
      env: approvalEnv,
      estimator: { enabled: false, version: 1 },
    });

    expect(result.failed.map((item) => item.id)).toContain("RG-CONTENT-001");
  });

  it("blocks an untracked public media reference even when approvals are otherwise complete", () => {
    const result = buildReleaseGate({
      config: fallbackClientConfig,
      content: {
        ...content,
        unapprovedPublicMedia: 0,
        untrackedPublicMedia: 1,
      },
      env: approvalEnv,
      estimator: { enabled: false, version: 1 },
    });

    expect(result.failed.find((item) => item.id === "RG-MEDIA-001")?.detail).toContain(
      "1 referencia",
    );
  });

  it("blocks an unconfigured dispatcher but not capture-only operation", () => {
    const baseInput = {
      config: fallbackClientConfig,
      content,
      estimator: { enabled: false, version: 1 },
    };
    const captureOnly = buildReleaseGate({
      ...baseInput,
      env: {
        LEAD_AUTOMATION_CAPTURE_ENABLED: "true",
        LEAD_AUTOMATION_ENABLED: "false",
      },
    });
    const invalidDispatch = buildReleaseGate({
      ...baseInput,
      env: {
        LEAD_AUTOMATION_CAPTURE_ENABLED: "true",
        LEAD_AUTOMATION_ENABLED: "true",
      },
    });

    expect(captureOnly.failed.map((item) => item.id)).not.toContain(
      "RG-AUTOMATION-001",
    );
    expect(invalidDispatch.failed.map((item) => item.id)).toContain(
      "RG-AUTOMATION-001",
    );
  });

  it("blocks enabled retention without a strong cron secret and approval", () => {
    const baseInput = {
      config: fallbackClientConfig,
      content,
      estimator: { enabled: false, version: 1 },
    };
    const disabled = buildReleaseGate({
      ...baseInput,
      env: { LEAD_RETENTION_ENABLED: "false" },
    });
    const enabledWithoutApproval = buildReleaseGate({
      ...baseInput,
      env: {
        DATA_RETENTION_CRON_SECRET: "a-strong-retention-secret-with-32-characters",
        LEAD_RETENTION_ENABLED: "true",
      },
    });
    const enabledAndApproved = buildReleaseGate({
      ...baseInput,
      env: {
        ARQVIA_RETENTION_APPROVED_AT: "2026-07-01T12:00:00.000Z",
        ARQVIA_RETENTION_APPROVED_BY: "Asesoria legal",
        DATA_RETENTION_CRON_SECRET: "a-strong-retention-secret-with-32-characters",
        LEAD_RETENTION_ENABLED: "true",
      },
    });

    expect(disabled.failed.map((item) => item.id)).not.toContain(
      "RG-RETENTION-001",
    );
    expect(enabledWithoutApproval.failed.map((item) => item.id)).toContain(
      "RG-RETENTION-001",
    );
    expect(enabledAndApproved.failed.map((item) => item.id)).not.toContain(
      "RG-RETENTION-001",
    );
  });
});
