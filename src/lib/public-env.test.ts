import { describe, expect, it } from "vitest";
import { isStrictPublicUrlContext, validatePublicEnv } from "./public-env";

const baseEnv = {
  NEXT_PUBLIC_WHATSAPP_MESSAGE: "Hola, quiero consultar por un proyecto con Arqvia.",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "5493517778899",
};

describe("validatePublicEnv", () => {
  it("allows localhost for local development", () => {
    const env = validatePublicEnv({
      ...baseEnv,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });

    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("rejects localhost when strict public URL validation is enabled", () => {
    expect(() =>
      validatePublicEnv({
        ...baseEnv,
        ARQVIA_STRICT_PUBLIC_URL: "true",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL must be a real public https URL/);
  });

  it("rejects localhost in common production hosting contexts", () => {
    expect(() =>
      validatePublicEnv({
        ...baseEnv,
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
        VERCEL_ENV: "production",
      }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL must be a real public https URL/);
  });

  it("rejects non-https public URLs in strict mode", () => {
    expect(() =>
      validatePublicEnv({
        ...baseEnv,
        ARQVIA_STRICT_PUBLIC_URL: "true",
        NEXT_PUBLIC_SITE_URL: "http://arqvia.com.ar",
      }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL must be a real public https URL/);
  });

  it("accepts a real public URL in strict mode", () => {
    const env = validatePublicEnv({
      ...baseEnv,
      ARQVIA_STRICT_PUBLIC_URL: "true",
      NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
    });

    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://arqvia.com.ar");
  });

  it("accepts disabled analytics without an identifier", () => {
    const env = validatePublicEnv({
      ...baseEnv,
      NEXT_PUBLIC_ANALYTICS_PROVIDER: "none",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });

    expect(env.NEXT_PUBLIC_ANALYTICS_PROVIDER).toBe("none");
    expect(env.NEXT_PUBLIC_ANALYTICS_ID).toBe("");
  });

  it("validates analytics identifiers against their provider", () => {
    expect(() =>
      validatePublicEnv({
        ...baseEnv,
        NEXT_PUBLIC_ANALYTICS_ID: "GTM-ABC1234",
        NEXT_PUBLIC_ANALYTICS_PROVIDER: "ga4",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toThrow(/must match the selected analytics provider/);

    const env = validatePublicEnv({
      ...baseEnv,
      NEXT_PUBLIC_ANALYTICS_ID: "G-ARQVIA2026",
      NEXT_PUBLIC_ANALYTICS_PROVIDER: "ga4",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
    expect(env.NEXT_PUBLIC_ANALYTICS_ID).toBe("G-ARQVIA2026");
  });

  it("rejects the initial WhatsApp placeholder in strict mode", () => {
    expect(() =>
      validatePublicEnv({
        ...baseEnv,
        ARQVIA_STRICT_PUBLIC_URL: "true",
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
        NEXT_PUBLIC_WHATSAPP_NUMBER: "5493515551234",
      }),
    ).toThrow(/NEXT_PUBLIC_WHATSAPP_NUMBER must be the real client WhatsApp/);
  });

  it("rejects malformed WhatsApp values in every environment", () => {
    expect(() =>
      validatePublicEnv({
        ...baseEnv,
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_WHATSAPP_NUMBER: "sin numero",
      }),
    ).toThrow(/NEXT_PUBLIC_WHATSAPP_NUMBER/);
  });
});

describe("isStrictPublicUrlContext", () => {
  it("detects explicit and platform production contexts", () => {
    expect(isStrictPublicUrlContext({ ARQVIA_STRICT_PUBLIC_URL: "true" })).toBe(
      true,
    );
    expect(isStrictPublicUrlContext({ VERCEL_ENV: "production" })).toBe(true);
    expect(
      isStrictPublicUrlContext({ NETLIFY: "true", CONTEXT: "production" }),
    ).toBe(true);
    expect(isStrictPublicUrlContext({ VERCEL_ENV: "preview" })).toBe(false);
  });
});
