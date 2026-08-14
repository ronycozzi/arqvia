import { describe, expect, it } from "vitest";
import {
  isJsonRequest,
  isMultipartRequest,
  isSameOriginRequest,
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
