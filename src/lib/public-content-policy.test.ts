import { describe, expect, it } from "vitest";
import {
  canUseSeedContent,
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "./public-content-policy";

describe("public content policy", () => {
  it("keeps seed content available for local preview", () => {
    const env = { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };

    expect(canUseSeedContent(env)).toBe(true);
    expect(seedCollectionOrEmpty(["seed"], env)).toEqual(["seed"]);
    expect(fallbackPublicContent("projects", ["seed"], undefined, env)).toEqual([
      "seed",
    ]);
  });

  it("never substitutes seed content in strict publication mode", () => {
    const env = { ARQVIA_STRICT_PUBLIC_URL: "true" };

    expect(canUseSeedContent(env)).toBe(false);
    expect(seedCollectionOrEmpty(["seed"], env)).toEqual([]);
    expect(() =>
      fallbackPublicContent("projects", ["seed"], new Error("db"), env),
    ).toThrow("Public content source unavailable: projects");
  });

  it("treats production hosting providers as strict publication contexts", () => {
    expect(canUseSeedContent({ NODE_ENV: "production" })).toBe(false);
    expect(canUseSeedContent({ VERCEL_ENV: "production" })).toBe(false);
    expect(
      canUseSeedContent({ NETLIFY: "true", CONTEXT: "production" }),
    ).toBe(false);
  });
});
