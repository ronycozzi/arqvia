// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/locale/route";

function localeRequest(body: unknown, origin = "https://arqvia.test") {
  return new Request("https://arqvia.test/api/locale", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
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
});

describe("POST /api/locale behind the public site rewrite", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts the public origin and still rejects a foreign one", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cozziinteractive.com/arqvia-demo");

    const accepted = await POST(
      localeRequest({ locale: "en" }, "https://cozziinteractive.com"),
    );
    expect(accepted.status).toBe(200);

    const rejected = await POST(
      localeRequest({ locale: "en" }, "https://malicious.example"),
    );
    expect(rejected.status).toBe(403);
  });
});
