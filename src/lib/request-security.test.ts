import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isJsonRequest,
  isMultipartRequest,
  isSameOriginRequest,
  isTrustedOrigin,
  trustedOrigins,
} from "./request-security";

function requestWith(headers: Record<string, string>) {
  return new Request("https://arqvia.com.ar/api/admin/media", { headers });
}

describe("isSameOriginRequest", () => {
  it("accepts matching Origin and rejects a foreign Origin", () => {
    expect(
      isSameOriginRequest(
        requestWith({ host: "arqvia.com.ar", origin: "https://arqvia.com.ar" }),
        { requireSource: true },
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        requestWith({ host: "arqvia.com.ar", origin: "https://evil.example" }),
        { requireSource: true },
      ),
    ).toBe(false);
  });

  it("normalizes host casing and ports without accepting non-HTTP origins", () => {
    expect(
      isSameOriginRequest(
        requestWith({
          host: "ARQVIA.com.ar:443",
          origin: "https://arqvia.com.ar:443",
        }),
        { requireSource: true },
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        requestWith({ host: "arqvia.com.ar", origin: "ftp://arqvia.com.ar" }),
        { requireSource: true },
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        requestWith({ host: "not a host", origin: "https://arqvia.com.ar" }),
        { requireSource: true },
      ),
    ).toBe(false);
  });

  it("requires Origin or Referer for protected mutations", () => {
    expect(
      isSameOriginRequest(requestWith({ host: "arqvia.com.ar" }), {
        requireSource: true,
      }),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        requestWith({
          host: "arqvia.com.ar",
          referer: "https://arqvia.com.ar/admin/media",
        }),
        { requireSource: true },
      ),
    ).toBe(true);
  });
});

describe("request content types", () => {
  it("accepts exact JSON and multipart media types with parameters", () => {
    expect(
      isJsonRequest(requestWith({ "content-type": "application/json; charset=utf-8" })),
    ).toBe(true);
    expect(
      isMultipartRequest(
        requestWith({
          "content-type": "multipart/form-data; boundary=arqvia-boundary",
        }),
      ),
    ).toBe(true);
  });

  it("rejects partial or misleading media type matches", () => {
    expect(
      isJsonRequest(requestWith({ "content-type": "text/application/json" })),
    ).toBe(false);
    expect(
      isJsonRequest(requestWith({ "content-type": "application/json-patch+json" })),
    ).toBe(false);
    expect(
      isMultipartRequest(
        requestWith({ "content-type": "application/x-multipart/form-data" }),
      ),
    ).toBe(false);
  });
});

describe("requests proxied from the public site URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const proxied = (headers: Record<string, string>) =>
    new Request("https://arqvia-jade.vercel.app/arqvia-demo/api/leads", {
      headers: { host: "arqvia-jade.vercel.app", ...headers },
    });

  it("accepts the origin of NEXT_PUBLIC_SITE_URL when the Host is the deployment", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cozziinteractive.com/arqvia-demo");

    expect(
      isSameOriginRequest(proxied({ origin: "https://cozziinteractive.com" }), {
        requireSource: true,
      }),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        proxied({ referer: "https://cozziinteractive.com/arqvia-demo/contacto" }),
        { requireSource: true },
      ),
    ).toBe(true);
    // The deployment's own host keeps working (direct access, health checks).
    expect(
      isSameOriginRequest(proxied({ origin: "https://arqvia-jade.vercel.app" }), {
        requireSource: true,
      }),
    ).toBe(true);
  });

  it("still rejects foreign origins, look-alikes and other schemes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cozziinteractive.com/arqvia-demo");

    for (const origin of [
      "https://evil.example",
      "https://cozziinteractive.com.evil.example",
      "https://sub.cozziinteractive.com",
      "http://cozziinteractive.com",
      "https://cozziinteractive.com:8443",
      "null",
    ]) {
      expect(
        isSameOriginRequest(proxied({ origin }), { requireSource: true }),
        origin,
      ).toBe(false);
    }
    expect(
      isSameOriginRequest(
        proxied({ referer: "https://evil.example/arqvia-demo/contacto" }),
        { requireSource: true },
      ),
    ).toBe(false);
  });

  it("does not trust forwarded host headers", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cozziinteractive.com/arqvia-demo");

    expect(
      isSameOriginRequest(
        proxied({
          origin: "https://evil.example",
          "x-forwarded-host": "evil.example",
        }),
        { requireSource: true },
      ),
    ).toBe(false);
  });

  it("derives the allow-list only from an explicit, well-formed public URL", () => {
    expect(
      [...trustedOrigins({ NEXT_PUBLIC_SITE_URL: "https://cozziinteractive.com/arqvia-demo" })],
    ).toEqual(["https://cozziinteractive.com"]);
    expect(trustedOrigins({}).size).toBe(0);
    expect(trustedOrigins({ NEXT_PUBLIC_SITE_URL: "not a url" }).size).toBe(0);
    expect(
      trustedOrigins({ NEXT_PUBLIC_SITE_URL: "ftp://cozziinteractive.com" }).size,
    ).toBe(0);
    expect(
      isTrustedOrigin("https://cozziinteractive.com", {
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
      }),
    ).toBe(false);
  });
});
