import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_ANALYTICS_ID: z.string().trim().max(40).default(""),
  NEXT_PUBLIC_ANALYTICS_PROVIDER: z
    .enum(["none", "ga4", "gtm"])
    .default("none"),
  NEXT_PUBLIC_SITE_URL: z.string().trim().url().default("http://localhost:3000"),
  NEXT_PUBLIC_WHATSAPP_MESSAGE: z
    .string()
    .trim()
    .min(10)
    .default(
      "Hola, quiero consultar por un proyecto con Arqvia. Estoy en Córdoba y me gustaría recibir orientación.",
    ),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) =>
        /^\+?[0-9\s().-]+$/.test(value) &&
        cleanPhone(value).length >= 8 &&
        cleanPhone(value).length <= 15,
      "NEXT_PUBLIC_WHATSAPP_NUMBER must be a valid international phone number",
    )
    .default("5493515551234"),
});

type PublicEnvRaw = Record<string, string | undefined>;

const placeholderWhatsAppNumbers = new Set([
  "5493510000000",
  "543510000000",
  "5493515551234",
]);

const localPublicHostnames = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
  "0.0.0.0",
]);

function isLocalPublicUrl(siteUrl: string) {
  const url = new URL(siteUrl);
  const hostname = url.hostname.toLowerCase();

  return localPublicHostnames.has(hostname) || hostname.endsWith(".local");
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function isStrictPublicUrlContext(env: PublicEnvRaw = process.env) {
  return (
    env.ARQVIA_STRICT_PUBLIC_URL === "true" ||
    env.VERCEL_ENV === "production" ||
    env.RENDER === "true" ||
    env.RAILWAY_ENVIRONMENT === "production" ||
    (env.NETLIFY === "true" && env.CONTEXT === "production")
  );
}

export function validatePublicEnv(env: PublicEnvRaw = process.env) {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_ANALYTICS_ID: env.NEXT_PUBLIC_ANALYTICS_ID || undefined,
    NEXT_PUBLIC_ANALYTICS_PROVIDER:
      env.NEXT_PUBLIC_ANALYTICS_PROVIDER || undefined,
    NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL || undefined,
    NEXT_PUBLIC_WHATSAPP_MESSAGE:
      env.NEXT_PUBLIC_WHATSAPP_MESSAGE || undefined,
    NEXT_PUBLIC_WHATSAPP_NUMBER:
      env.NEXT_PUBLIC_WHATSAPP_NUMBER || undefined,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  const analyticsId = parsed.data.NEXT_PUBLIC_ANALYTICS_ID;
  const analyticsProvider = parsed.data.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const analyticsIdIsValid =
    analyticsProvider === "none" ||
    (analyticsProvider === "ga4" && /^G-[A-Z0-9]{4,20}$/i.test(analyticsId)) ||
    (analyticsProvider === "gtm" && /^GTM-[A-Z0-9]{4,20}$/i.test(analyticsId));

  if (!analyticsIdIsValid) {
    throw new Error(
      "NEXT_PUBLIC_ANALYTICS_ID must match the selected analytics provider (G-... for GA4 or GTM-... for Google Tag Manager).",
    );
  }

  if (
    isStrictPublicUrlContext(env) &&
    (new URL(parsed.data.NEXT_PUBLIC_SITE_URL).protocol !== "https:" ||
      isLocalPublicUrl(parsed.data.NEXT_PUBLIC_SITE_URL))
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be a real public https URL before production deployment. Set it to the final client domain or disable ARQVIA_STRICT_PUBLIC_URL for local-only checks.",
    );
  }

  if (
    isStrictPublicUrlContext(env) &&
    placeholderWhatsAppNumbers.has(cleanPhone(parsed.data.NEXT_PUBLIC_WHATSAPP_NUMBER))
  ) {
    throw new Error(
      "NEXT_PUBLIC_WHATSAPP_NUMBER must be the real client WhatsApp number before production deployment.",
    );
  }

  return parsed.data;
}

export const publicEnv = validatePublicEnv();
