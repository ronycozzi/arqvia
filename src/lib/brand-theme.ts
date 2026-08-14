import type { CSSProperties } from "react";
import type { PublicClientConfig } from "@/lib/client-config";

type Rgb = { b: number; g: number; r: number };

export type BrandCssVariables = CSSProperties & Record<`--${string}`, string>;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const headingFonts: Record<string, string> = {
  newsreader: "var(--font-newsreader), Georgia, serif",
  "cormorant garamond": "var(--font-newsreader), Georgia, serif",
  georgia: "Georgia, 'Times New Roman', serif",
  "times new roman": "'Times New Roman', Times, serif",
};

const bodyFonts: Record<string, string> = {
  arial: "Arial, Helvetica, sans-serif",
  manrope: "var(--font-manrope), Arial, Helvetica, sans-serif",
  inter: "var(--font-manrope), Arial, Helvetica, sans-serif",
  "system ui": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "system-ui": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export const brandHeadingFontOptions = [
  "Newsreader",
  "Cormorant Garamond",
  "Georgia",
  "Times New Roman",
] as const;

export const brandBodyFontOptions = ["Manrope", "Inter", "System UI", "Arial"] as const;

function normalizeHex(value: string, fallback: string) {
  const clean = value.trim();
  return HEX_COLOR.test(clean) ? clean.toLowerCase() : fallback;
}

function hexToRgb(value: string): Rgb {
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

function rgbToHex({ b, g, r }: Rgb) {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(first: string, second: string, secondWeight: number) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const weight = Math.min(1, Math.max(0, secondWeight));

  return rgbToHex({
    r: a.r * (1 - weight) + b.r * weight,
    g: a.g * (1 - weight) + b.g * weight,
    b: a.b * (1 - weight) + b.b * weight,
  });
}

function luminance(value: string) {
  const rgb = hexToRgb(value);
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first: string, second: string) {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

function moveUntilContrast(
  foreground: string,
  background: string,
  target: string,
  minimum = 4.5,
) {
  if (contrastRatio(foreground, background) >= minimum) return foreground;

  for (let weight = 0.08; weight <= 1; weight += 0.08) {
    const candidate = mix(foreground, target, weight);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }

  return target;
}

function moveUntilOpacityContrast(
  foreground: string,
  backgrounds: string[],
  opacity: number,
  target: string,
  minimum = 4.5,
) {
  const passes = (candidate: string) =>
    backgrounds.every(
      (background) =>
        contrastRatio(mix(background, candidate, opacity), background) >= minimum,
    );

  if (passes(foreground)) return foreground;

  for (let weight = 0.08; weight <= 1; weight += 0.08) {
    const candidate = mix(foreground, target, weight);
    if (passes(candidate)) return candidate;
  }

  return target;
}

function resolveFont(
  value: string,
  options: Record<string, string>,
  fallback: string,
) {
  return options[value.trim().toLowerCase()] || fallback;
}

export function buildBrandTheme(config: PublicClientConfig) {
  const primary = normalizeHex(config.primaryColor, "#1c211d");
  const secondary = normalizeHex(config.secondaryColor, "#eef0eb");
  const accent = normalizeHex(config.accentColor, "#9b6a39");
  const background = moveUntilContrast(secondary, "#11120f", "#ffffff", 12);
  const paper = mix(background, "#ffffff", 0.45);
  const baseInk = moveUntilContrast(primary, background, "#11120f", 7);
  const ink = moveUntilOpacityContrast(
    baseInk,
    [background, paper],
    0.65,
    "#080907",
  );
  const graphite = moveUntilContrast(
    mix(ink, "#000000", 0.35),
    paper,
    "#10110f",
    12,
  );
  const bronze = moveUntilContrast(accent, background, "#3b2511", 4.5);
  const bronzeLight = moveUntilContrast(accent, ink, "#f4c98e", 4.5);

  return {
    accent,
    background,
    bodyFont: resolveFont(
      config.fontBody,
      bodyFonts,
      "var(--font-manrope), Arial, Helvetica, sans-serif",
    ),
    bronze,
    bronzeLight,
    graphite,
    graphitePanel: mix(graphite, paper, 0.1),
    graphiteSoft: mix(graphite, paper, 0.06),
    headingFont: resolveFont(
      config.fontHeading,
      headingFonts,
      "var(--font-newsreader), Georgia, serif",
    ),
    ink,
    mist: mix(background, "#ffffff", 0.62),
    olive: mix(ink, accent, 0.28),
    paper,
    primary,
    secondary,
    stone: mix(background, ink, 0.12),
  };
}

export function buildBrandCssVariables(
  config: PublicClientConfig,
): BrandCssVariables {
  const theme = buildBrandTheme(config);

  return {
    "--background": theme.background,
    "--brand-accent": theme.accent,
    "--brand-font-body": theme.bodyFont,
    "--brand-font-heading": theme.headingFont,
    "--brand-primary": theme.primary,
    "--brand-secondary": theme.secondary,
    "--bronze": theme.bronze,
    "--bronze-light": theme.bronzeLight,
    "--copper": mix(theme.bronze, theme.bronzeLight, 0.52),
    "--foreground": theme.ink,
    "--graphite": theme.graphite,
    "--graphite-panel": theme.graphitePanel,
    "--graphite-soft": theme.graphiteSoft,
    "--ink": theme.ink,
    "--mist": theme.mist,
    "--olive": theme.olive,
    "--paper": theme.paper,
    "--stone": theme.stone,
  };
}
