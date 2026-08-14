import { describe, expect, it } from "vitest";
import { safeDecodeURIComponent } from "@/lib/safe-uri";

describe("safeDecodeURIComponent", () => {
  it("decodes valid slugs", () => {
    expect(safeDecodeURIComponent("casa-patio-norte")).toBe("casa-patio-norte");
  });

  it.each(["%E0%A4%A", "%C3%28", "%"])(
    "returns null for malformed input %s",
    (value) => {
      expect(safeDecodeURIComponent(value)).toBeNull();
    },
  );
});
