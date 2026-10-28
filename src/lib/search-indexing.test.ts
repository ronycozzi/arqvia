import { describe, expect, it } from "vitest";
import { isSearchIndexable, publicSearchRobots } from "./search-indexing";

describe("search indexing boundaries", () => {
  it("does not index preview deployments even with a public canonical domain", () => {
    expect(isSearchIndexable("https://arqvia.example", { VERCEL_ENV: "preview" })).toBe(false);
  });
  it.each(["http://localhost:3127", "http://127.0.0.1:3127", "http://arqvia.local", "invalid"])("does not index %s", (url) => {
    expect(isSearchIndexable(url, {})).toBe(false);
  });
  it("allows the production site and useful large image previews", () => {
    expect(publicSearchRobots("https://arqvia.example", { VERCEL_ENV: "production" })).toMatchObject({ index: true, follow: true });
  });
  it("does not index or follow the declared showcase under its public base path", () => {
    const env = { VERCEL_ENV: "production", ARQVIA_DEPLOY_PROFILE: "demo", NEXT_PUBLIC_SITE_URL: "https://cozziinteractive.com/arqvia", NEXT_PUBLIC_BASE_PATH: "/arqvia" };
    expect(isSearchIndexable(env.NEXT_PUBLIC_SITE_URL, env)).toBe(false);
    expect(publicSearchRobots(env.NEXT_PUBLIC_SITE_URL, env)).toMatchObject({ index: false, follow: false });
  });
});
