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

describe("demo deploy profile", () => {
  const demo = {
    ARQVIA_DEPLOY_PROFILE: "demo",
    NEXT_PUBLIC_BASE_PATH: "/arqvia-demo",
    NEXT_PUBLIC_SITE_URL: "https://cozziinteractive.com/arqvia-demo",
  };

  it("keeps the regular build for a demo served under a sub-path", () => {
    expect(releaseGateApplies(demo)).toBe(false);
    expect(resolveVercelBuildScript("production", demo)).toBe("build:postgres");
  });

  it("still demands the release gate for the same URL without the profile", () => {
    expect(
      resolveVercelBuildScript("production", {
        ...demo,
        ARQVIA_DEPLOY_PROFILE: undefined,
      }),
    ).toBe("build:release");
  });

  it("cannot be used to skip the gate on a client's own domain", () => {
    expect(
      resolveVercelBuildScript("production", {
        ARQVIA_DEPLOY_PROFILE: "demo",
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
      }),
    ).toBe("build:release");
    expect(
      resolveVercelBuildScript("production", {
        ...demo,
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
      }),
    ).toBe("build:release");
    expect(
      resolveVercelBuildScript("production", {
        ...demo,
        NEXT_PUBLIC_BASE_PATH: "",
      }),
    ).toBe("build:release");
  });
});
