import { defineConfig, devices } from "@playwright/test";
import { normalizeBasePath } from "./src/lib/base-path";

const configuredPort = process.env.PLAYWRIGHT_PORT || "3100";
const parsedPort = Number(configuredPort);

if (!/^\d+$/.test(configuredPort) || parsedPort < 1024 || parsedPort > 65_535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1024 and 65535.");
}

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${parsedPort}`;

// Sub-path mode. `NEXT_PUBLIC_BASE_PATH` is inlined at build time, so the app
// must have been built with the same value before running the suite:
//
//   NEXT_PUBLIC_BASE_PATH=/arqvia-demo npm run build
//   NEXT_PUBLIC_BASE_PATH=/arqvia-demo npm run e2e
//
// The regular specs navigate to root paths ("/contacto"); under a base path
// only the dedicated smoke spec runs, and at the root that spec is skipped.
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const basePathSpec = /base-path\.spec\.ts$/;
const publicUrl = `${baseURL}${basePath}`;

export default defineConfig({
  testDir: "./tests/e2e",
  ...(basePath ? { testMatch: basePathSpec } : { testIgnore: basePathSpec }),
  // El runner de CI tiene dos núcleos y reencoda las imágenes bajo demanda la
  // primera vez que se visita cada página: con 30 s, page.goto se quedaba sin
  // tiempo esperando al optimizador y cinco pruebas de mobile fallaban sin que
  // hubiera nada roto en el sitio. En esta máquina la misma suite pasa en 1,1 min.
  timeout: process.env.CI ? 90_000 : 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run start -- -p ${parsedPort}`,
    url: basePath ? `${publicUrl}/api/ready` : `http://localhost:${parsedPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      AUTH_URL: basePath ? `${publicUrl}/api/auth` : baseURL,
      NEXT_PUBLIC_SITE_URL: publicUrl,
      TRUST_PROXY_PROVIDER: "vercel",
      LEAD_AUTOMATION_CAPTURE_ENABLED: "true",
      LEAD_AUTOMATION_ENABLED: "false",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
