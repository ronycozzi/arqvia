import { describe, expect, it } from "vitest";
import {
  defaultAdminEmail,
  defaultAdminPassword,
  resolveSeedAdminCredentials,
} from "@/lib/seed-safety";

describe("resolveSeedAdminCredentials", () => {
  it("keeps the documented defaults for local SQLite setup", () => {
    expect(
      resolveSeedAdminCredentials({ DATABASE_URL: "file:./dev.db" }),
    ).toEqual({
      email: defaultAdminEmail,
      password: defaultAdminPassword,
      production: false,
    });
  });

  it("blocks PostgreSQL seeding unless it is explicitly authorized", () => {
    expect(() =>
      resolveSeedAdminCredentials({
        ADMIN_EMAIL: "owner@arqvia.com.ar",
        ADMIN_PASSWORD: "a-strong-bootstrap-password",
        DATABASE_URL: "postgresql://db/arqvia",
      }),
    ).toThrow(/Production seeding is disabled/);
  });

  it.each([
    { ADMIN_EMAIL: defaultAdminEmail, ADMIN_PASSWORD: "a-strong-bootstrap-password" },
    { ADMIN_EMAIL: "owner@arqvia.com.ar", ADMIN_PASSWORD: defaultAdminPassword },
  ])("rejects known production defaults", (credentials) => {
    expect(() =>
      resolveSeedAdminCredentials({
        ...credentials,
        ARQVIA_ALLOW_PRODUCTION_SEED: "true",
        DATABASE_URL: "postgresql://db/arqvia",
      }),
    ).toThrow(/Known default or placeholder admin credentials/);
  });

  it("requires explicit strong credentials for an authorized production seed", () => {
    expect(
      resolveSeedAdminCredentials({
        ADMIN_EMAIL: "owner@arqvia.com.ar",
        ADMIN_PASSWORD: "a-strong-bootstrap-password",
        ARQVIA_ALLOW_PRODUCTION_SEED: "true",
        DATABASE_URL: "postgresql://db/arqvia",
      }),
    ).toEqual({
      email: "owner@arqvia.com.ar",
      password: "a-strong-bootstrap-password",
      production: true,
    });
  });
});
