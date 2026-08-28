import { describe, expect, it } from "vitest";
import {
  createLeadWebhookSignature,
  getLeadAutomationRetryDelayMs,
  parseLeadWebhookUrl,
  readLeadAutomationConfig,
  verifyAutomationBearerToken,
} from "../src/lib/lead-automation-config";

const webhookSecret = "test-webhook-secret-".padEnd(40, "x");
const cronSecret = "test-cron-secret-".padEnd(40, "y");

describe("lead automation configuration", () => {
  it("stays disabled without reporting missing optional configuration", () => {
    const config = readLeadAutomationConfig({ NODE_ENV: "production" });

    expect(config).toMatchObject({
      captureEnabled: false,
      cronReady: false,
      dispatchEnabled: false,
      dispatchReady: false,
      enabled: false,
      endpointHost: null,
      issues: [],
      maxAttempts: 5,
      ready: false,
      timeoutMs: 8_000,
      webhookReady: false,
      webhookUrl: "",
    });
  });

  it("reports a complete HTTPS configuration as ready", () => {
    const config = readLeadAutomationConfig({
      AUTOMATION_CRON_SECRET: cronSecret,
      LEAD_AUTOMATION_ENABLED: " true ",
      LEAD_WEBHOOK_ALLOWED_HOSTS: "automation.example.test",
      LEAD_WEBHOOK_SECRET: webhookSecret,
      LEAD_WEBHOOK_URL: " https://automation.example.test/hooks/leads ",
      NODE_ENV: "production",
    });

    expect(config).toMatchObject({
      captureEnabled: true,
      cronReady: true,
      dispatchEnabled: true,
      dispatchReady: true,
      enabled: true,
      endpointHost: "automation.example.test",
      issues: [],
      ready: true,
      webhookReady: true,
      webhookUrl: "https://automation.example.test/hooks/leads",
    });
  });

  it("keeps legacy capture behavior when the new switch is omitted", () => {
    const config = readLeadAutomationConfig({
      LEAD_AUTOMATION_ENABLED: "true",
    });

    expect(config.captureEnabled).toBe(true);
    expect(config.dispatchEnabled).toBe(true);
  });

  it("captures durably while outbound dispatch is paused", () => {
    const config = readLeadAutomationConfig({
      LEAD_AUTOMATION_CAPTURE_ENABLED: "true",
      LEAD_AUTOMATION_ENABLED: "false",
      NODE_ENV: "production",
    });

    expect(config).toMatchObject({
      captureEnabled: true,
      dispatchEnabled: false,
      dispatchReady: false,
      enabled: false,
      issues: [],
      ready: false,
    });
  });

  it("allows capture to be paused independently from a ready dispatcher", () => {
    const config = readLeadAutomationConfig({
      AUTOMATION_CRON_SECRET: cronSecret,
      LEAD_AUTOMATION_CAPTURE_ENABLED: "false",
      LEAD_AUTOMATION_ENABLED: "true",
      LEAD_WEBHOOK_ALLOWED_HOSTS: "automation.example.test",
      LEAD_WEBHOOK_SECRET: webhookSecret,
      LEAD_WEBHOOK_URL: "https://automation.example.test/hooks/leads",
      NODE_ENV: "production",
    });

    expect(config).toMatchObject({
      captureEnabled: false,
      dispatchEnabled: true,
      dispatchReady: true,
    });
  });

  it("identifies every invalid requirement when automation is enabled", () => {
    const config = readLeadAutomationConfig({
      AUTOMATION_CRON_SECRET: "short-cron-secret",
      LEAD_AUTOMATION_ENABLED: "true",
      LEAD_WEBHOOK_SECRET: "short-webhook-secret",
      LEAD_WEBHOOK_URL: "http://automation.example.test/hooks/leads",
      NODE_ENV: "production",
    });

    expect(config).toMatchObject({
      cronReady: false,
      endpointHost: null,
      ready: false,
      webhookReady: false,
      webhookUrl: "",
    });
    expect(config.issues).toEqual([
      expect.stringContaining("LEAD_WEBHOOK_URL"),
      expect.stringContaining("LEAD_WEBHOOK_SECRET"),
      expect.stringContaining("AUTOMATION_CRON_SECRET"),
    ]);
  });

  it("requires an exact webhook host allowlist in production", () => {
    const missingAllowlist = readLeadAutomationConfig({
      AUTOMATION_CRON_SECRET: cronSecret,
      LEAD_AUTOMATION_ENABLED: "true",
      LEAD_WEBHOOK_SECRET: webhookSecret,
      LEAD_WEBHOOK_URL: "https://automation.example.test/hooks/leads",
      NODE_ENV: "production",
    });
    const wrongAllowlist = readLeadAutomationConfig({
      AUTOMATION_CRON_SECRET: cronSecret,
      LEAD_AUTOMATION_ENABLED: "true",
      LEAD_WEBHOOK_ALLOWED_HOSTS: "other.example.test",
      LEAD_WEBHOOK_SECRET: webhookSecret,
      LEAD_WEBHOOK_URL: "https://automation.example.test/hooks/leads",
      NODE_ENV: "production",
    });

    expect(missingAllowlist.ready).toBe(false);
    expect(wrongAllowlist.ready).toBe(false);
    expect(missingAllowlist.issues).toContainEqual(
      expect.stringContaining("LEAD_WEBHOOK_ALLOWED_HOSTS"),
    );
  });

  it.each([
    ["production HTTPS", "https://automation.example.test/hook", "production", true],
    ["development localhost HTTP", "http://localhost:4100/hook", "development", true],
    ["production localhost HTTP", "http://localhost:4100/hook", "production", false],
    ["production localhost HTTPS", "https://localhost/hook", "production", false],
    ["production loopback IP", "https://127.0.0.1/hook", "production", false],
    ["production metadata IP", "https://169.254.169.254/hook", "production", false],
    ["production IPv6 loopback", "https://[::1]/hook", "production", false],
    ["production internal hostname", "https://crm.internal/hook", "production", false],
    ["development remote HTTP", "http://automation.example.test/hook", "development", false],
  ])("applies the URL policy for %s", (_label, rawUrl, nodeEnv, accepted) => {
    const parsed = parseLeadWebhookUrl(rawUrl, nodeEnv);

    expect(Boolean(parsed)).toBe(accepted);
    if (accepted) expect(parsed?.toString()).toBe(rawUrl);
  });

  it("rejects webhook URLs containing embedded credentials", () => {
    expect(
      parseLeadWebhookUrl(
        "https://operator:password@automation.example.test/hook",
        "production",
      ),
    ).toBeNull();
  });

  it.each([
    ["defaults", {}, 5, 8_000],
    [
      "lower bounds",
      { LEAD_AUTOMATION_MAX_ATTEMPTS: "0", LEAD_WEBHOOK_TIMEOUT_MS: "999" },
      1,
      1_000,
    ],
    [
      "upper bounds",
      { LEAD_AUTOMATION_MAX_ATTEMPTS: "99", LEAD_WEBHOOK_TIMEOUT_MS: "999999" },
      10,
      20_000,
    ],
    [
      "valid values",
      { LEAD_AUTOMATION_MAX_ATTEMPTS: "7", LEAD_WEBHOOK_TIMEOUT_MS: "12500" },
      7,
      12_500,
    ],
    [
      "non-integers",
      { LEAD_AUTOMATION_MAX_ATTEMPTS: "2.5", LEAD_WEBHOOK_TIMEOUT_MS: "invalid" },
      5,
      8_000,
    ],
  ])("uses bounded numeric environment values for %s", (_label, env, attempts, timeout) => {
    const config = readLeadAutomationConfig(env);

    expect(config.maxAttempts).toBe(attempts);
    expect(config.timeoutMs).toBe(timeout);
  });
});

describe("lead automation request authentication", () => {
  it("creates the expected timestamped SHA-256 HMAC header", () => {
    const body = '{"event":"lead.created","leadId":"lead_123"}';

    expect(createLeadWebhookSignature(body, webhookSecret, 1_750_000_000)).toBe(
      "t=1750000000,v1=4da5ba052f7bd01ffe39dd346684dcdd27e586a9a48d40ad3a5b69248b04affc",
    );
  });

  it("accepts only the configured bearer secret", () => {
    expect(verifyAutomationBearerToken(`Bearer ${cronSecret}`, cronSecret)).toBe(true);
    expect(verifyAutomationBearerToken(null, cronSecret)).toBe(false);
    expect(verifyAutomationBearerToken(`Basic ${cronSecret}`, cronSecret)).toBe(false);
    expect(
      verifyAutomationBearerToken(`Bearer ${"x".repeat(32)}`, cronSecret),
    ).toBe(false);
    expect(verifyAutomationBearerToken("Bearer short", "short")).toBe(false);
  });
});

describe("lead automation retries", () => {
  it("uses the fixed retry schedule and clamps attempts outside it", () => {
    expect(
      [1, 2, 3, 4, 5].map((attempts) =>
        getLeadAutomationRetryDelayMs(attempts),
      ),
    ).toEqual([60_000, 300_000, 900_000, 3_600_000, 21_600_000]);
    expect(getLeadAutomationRetryDelayMs(0)).toBe(60_000);
    expect(getLeadAutomationRetryDelayMs(99)).toBe(21_600_000);
  });
});
