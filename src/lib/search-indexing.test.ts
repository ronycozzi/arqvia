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
});
