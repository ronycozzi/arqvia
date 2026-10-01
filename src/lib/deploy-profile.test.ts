import { describe, expect, it } from "vitest";
import {
  demoProfileRequested,
  isDemoDeployProfile,
  isUrlInsideDemoBasePath,
} from "./deploy-profile";

const demo = {
  ARQVIA_DEPLOY_PROFILE: "demo",
  NEXT_PUBLIC_BASE_PATH: "/arqvia-demo",
  NEXT_PUBLIC_SITE_URL: "https://cozziinteractive.com/arqvia-demo",
};

describe("isDemoDeployProfile", () => {
  it("accepts a sub-path deployment that declares the demo profile", () => {
    expect(isDemoDeployProfile(demo)).toBe(true);
    expect(
      isDemoDeployProfile({
        ...demo,
        ARQVIA_DEPLOY_PROFILE: " Demo ",
        NEXT_PUBLIC_SITE_URL: "https://cozziinteractive.com/arqvia-demo/",
      }),
    ).toBe(true);
  });

  it("is off unless the profile is requested explicitly", () => {
    expect(isDemoDeployProfile({ ...demo, ARQVIA_DEPLOY_PROFILE: undefined })).toBe(
      false,
    );
    expect(isDemoDeployProfile({ ...demo, ARQVIA_DEPLOY_PROFILE: "true" })).toBe(
      false,
    );
    expect(demoProfileRequested({ ARQVIA_DEPLOY_PROFILE: "production" })).toBe(
      false,
    );
  });

  it("never applies to a site published at the root of its own domain", () => {
    expect(
      isDemoDeployProfile({
        ARQVIA_DEPLOY_PROFILE: "demo",
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
      }),
    ).toBe(false);
    expect(
      isDemoDeployProfile({
        ...demo,
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
      }),
    ).toBe(false);
    expect(
      isDemoDeployProfile({ ...demo, NEXT_PUBLIC_BASE_PATH: "" }),
    ).toBe(false);
  });

  it("requires https and a site path equal to the base path", () => {
    expect(
      isDemoDeployProfile({
        ...demo,
        NEXT_PUBLIC_SITE_URL: "http://cozziinteractive.com/arqvia-demo",
      }),
    ).toBe(false);
    expect(
      isDemoDeployProfile({
        ...demo,
        NEXT_PUBLIC_SITE_URL: "https://cozziinteractive.com/otra-demo",
      }),
    ).toBe(false);
    expect(
      isDemoDeployProfile({
        ...demo,
        NEXT_PUBLIC_SITE_URL: "https://user:pass@cozziinteractive.com/arqvia-demo",
      }),
    ).toBe(false);
    expect(isDemoDeployProfile({ ...demo, NEXT_PUBLIC_SITE_URL: "nope" })).toBe(
      false,
    );
  });
});

describe("isUrlInsideDemoBasePath", () => {
  it("accepts the site URL and the auth endpoint below it", () => {
    expect(isUrlInsideDemoBasePath(demo.NEXT_PUBLIC_SITE_URL, demo)).toBe(true);
    expect(
      isUrlInsideDemoBasePath(
        "https://cozziinteractive.com/arqvia-demo/api/auth",
        demo,
      ),
    ).toBe(true);
  });

  it("rejects other origins, other paths and non-demo deployments", () => {
    expect(
      isUrlInsideDemoBasePath("https://evil.example/arqvia-demo/api/auth", demo),
    ).toBe(false);
    expect(
      isUrlInsideDemoBasePath("https://cozziinteractive.com/api/auth", demo),
    ).toBe(false);
    expect(
      isUrlInsideDemoBasePath("https://cozziinteractive.com/arqvia-demo-2", demo),
    ).toBe(false);
    expect(
      isUrlInsideDemoBasePath("https://arqvia.com.ar/api/auth", {
        NEXT_PUBLIC_SITE_URL: "https://arqvia.com.ar",
      }),
    ).toBe(false);
  });
});
