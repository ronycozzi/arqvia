import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export const leadAutomationDefaults = {
  maxAttempts: 5,
  timeoutMs: 8_000,
} as const;

type AutomationEnvironment = Record<string, string | undefined>;

export type LeadAutomationConfig = {
  allowedHosts: string[];
  captureEnabled: boolean;
  cronReady: boolean;
  cronSecret: string;
  dispatchEnabled: boolean;
  dispatchReady: boolean;
  // Backward-compatible alias for dispatchEnabled.
  enabled: boolean;
  endpointHost: string | null;
  issues: string[];
  maxAttempts: number;
  // Backward-compatible alias for dispatchReady.
  ready: boolean;
  timeoutMs: number;
  webhookReady: boolean;
  webhookSecret: string;
  webhookUrl: string;
};

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function isLocalHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".localhost")
  );
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function isReservedHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return (
    isIP(normalized) !== 0 ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".lan") ||
    normalized.endsWith(".home")
  );
}

function parseAllowedHosts(value: string | undefined) {
  return Array.from(
    new Set(
      (value || "")
        .split(",")
        .map((host) => normalizeHostname(host.trim()))
        .filter((host) => host && !isReservedHostname(host)),
    ),
  );
}

function isProductionContext(env: AutomationEnvironment) {
  return (
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.RENDER === "true" ||
    env.RAILWAY_ENVIRONMENT === "production" ||
    (env.NETLIFY === "true" && env.CONTEXT === "production")
  );
}

export function parseLeadWebhookUrl(
  rawUrl: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password) return null;
    const local = isLocalHostname(url.hostname);
    if (
      nodeEnv !== "production" &&
      local &&
      ["http:", "https:"].includes(url.protocol)
    ) {
      return url;
    }
    if (url.protocol === "https:" && !local && !isReservedHostname(url.hostname)) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

export function readLeadAutomationConfig(
  env: AutomationEnvironment = process.env,
): LeadAutomationConfig {
  const dispatchEnabled =
    env.LEAD_AUTOMATION_ENABLED?.trim().toLowerCase() === "true";
  const captureEnabled =
    env.LEAD_AUTOMATION_CAPTURE_ENABLED === undefined
      ? dispatchEnabled
      : env.LEAD_AUTOMATION_CAPTURE_ENABLED.trim().toLowerCase() === "true";
  const webhookUrl = env.LEAD_WEBHOOK_URL?.trim() || "";
  const webhookSecret = env.LEAD_WEBHOOK_SECRET?.trim() || "";
  const cronSecret = env.AUTOMATION_CRON_SECRET?.trim() || "";
  const allowedHosts = parseAllowedHosts(env.LEAD_WEBHOOK_ALLOWED_HOSTS);
  const parsedUrl = webhookUrl
    ? parseLeadWebhookUrl(webhookUrl, env.NODE_ENV)
    : null;
  const production = isProductionContext(env);
  const endpointHostname = parsedUrl
    ? normalizeHostname(parsedUrl.hostname)
    : null;
  const allowlistReady = Boolean(
    endpointHostname &&
      (allowedHosts.length
        ? allowedHosts.includes(endpointHostname)
        : !production),
  );
  const urlReady = Boolean(parsedUrl) && allowlistReady;
  const secretReady = webhookSecret.length >= 32;
  const cronReady = cronSecret.length >= 32;
  const issues: string[] = [];

  if (dispatchEnabled && !urlReady) {
    issues.push(
      "LEAD_WEBHOOK_URL debe usar HTTPS, un hostname público y estar incluido en LEAD_WEBHOOK_ALLOWED_HOSTS en producción; solo localhost admite HTTP fuera de producción.",
    );
  }
  if (dispatchEnabled && !secretReady) {
    issues.push("LEAD_WEBHOOK_SECRET debe tener al menos 32 caracteres.");
  }
  if (dispatchEnabled && !cronReady) {
    issues.push("AUTOMATION_CRON_SECRET debe tener al menos 32 caracteres.");
  }

  const webhookReady = urlReady && secretReady;
  const dispatchReady = dispatchEnabled && webhookReady && cronReady;
  return {
    allowedHosts,
    captureEnabled,
    cronReady,
    cronSecret,
    dispatchEnabled,
    dispatchReady,
    enabled: dispatchEnabled,
    endpointHost: parsedUrl?.host || null,
    issues,
    maxAttempts: boundedInteger(
      env.LEAD_AUTOMATION_MAX_ATTEMPTS,
      leadAutomationDefaults.maxAttempts,
      1,
      10,
    ),
    ready: dispatchReady,
    timeoutMs: boundedInteger(
      env.LEAD_WEBHOOK_TIMEOUT_MS,
      leadAutomationDefaults.timeoutMs,
      1_000,
      20_000,
    ),
    webhookReady,
    webhookSecret,
    webhookUrl: parsedUrl?.toString() || "",
  };
}

export function createLeadWebhookSignature(
  body: string,
  secret: string,
  timestampSeconds: number,
) {
  const digest = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${body}`)
    .digest("hex");
  return `t=${timestampSeconds},v1=${digest}`;
}

export function verifyAutomationBearerToken(
  authorization: string | null,
  expectedSecret: string,
) {
  if (!authorization?.startsWith("Bearer ") || expectedSecret.length < 32) {
    return false;
  }
  const supplied = authorization.slice(7).trim();
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expectedSecret);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

const retryScheduleMs = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];

export function getLeadAutomationRetryDelayMs(attempts: number) {
  const index = Math.min(
    retryScheduleMs.length - 1,
    Math.max(0, Math.trunc(attempts) - 1),
  );
  return retryScheduleMs[index];
}
