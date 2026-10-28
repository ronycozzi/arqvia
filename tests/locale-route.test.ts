// @vitest-environment node

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/locale/route";

function localeRequest(body: unknown, origin = "https://arqvia.test") {
  return new Request("https://arqvia.test/api/locale", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Host: "arqvia.test",
    },
    method: "POST",
  });
}

describe("POST /api/locale", () => {
  it("persists a supported locale in a site-wide preference cookie", async () => {
    const response = await POST(localeRequest({ locale: "en" }));
    const cookie = response.headers.get("set-cookie") || "";

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ locale: "en" });
    expect(cookie).toContain("arqvia_locale=en");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=lax");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects unsupported locale values", async () => {
    const response = await POST(localeRequest({ locale: "pt" }));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects cross-origin preference changes", async () => {
    const response = await POST(
      localeRequest({ locale: "en" }, "https://malicious.example"),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("accepts a same-site browser when Next exposes an internal request URL", async () => {
    const response = await POST(new Request("http://localhost:3127/api/locale", {
      method: "POST", body: JSON.stringify({ locale: "en" }),
      headers: { "Content-Type": "application/json", Host: "127.0.0.1:3127", Origin: "http://127.0.0.1:3127" },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("arqvia_locale=en");
  });

  it("does not trust forwarded headers to authorize a foreign origin", async () => {
    const response = await POST(new Request("http://localhost:3127/api/locale", {
      method: "POST", body: JSON.stringify({ locale: "en" }),
      headers: { Host: "arqvia.test", Origin: "https://malicious.example", "X-Forwarded-Host": "malicious.example" },
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("requires a browser source for preference changes", async () => {
    const response = await POST(new Request("https://arqvia.test/api/locale", {
      method: "POST", body: JSON.stringify({ locale: "en" }), headers: { Host: "arqvia.test" },
    }));
    expect(response.status).toBe(403);
  });
});
