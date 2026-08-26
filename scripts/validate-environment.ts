import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  hasExplicitLeadRetentionEnvironment,
  readLeadRetentionConfig,
} from "../src/lib/lead-retention-config";

export type Environment = Record<string, string | undefined>;

export type EnvironmentCheck = {
  detail: string;
  id: string;
  label: string;
  ok: boolean;
};

const blockedHosts = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

const placeholderValues = [
  "change-me",
  "changeme",
  "development-secret",
  "replace-with",
  "example.com",
  "ci-local-secret",
  "ci-production-secret",
];

const placeholderPhones = new Set([
  "543515551234",
  "543510000000",
  "5493510000000",
  "5493515551234",
]);

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function isUsableSecret(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() || "";
  return (
    normalized.length >= 32 &&
    !placeholderValues.some((placeholder) => normalized.includes(placeholder))
  );
}

function publicOrigin(value: string | undefined) {
  try {
    const url = new URL(value || "");
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      blockedHosts.has(hostname) ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".invalid") ||
      hostname.includes("example") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function phoneIsUsable(value: string | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && !placeholderPhones.has(digits);
}

function check(id: string, label: string, ok: boolean, detail: string): EnvironmentCheck {
  return { detail, id, label, ok };
}

export function validateProductionEnvironment(env: Environment = process.env) {
  const siteOrigin = publicOrigin(env.NEXT_PUBLIC_SITE_URL);
  const authOrigin = publicOrigin(env.AUTH_URL);
  const analyticsProvider = env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim() || "";
  const analyticsId = env.NEXT_PUBLIC_ANALYTICS_ID?.trim() || "";
  const analyticsReady =
    (analyticsProvider === "ga4" && /^G-[A-Z0-9]{4,20}$/i.test(analyticsId)) ||
    (analyticsProvider === "gtm" && /^GTM-[A-Z0-9]{4,20}$/i.test(analyticsId));
  const postgresUrl = /^(?:postgres|postgresql):\/\/\S+$/i.test(
    env.DATABASE_URL?.trim() || "",
  );
  const publicStorageOrigin = publicOrigin(env.S3_PUBLIC_BASE_URL);
  const storageReady =
    env.MEDIA_STORAGE_PROVIDER === "s3" &&
    hasValue(env.S3_BUCKET) &&
    hasValue(env.S3_REGION) &&
    hasValue(env.S3_ACCESS_KEY_ID) &&
    isUsableSecret(env.S3_SECRET_ACCESS_KEY) &&
    Boolean(publicStorageOrigin) &&
    isUsableSecret(env.PRIVATE_OBJECT_DELETION_CRON_SECRET);
  const retention = readLeadRetentionConfig(env);
  const retentionReady =
    hasExplicitLeadRetentionEnvironment(env) &&
    retention.issues.length === 0 &&
    (!retention.enabled || retention.ready);

  return [
    check(
      "ENV-URL-001",
      "Final HTTPS origins",
      env.ARQVIA_STRICT_PUBLIC_URL === "true" &&
        Boolean(siteOrigin) &&
        siteOrigin === authOrigin,
      "Set strict public URL mode and matching HTTPS origins without credentials or query strings.",
    ),
    check(
      "ENV-AUTH-001",
      "Production authentication",
      isUsableSecret(env.AUTH_SECRET) &&
        env.ARQVIA_ALLOW_PRODUCTION_SEED !== "true" &&
        !hasValue(env.ADMIN_PASSWORD),
      "Use a private AUTH_SECRET of at least 32 characters, disable production seed, and remove ADMIN_PASSWORD.",
    ),
    check(
      "ENV-DB-001",
      "PostgreSQL database",
      postgresUrl,
      "DATABASE_URL must point to PostgreSQL for a production release.",
    ),
    check(
      "ENV-CONTACT-001",
      "Real WhatsApp number",
      phoneIsUsable(env.NEXT_PUBLIC_WHATSAPP_NUMBER),
      "Set the real international WhatsApp number; local and placeholder numbers are blocked.",
    ),
    check(
      "ENV-STORAGE-001",
      "Persistent media storage",
      storageReady,
      "Configure S3-compatible storage, credentials, region, bucket, an HTTPS public base URL, and the private-object deletion worker secret.",
    ),
    check(
      "ENV-ANALYTICS-001",
      "Consent-ready analytics",
      analyticsReady,
      "Configure GA4 or GTM with an identifier matching the selected provider.",
    ),
    check(
      "ENV-ABUSE-001",
      "Distributed abuse controls",
      env.RATE_LIMIT_STORE === "database" &&
        ["cloudflare", "vercel"].includes(env.TRUST_PROXY_PROVIDER || ""),
      "Use database-backed rate limiting and declare a supported trusted proxy provider.",
    ),
    check(
      "ENV-RETENTION-001",
      "Explicit retention policy",
      retentionReady,
      "Set LEAD_RETENTION_ENABLED, LEAD_RETENTION_DAYS, LEAD_RETENTION_BATCH_SIZE, and DATA_RETENTION_CRON_SECRET explicitly; enabled retention also requires a strong cron secret and recorded approval.",
    ),
  ] satisfies EnvironmentCheck[];
}

export function printEnvironmentChecks(checks: EnvironmentCheck[]) {
  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "BLOCK"}  ${item.id}  ${item.label}`);
    if (!item.ok) console.log(`       ${item.detail}`);
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const checks = validateProductionEnvironment();
  printEnvironmentChecks(checks);
  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    console.error(`\nENVIRONMENT BLOCKED: ${failed.length} control(es) pendiente(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("\nENVIRONMENT READY: configuration is suitable for the production gate.");
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error("Environment validation could not complete:", error);
    process.exitCode = 1;
  });
}
