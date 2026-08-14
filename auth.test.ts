import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildRateLimitKey: vi.fn((scope: string, value: string) => `${scope}:${value}`),
  clearRateLimit: vi.fn(),
  compare: vi.fn(),
  findUnique: vi.fn(),
  getClientIp: vi.fn(() => "203.0.113.5"),
  nextAuth: vi.fn((config: unknown) => {
    void config;
    return {
      auth: vi.fn(),
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
  rateLimit: vi.fn(),
  releaseRateLimitReservation: vi.fn(),
}));

vi.mock("next-auth", () => ({ default: mocks.nextAuth }));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => config),
}));
vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));
vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));
vi.mock("@/lib/rate-limit", () => ({
  buildRateLimitKey: mocks.buildRateLimitKey,
  clearRateLimit: mocks.clearRateLimit,
  getClientIp: mocks.getClientIp,
  rateLimit: mocks.rateLimit,
  releaseRateLimitReservation: mocks.releaseRateLimitReservation,
}));
vi.mock("bcryptjs", () => ({ compare: mocks.compare }));
vi.mock("@/lib/server-env", () => ({
  serverEnv: { AUTH_SECRET: "test-auth-secret-with-enough-length" },
}));

await import("./auth");

describe("admin authentication configuration", () => {
  beforeEach(() => {
    mocks.clearRateLimit.mockReset();
    mocks.compare.mockReset();
    mocks.findUnique.mockReset();
    mocks.rateLimit.mockReset();
    mocks.releaseRateLimitReservation.mockReset();
    mocks.rateLimit.mockResolvedValue({ allowed: true });
  });

  it("expires JWT sessions after eight hours", () => {
    expect(mocks.nextAuth).toHaveBeenCalledOnce();

    const [config] = mocks.nextAuth.mock.calls[0] as [
      { session: { maxAge: number; strategy: string } },
    ];
    expect(config.session).toEqual({
      strategy: "jwt",
      maxAge: 8 * 60 * 60,
    });
  });

  it("clears only the successful account bucket and preserves the shared IP limit", async () => {
    mocks.findUnique.mockResolvedValue({
      active: true,
      email: "admin@arqvia.local",
      id: "admin-1",
      image: null,
      name: "Admin",
      passwordHash: "hash",
      role: "ADMIN",
      sessionVersion: 0,
    });
    mocks.compare.mockResolvedValue(true);
    const [config] = mocks.nextAuth.mock.calls[0] as [
      {
        providers: Array<{
          authorize: (credentials: unknown, request: Request) => Promise<unknown>;
        }>;
      },
    ];

    await config.providers[0].authorize(
      { email: "Admin@Arqvia.local", password: "ChangeMe123!" },
      new Request("https://arqvia.test/admin/login"),
    );

    expect(mocks.clearRateLimit).toHaveBeenCalledOnce();
    expect(mocks.clearRateLimit).toHaveBeenCalledWith(
      "admin-login:email:admin@arqvia.local",
    );
    expect(mocks.clearRateLimit).not.toHaveBeenCalledWith(
      "admin-login:ip:203.0.113.5",
    );
    expect(mocks.rateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.releaseRateLimitReservation).toHaveBeenCalledWith(
      "admin-login:ip:203.0.113.5",
    );
  });

  it("reserves both account and IP buckets before checking invalid credentials", async () => {
    mocks.findUnique.mockResolvedValue({
      active: true,
      email: "admin@arqvia.local",
      id: "admin-1",
      image: null,
      name: "Admin",
      passwordHash: "hash",
      role: "ADMIN",
      sessionVersion: 0,
    });
    mocks.compare.mockResolvedValue(false);
    const [config] = mocks.nextAuth.mock.calls[0] as [
      {
        providers: Array<{
          authorize: (credentials: unknown, request: Request) => Promise<unknown>;
        }>;
      },
    ];

    await config.providers[0].authorize(
      { email: "admin@arqvia.local", password: "Incorrect123!" },
      new Request("https://arqvia.test/admin/login"),
    );

    expect(mocks.rateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      "admin-login:ip:203.0.113.5",
      8,
      15 * 60_000,
    );
    expect(mocks.releaseRateLimitReservation).not.toHaveBeenCalled();
  });

  it("performs a password comparison for unknown accounts to reduce email timing leaks", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.compare.mockResolvedValue(false);
    const [config] = mocks.nextAuth.mock.calls[0] as [
      {
        providers: Array<{
          authorize: (credentials: unknown, request: Request) => Promise<unknown>;
        }>;
      },
    ];

    const result = await config.providers[0].authorize(
      { email: "unknown@arqvia.local", password: "Incorrect123!" },
      new Request("https://arqvia.test/admin/login"),
    );

    expect(result).toBeNull();
    expect(mocks.compare).toHaveBeenCalledOnce();
    expect(mocks.compare.mock.calls[0][1]).toMatch(/^\$2b\$12\$/);
    expect(mocks.clearRateLimit).not.toHaveBeenCalled();
    expect(mocks.releaseRateLimitReservation).not.toHaveBeenCalled();
  });

  it("does not execute bcrypt after an atomic reservation is denied", async () => {
    mocks.rateLimit
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });
    const [config] = mocks.nextAuth.mock.calls[0] as [
      {
        providers: Array<{
          authorize: (credentials: unknown, request: Request) => Promise<unknown>;
        }>;
      },
    ];

    await config.providers[0].authorize(
      { email: "admin@arqvia.local", password: "Incorrect123!" },
      new Request("https://arqvia.test/admin/login"),
    );

    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.releaseRateLimitReservation).toHaveBeenCalledWith(
      "admin-login:email:admin@arqvia.local",
    );
  });
});
