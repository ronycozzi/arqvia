import { describe, expect, it } from "vitest";
import { buildAuthCookieOverrides } from "./auth-cookies";

describe("buildAuthCookieOverrides", () => {
  it("keeps the Auth.js defaults at the domain root", () => {
    expect(
      buildAuthCookieOverrides("", { AUTH_URL: "https://arqvia.com.ar" }),
    ).toBeNull();
  });

  it("names and scopes the cookies to the base path over https", () => {
    const overrides = buildAuthCookieOverrides("/arqvia-demo", {
      AUTH_URL: "https://cozziinteractive.com/arqvia-demo/api/auth",
    });

    expect(overrides?.useSecureCookies).toBe(true);
    expect(overrides?.cookies.sessionToken).toEqual({
      name: "__Secure-arqvia-demo.session-token",
      options: {
        httpOnly: true,
        path: "/arqvia-demo",
        sameSite: "lax",
        secure: true,
      },
    });
    expect(overrides?.cookies.csrfToken.name).toBe(
      "__Secure-arqvia-demo.csrf-token",
    );
    expect(overrides?.cookies.callbackUrl.name).toBe(
      "__Secure-arqvia-demo.callback-url",
    );
    for (const cookie of Object.values(overrides!.cookies)) {
      expect(cookie.name).not.toContain("__Host-");
      expect(cookie.options.path).toBe("/arqvia-demo");
    }
  });

  it("drops the secure prefix for a local http base-path build", () => {
    const overrides = buildAuthCookieOverrides("/arqvia-demo", {
      AUTH_URL: "http://localhost:3415/arqvia-demo/api/auth",
    });

    expect(overrides?.useSecureCookies).toBe(false);
    expect(overrides?.cookies.sessionToken.name).toBe(
      "arqvia-demo.session-token",
    );
    expect(overrides?.cookies.sessionToken.options.secure).toBe(false);
  });

  it("assumes https on Vercel when AUTH_URL is missing", () => {
    expect(
      buildAuthCookieOverrides("/arqvia-demo", { VERCEL: "1" })?.useSecureCookies,
    ).toBe(true);
    expect(buildAuthCookieOverrides("/arqvia-demo", {})?.useSecureCookies).toBe(
      false,
    );
  });
});
