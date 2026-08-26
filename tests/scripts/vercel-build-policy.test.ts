import { describe, expect, it } from "vitest";
import { resolveVercelBuildScript } from "../../scripts/vercel-build-policy";

describe("resolveVercelBuildScript", () => {
  it("uses the PostgreSQL build for technical previews", () => {
    expect(resolveVercelBuildScript("preview")).toBe("build:postgres");
  });

  it("keeps the guarded release build for production", () => {
    expect(resolveVercelBuildScript("production")).toBe("build:release");
  });

  it.each([undefined, "", "development", "staging"])(
    "fails closed for unsupported target %s",
    (target) => {
      expect(() => resolveVercelBuildScript(target)).toThrow(
        /VERCEL_ENV must be preview or production/,
      );
    },
  );
});
