import { describe, expect, it } from "vitest";
import { countUniqueReleaseFailures } from "@/lib/release-check-summary";

describe("release check summary", () => {
  it("counts equivalent environment and release failures once", () => {
    expect(
      countUniqueReleaseFailures({
        configExists: true,
        environmentChecks: [
          { id: "ENV-URL-001", ok: false },
          { id: "ENV-DB-001", ok: false },
        ],
        releaseChecks: [
          { id: "RG-ENV-001", ok: false },
          { id: "RG-DB-001", ok: false },
          { id: "RG-CONTENT-001", ok: false },
        ],
      }),
    ).toBe(3);
  });

  it("keeps stricter environment-only failures and missing config", () => {
    expect(
      countUniqueReleaseFailures({
        configExists: false,
        environmentChecks: [{ id: "ENV-STORAGE-001", ok: false }],
        releaseChecks: [{ id: "RG-STORAGE-001", ok: true }],
      }),
    ).toBe(2);
  });
});
