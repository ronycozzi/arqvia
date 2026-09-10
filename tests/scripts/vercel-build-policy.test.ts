import { describe, expect, it } from "vitest";
import {
  releaseGateApplies,
  resolveVercelBuildScript,
} from "../../scripts/vercel-build-policy";

const dominioPropio = { NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar" };
const subdominioVercel = {
  NEXT_PUBLIC_SITE_URL: "https://arqvia-ronycozzi5.vercel.app",
};

describe("resolveVercelBuildScript", () => {
  it("uses the PostgreSQL build for technical previews", () => {
    expect(resolveVercelBuildScript("preview", dominioPropio)).toBe(
      "build:postgres",
    );
  });

  it("keeps the guarded release build once the site has its own domain", () => {
    expect(resolveVercelBuildScript("production", dominioPropio)).toBe(
      "build:release",
    );
  });

  it("publishes without the release gate while the site lives on vercel.app", () => {
    expect(resolveVercelBuildScript("production", subdominioVercel)).toBe(
      "build:postgres",
    );
  });

  it("falls back to the Vercel-provided host when no public URL is configured", () => {
    expect(
      resolveVercelBuildScript("production", {
        VERCEL_PROJECT_PRODUCTION_URL: "arqvia-ronycozzi5.vercel.app",
      }),
    ).toBe("build:postgres");
  });

  it.each([undefined, "", "development", "staging"])(
    "fails closed for unsupported target %s",
    (target) => {
      expect(() => resolveVercelBuildScript(target, dominioPropio)).toThrow(
        /VERCEL_ENV must be preview or production/,
      );
    },
  );
});

describe("releaseGateApplies", () => {
  it("fails closed when the publication host cannot be resolved", () => {
    expect(releaseGateApplies({})).toBe(true);
    expect(releaseGateApplies({ NEXT_PUBLIC_SITE_URL: "no-es-una-url::" })).toBe(
      true,
    );
  });

  it("ignores the Vercel host once a real domain is configured", () => {
    expect(
      releaseGateApplies({
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
        VERCEL_URL: "arqvia-ronycozzi5.vercel.app",
      }),
    ).toBe(true);
  });
});
