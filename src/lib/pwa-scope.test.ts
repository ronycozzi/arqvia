import { describe, expect, it } from "vitest";
import { isServiceWorkerScopeInside } from "./pwa-scope";

const origin = "https://cozziinteractive.com";

describe("isServiceWorkerScopeInside", () => {
  it("matches only registrations inside the app's own prefix", () => {
    expect(
      isServiceWorkerScopeInside(`${origin}/arqvia-demo/`, origin, "/arqvia-demo"),
    ).toBe(true);
    expect(
      isServiceWorkerScopeInside(`${origin}/arqvia-demo`, origin, "/arqvia-demo"),
    ).toBe(true);
  });

  it("never matches the host site's own workers", () => {
    for (const scope of [
      `${origin}/`,
      `${origin}/arqvia-demo-otra/`,
      `${origin}/portfolio/`,
      "https://otro.example/arqvia-demo/",
      "not a url",
    ]) {
      expect(isServiceWorkerScopeInside(scope, origin, "/arqvia-demo"), scope).toBe(
        false,
      );
    }
  });

  it("is inert without a base path", () => {
    expect(isServiceWorkerScopeInside(`${origin}/`, origin, "")).toBe(false);
  });
});
