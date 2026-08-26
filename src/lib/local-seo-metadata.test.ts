import { describe, expect, it } from "vitest";
import { localSeoPages } from "@/lib/local-seo";
import { buildLocalSeoMetadata } from "@/lib/local-seo-metadata";

describe("buildLocalSeoMetadata", () => {
  it("keeps browser, Open Graph and Twitter titles branded", () => {
    const metadata = buildLocalSeoMetadata(localSeoPages[0], {
      companyName: "Arqvia",
      heroImage: "/images/hero.webp",
    });

    expect(metadata.title).toEqual({
      absolute: `${localSeoPages[0].title} | Arqvia`,
    });
    expect(metadata.openGraph?.title).toBe(
      `${localSeoPages[0].title} | Arqvia`,
    );
    expect(metadata.twitter?.title).toBe(
      `${localSeoPages[0].title} | Arqvia`,
    );
  });
});
