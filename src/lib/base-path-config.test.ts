import { describe, expect, it } from "vitest";
import {
  outsideBasePathRedirects,
  serverActionAllowedOrigins,
} from "./base-path-config";

const site = "https://cozziinteractive.com/arqvia-demo";

describe("outsideBasePathRedirects", () => {
  it("adds nothing at the domain root or without a public URL", () => {
    expect(outsideBasePathRedirects("", "https://arqvia.com.ar")).toEqual([]);
    expect(outsideBasePathRedirects("/arqvia-demo", "")).toEqual([]);
  });

  it("sends the old root and old paths to the public URL, outside basePath handling", () => {
    const redirects = outsideBasePathRedirects("/arqvia-demo", site);

    expect(redirects).toHaveLength(2);
    expect(redirects[0]).toEqual({
      basePath: false,
      destination: site,
      permanent: true,
      source: "/",
    });
    expect(redirects[1]).toMatchObject({
      basePath: false,
      destination: `${site}/:path`,
      permanent: true,
    });
  });

  it("never matches the prefix itself nor platform paths", () => {
    const [, catchAll] = outsideBasePathRedirects("/arqvia-demo", site);
    const pattern = catchAll.source.match(/^\/:path\((.*)\)$/)?.[1];
    expect(pattern).toBeTruthy();
    const matcher = new RegExp(`^/(${pattern})$`);

    for (const path of [
      "/arqvia-demo",
      "/arqvia-demo/servicios",
      "/arqvia-demo/_next/static/chunk.js",
      "/arqvia-demo/api/leads",
      "/_vercel/insights/script.js",
      "/.well-known/vercel/flags",
    ]) {
      expect(matcher.test(path), path).toBe(false);
    }

    for (const path of [
      "/servicios",
      "/proyectos/casa-patio",
      "/admin/login",
      "/arqvia-demo-otra",
      "/sw.js",
    ]) {
      expect(matcher.test(path), path).toBe(true);
    }
  });

  it("fails the build when the public URL does not carry the base path", () => {
    expect(() =>
      outsideBasePathRedirects("/arqvia-demo", "https://cozziinteractive.com"),
    ).toThrow(/must end with the base path/);
    expect(() => outsideBasePathRedirects("/arqvia-demo", "nope")).toThrow(
      /valid URL/,
    );
  });
});

describe("serverActionAllowedOrigins", () => {
  it("keeps Next's same-origin rule at the domain root", () => {
    expect(serverActionAllowedOrigins("", "https://arqvia.com.ar")).toEqual([]);
  });

  it("allows the public host and its www sibling under a base path", () => {
    expect(serverActionAllowedOrigins("/arqvia-demo", site)).toEqual([
      "cozziinteractive.com",
      "www.cozziinteractive.com",
    ]);
    expect(
      serverActionAllowedOrigins(
        "/arqvia-demo",
        "https://www.cozziinteractive.com/arqvia-demo",
      ),
    ).toEqual(["www.cozziinteractive.com", "cozziinteractive.com"]);
  });

  it("does not invent a www sibling for localhost", () => {
    expect(
      serverActionAllowedOrigins(
        "/arqvia-demo",
        "http://localhost:3415/arqvia-demo",
      ),
    ).toEqual(["localhost:3415"]);
  });
});
