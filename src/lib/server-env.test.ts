import { afterEach, describe, expect, it, vi } from "vitest";

const baseEnv = {
  AUTH_SECRET: "local-secret-with-enough-length",
  DATABASE_URL: "file:./dev.db",
};

async function loadValidator() {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", baseEnv.AUTH_SECRET);
  vi.stubEnv("DATABASE_URL", baseEnv.DATABASE_URL);
  const serverEnvModule = await import("./server-env");
  return serverEnvModule.validateServerEnv;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validateServerEnv", () => {
  it("allows a local development secret outside strict mode", async () => {
    const validateServerEnv = await loadValidator();
    const env = validateServerEnv({ ...baseEnv, NODE_ENV: "development" });

    expect(env.AUTH_SECRET).toBe(baseEnv.AUTH_SECRET);
  });

  it("rejects placeholder secrets in strict production mode", async () => {
    const validateServerEnv = await loadValidator();

    expect(() =>
      validateServerEnv({
        ...baseEnv,
        ARQVIA_STRICT_PUBLIC_URL: "true",
        AUTH_SECRET: "replace-with-a-long-random-secret",
      }),
    ).toThrow(/AUTH_SECRET must be a unique production secret/);
  });

  it("accepts strong secrets in strict production mode", async () => {
    const validateServerEnv = await loadValidator();
    const strongSecret = "arqvia-production-secret-64-characters-minimum-value-2026";
    const env = validateServerEnv({
      ...baseEnv,
      ARQVIA_STRICT_PUBLIC_URL: "true",
      AUTH_SECRET: strongSecret,
      RATE_LIMIT_STORE: "database",
    });

    expect(env.AUTH_SECRET).toBe(strongSecret);
  });

  it("rejects unknown rate limit stores", async () => {
    const validateServerEnv = await loadValidator();

    expect(() =>
      validateServerEnv({
        ...baseEnv,
        RATE_LIMIT_STORE: "redis-without-an-adapter",
      }),
    ).toThrow(/RATE_LIMIT_STORE/);
  });

  it("allows a local Next production build outside a release context", async () => {
    const validateServerEnv = await loadValidator();

    expect(
      validateServerEnv({ ...baseEnv, NODE_ENV: "production" }).AUTH_SECRET,
    ).toBe(baseEnv.AUTH_SECRET);
  });

  it("enables strict validation for an explicit production release", async () => {
    const validateServerEnv = await loadValidator();

    expect(() =>
      validateServerEnv({
        ...baseEnv,
        ARQVIA_PRODUCTION_RELEASE: "true",
        AUTH_SECRET: "replace-with-a-long-random-secret",
      }),
    ).toThrow(/AUTH_SECRET must be a unique production secret/);
  });

  it("rejects memory-only rate limiting in production", async () => {
    const validateServerEnv = await loadValidator();

    expect(() =>
      validateServerEnv({
        ...baseEnv,
        AUTH_SECRET: "arqvia-production-secret-64-characters-minimum-value-2026",
        ARQVIA_PRODUCTION_RELEASE: "true",
        RATE_LIMIT_STORE: "memory",
      }),
    ).toThrow(/RATE_LIMIT_STORE must be database in production/);
  });

  it("rejects known default admin credentials in production", async () => {
    const validateServerEnv = await loadValidator();

    expect(() =>
      validateServerEnv({
        ...baseEnv,
        ADMIN_EMAIL: "admin@arqvia.local",
        AUTH_SECRET: "arqvia-production-secret-64-characters-minimum-value-2026",
        ARQVIA_PRODUCTION_RELEASE: "true",
        RATE_LIMIT_STORE: "database",
      }),
    ).toThrow(/Known default admin credentials/);
  });

  it("rejects unknown trusted proxy modes", async () => {
    const validateServerEnv = await loadValidator();

    expect(() =>
      validateServerEnv({
        ...baseEnv,
        TRUST_PROXY_PROVIDER: "accept-anything",
      }),
    ).toThrow(/TRUST_PROXY_PROVIDER/);
  });
});
