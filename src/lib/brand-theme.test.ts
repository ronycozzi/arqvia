import { describe, expect, it } from "vitest";
import { buildBrandCssVariables, buildBrandTheme, contrastRatio } from "@/lib/brand-theme";
import { fallbackClientConfig } from "@/lib/client-config";

describe("brand theme", () => {
  it("maps configured colors into a readable architectural palette", () => {
    const theme = buildBrandTheme({
      ...fallbackClientConfig,
      accentColor: "#f4d900",
      primaryColor: "#e8e8e8",
      secondaryColor: "#161616",
    });

    expect(theme.primary).toBe("#e8e8e8");
    expect(theme.secondary).toBe("#161616");
    expect(contrastRatio(theme.ink, theme.background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(theme.bronze, theme.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.bronze, theme.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.bronzeLight, theme.ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.bronzeLight, theme.graphite)).toBeGreaterThanOrEqual(4.5);
  });

  it("never injects arbitrary CSS through font or color fields", () => {
    const variables = buildBrandCssVariables({
      ...fallbackClientConfig,
      accentColor: "red;display:none",
      fontBody: "Arial;display:none",
      fontHeading: "url(https://example.test/font)",
      primaryColor: "var(--unsafe)",
    });

    expect(variables["--brand-primary"]).toBe("#1c211d");
    expect(variables["--brand-accent"]).toBe("#9b6a39");
    expect(variables["--brand-font-body"]).not.toContain("display");
    expect(variables["--brand-font-heading"]).not.toContain("url(");
  });
});
