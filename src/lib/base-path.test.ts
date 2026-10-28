import { describe, expect, it } from "vitest";
import {
  cookiePath,
  joinSiteUrl,
  normalizeBasePath,
  stripBasePath,
  withBasePath,
} from "./base-path";

describe("normalizeBasePath", () => {
  it("treats empty values as the domain root", () => {
    expect(normalizeBasePath(undefined)).toBe("");
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath("  ")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
  });

  it("accepts a clean prefix and drops a trailing slash", () => {
    expect(normalizeBasePath("/arqvia-demo")).toBe("/arqvia-demo");
    expect(normalizeBasePath("/arqvia-demo/")).toBe("/arqvia-demo");
    expect(normalizeBasePath("/demos/arqvia")).toBe("/demos/arqvia");
  });

  it.each(["arqvia-demo", "//evil.example", "/a b", "/a?x=1", "https://x.y/z"])(
    "rejects the malformed prefix %s",
    (value) => {
      expect(() => normalizeBasePath(value)).toThrow(/NEXT_PUBLIC_BASE_PATH/);
    },
  );
});

describe("withBasePath", () => {
  const base = "/arqvia-demo";

  it("is a no-op at the domain root", () => {
    expect(withBasePath("/api/leads", "")).toBe("/api/leads");
    expect(withBasePath("/", "")).toBe("/");
  });

  it("prefixes root-relative paths, queries and hashes", () => {
    expect(withBasePath("/", base)).toBe("/arqvia-demo");
    expect(withBasePath("/api/leads", base)).toBe("/arqvia-demo/api/leads");
    expect(withBasePath("/admin/leads?estado=NEW", base)).toBe(
      "/arqvia-demo/admin/leads?estado=NEW",
    );
    expect(withBasePath("/?origen=x", base)).toBe("/arqvia-demo?origen=x");
    expect(withBasePath("/#contacto", base)).toBe("/arqvia-demo#contacto");
  });

  it("is idempotent and does not confuse look-alike prefixes", () => {
    expect(withBasePath("/arqvia-demo", base)).toBe("/arqvia-demo");
    expect(withBasePath("/arqvia-demo/images/a.webp", base)).toBe(
      "/arqvia-demo/images/a.webp",
    );
    expect(withBasePath("/arqvia-demo-otra/x", base)).toBe(
      "/arqvia-demo/arqvia-demo-otra/x",
    );
  });

  it("leaves external and non-path values alone", () => {
    for (const value of [
      "https://media.example.com/a.webp",
      "//cdn.example.com/a.webp",
      "data:image/png;base64,AAAA",
      "blob:https://x/1",
      "#contenido",
      "mailto:hola@arqvia.com.ar",
      "relative/path",
      "",
    ]) {
      expect(withBasePath(value, base)).toBe(value);
    }
  });
});

describe("stripBasePath", () => {
  const base = "/arqvia-demo";

  it("removes the prefix only when it is a whole segment", () => {
    expect(stripBasePath("/arqvia-demo", base)).toBe("/");
    expect(stripBasePath("/arqvia-demo/admin", base)).toBe("/admin");
    expect(stripBasePath("/arqvia-demo?x=1", base)).toBe("/?x=1");
    expect(stripBasePath("/arqvia-demo-otra", base)).toBe("/arqvia-demo-otra");
    expect(stripBasePath("/admin", base)).toBe("/admin");
    expect(stripBasePath("/admin", "")).toBe("/admin");
  });
});

describe("cookiePath", () => {
  it("confines cookies to the base path when there is one", () => {
    expect(cookiePath("")).toBe("/");
    expect(cookiePath("/arqvia-demo")).toBe("/arqvia-demo");
  });
});

describe("joinSiteUrl", () => {
  it("keeps the historic behaviour for a root site URL", () => {
    expect(joinSiteUrl("https://arqvia.com.ar", "/proyectos")).toBe(
      "https://arqvia.com.ar/proyectos",
    );
    expect(joinSiteUrl("https://arqvia.com.ar", "/")).toBe(
      "https://arqvia.com.ar/",
    );
  });

  it("keeps the sub-path of the public site URL", () => {
    const site = "https://cozziinteractive.com/arqvia-demo";
    expect(joinSiteUrl(site, "/proyectos")).toBe(
      "https://cozziinteractive.com/arqvia-demo/proyectos",
    );
    expect(joinSiteUrl(site, "/")).toBe(
      "https://cozziinteractive.com/arqvia-demo",
    );
    expect(joinSiteUrl(`${site}/`, "/images/a.webp")).toBe(
      "https://cozziinteractive.com/arqvia-demo/images/a.webp",
    );
    expect(joinSiteUrl(site, "/arqvia-demo/images/a.webp")).toBe(
      "https://cozziinteractive.com/arqvia-demo/images/a.webp",
    );
  });

  it("returns absolute URLs untouched", () => {
    expect(
      joinSiteUrl(
        "https://cozziinteractive.com/arqvia-demo",
        "https://media.example.com/a.webp",
      ),
    ).toBe("https://media.example.com/a.webp");
  });
});
