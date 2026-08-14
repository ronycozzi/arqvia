import { afterEach, describe, expect, it } from "vitest";
import {
  buildRateLimitKey,
  clearRateLimit,
  getClientIp,
  rateLimit,
  releaseRateLimitReservation,
} from "./rate-limit";

describe("rateLimit", () => {
  const key = "test:memory-rate-limit";

  afterEach(async () => {
    delete process.env.RATE_LIMIT_STORE;
    delete process.env.TRUST_PROXY_PROVIDER;
    await clearRateLimit(key);
  });

  it("ignores spoofable forwarding headers unless a trusted proxy is configured", () => {
    const request = new Request("https://arqvia.test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    expect(getClientIp(request)).toBe("untrusted-proxy");
  });

  it("reads the provider-owned address behind a configured reverse proxy", () => {
    process.env.TRUST_PROXY_PROVIDER = "cloudflare";
    const request = new Request("https://arqvia.test", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.44",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("never trusts generic forwarding headers", () => {
    process.env.TRUST_PROXY_PROVIDER = "generic";
    const first = new Request("https://arqvia.test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const second = new Request("https://arqvia.test", {
      headers: { "x-real-ip": "198.51.100.44" },
    });

    expect(getClientIp(first)).toBe("untrusted-proxy");
    expect(getClientIp(second)).toBe("untrusted-proxy");
  });

  it("does not persist raw contact data in rate-limit keys", () => {
    const email = "persona@example.com";
    const emailKey = buildRateLimitKey("lead:email", email);
    const phoneKey = buildRateLimitKey("lead:phone", email);

    expect(emailKey).not.toContain(email);
    expect(emailKey).toBe(buildRateLimitKey("lead:email", email));
    expect(phoneKey).not.toBe(emailKey);
  });

  it("allows requests until the configured in-memory limit", async () => {
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect(await rateLimit(key, 2, 60_000)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("releases only the current in-memory reservation", async () => {
    await rateLimit(key, 2, 60_000);
    await rateLimit(key, 2, 60_000);
    await releaseRateLimitReservation(key);

    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(false);
  });

  it("persists limits in the database when configured for multiple instances", async () => {
    const databaseKey = `${key}:database:${Date.now()}`;
    process.env.RATE_LIMIT_STORE = "database";

    try {
      expect((await rateLimit(databaseKey, 1, 60_000)).allowed).toBe(true);
      expect(await rateLimit(databaseKey, 1, 60_000)).toMatchObject({
        allowed: false,
        remaining: 0,
      });
    } finally {
      await clearRateLimit(databaseKey);
      delete process.env.RATE_LIMIT_STORE;
    }
  });
});
