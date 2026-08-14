import { describe, expect, it } from "vitest";
import { isAllowedPublicImageSource } from "@/lib/public-image-source";

describe("public image source policy", () => {
  it("accepts local public paths", () => {
    expect(isAllowedPublicImageSource("/images/casa.webp")).toBe(true);
  });

  it("rejects arbitrary remote hosts", () => {
    expect(
      isAllowedPublicImageSource(
        "https://example.com/casa.webp",
        "https://media.arqvia.com/client-assets",
      ),
    ).toBe(false);
  });

  it("accepts only the configured HTTPS storage path", () => {
    const base = "https://media.arqvia.com/client-assets";
    expect(
      isAllowedPublicImageSource(
        "https://media.arqvia.com/client-assets/projects/casa.webp",
        base,
      ),
    ).toBe(true);
    expect(
      isAllowedPublicImageSource(
        "https://media.arqvia.com/another-client/casa.webp",
        base,
      ),
    ).toBe(false);
  });
});
