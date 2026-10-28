import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { normalizeBasePath } from "../../src/lib/base-path";

/**
 * Smoke suite for the app served under a sub-path (NEXT_PUBLIC_BASE_PATH).
 *
 * It only runs when the variable is set (see playwright.config.ts); the app
 * must have been built with the same value. It checks what a base path breaks
 * silently: assets and API calls that escape the prefix, redirects that drop
 * it, cookies that leak to the rest of the domain and the admin session flow.
 */

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const origin =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://localhost:${process.env.PLAYWRIGHT_PORT || "3100"}`;
const publicUrl = `${origin}${basePath}`;
const adminEmail = process.env.ADMIN_EMAIL || "admin@arqvia.local";
const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

const app = (path: string) => (path === "/" ? basePath : `${basePath}${path}`);
const insidePrefix = (pathname: string) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

test.skip(!basePath, "Only runs for a build with NEXT_PUBLIC_BASE_PATH.");

type Watch = {
  consoleErrors: string[];
  failedResponses: string[];
  outsidePrefix: string[];
};

/** Records every same-origin request, failed response and console error. */
function watch(page: Page): Watch {
  const state: Watch = { consoleErrors: [], failedResponses: [], outsidePrefix: [] };

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    if (!insidePrefix(url.pathname)) {
      state.outsidePrefix.push(`${request.method()} ${url.pathname}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      state.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") state.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => state.consoleErrors.push(error.message));

  return state;
}

function expectClean(state: Watch, context: string) {
  expect(state.outsidePrefix, `requests outside the prefix on ${context}`).toEqual([]);
  expect(state.failedResponses, `failed responses on ${context}`).toEqual([]);
  expect(state.consoleErrors, `console errors on ${context}`).toEqual([]);
}

/**
 * Every same-origin URL written into the document (links, forms, images,
 * icons, manifest) must stay inside the prefix. Returns the image and asset
 * URLs so the caller can confirm they resolve.
 */
async function documentUrls(page: Page) {
  return page.evaluate(() => {
    const sameOrigin = (value: string | null | undefined) => {
      if (!value) return null;
      try {
        const url = new URL(value, window.location.href);
        if (!/^https?:$/.test(url.protocol)) return null;
        return url.origin === window.location.origin ? url : null;
      } catch {
        return null;
      }
    };
    const paths = (values: Array<string | null | undefined>) =>
      values
        .map((value) => sameOrigin(value))
        .filter((url): url is URL => Boolean(url))
        .map((url) => `${url.pathname}${url.search}`);

    return {
      assets: paths([
        ...Array.from(document.querySelectorAll("img")).flatMap((image) => [
          image.getAttribute("src"),
          ...(image.getAttribute("srcset") || "")
            .split(",")
            .map((candidate) => candidate.trim().split(/\s+/)[0]),
        ]),
        ...Array.from(
          document.querySelectorAll<HTMLLinkElement>(
            'link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"], link[rel="preload"][as="image"]',
          ),
        ).flatMap((link) => [
          link.getAttribute("href"),
          ...(link.getAttribute("imagesrcset") || "")
            .split(",")
            .map((candidate) => candidate.trim().split(/\s+/)[0]),
        ]),
      ]),
      links: paths([
        ...Array.from(document.querySelectorAll("a[href]")).map((anchor) =>
          anchor.getAttribute("href"),
        ),
        ...Array.from(document.querySelectorAll("form[action]")).map((form) =>
          form.getAttribute("action"),
        ),
      ]),
    };
  });
}

async function expectDocumentInsidePrefix(page: Page, context: string) {
  const urls = await documentUrls(page);
  const stray = [...urls.links, ...urls.assets].filter(
    (value) => !insidePrefix(value.split(/[?#]/)[0]),
  );
  expect(stray, `URLs outside the prefix in the document of ${context}`).toEqual([]);

  // One URL per distinct image (the first candidate) is fetched for real, so a
  // lazy image below the fold that points at a missing file is still caught.
  const distinct = new Map<string, string>();
  for (const asset of urls.assets) {
    const key = asset.includes("/_next/image")
      ? new URL(asset, origin).searchParams.get("url") || asset
      : asset;
    if (!distinct.has(key)) distinct.set(key, asset);
  }
  for (const asset of distinct.values()) {
    const response = await page.request.get(asset);
    expect(response.status(), `${asset} on ${context}`).toBe(200);
  }

  return { assets: distinct.size, links: urls.links.length };
}

async function firstDetailPath(page: Page, section: string) {
  const href = await page
    .locator(`main a[href^="${app(`/${section}/`)}"]`)
    .first()
    .getAttribute("href");
  expect(href, `a detail link in /${section}`).toBeTruthy();
  return href!.split(/[?#]/)[0];
}

test("public pages load every asset from inside the prefix", async ({ page }) => {
  test.setTimeout(240_000);
  const state = watch(page);
  const visited: string[] = [];

  const visit = async (path: string) => {
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    const counts = await expectDocumentInsidePrefix(page, path);
    expect(counts.links, `links in ${path}`).toBeGreaterThan(5);
    visited.push(path);
  };

  await visit(app("/"));
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    app("/manifest.webmanifest"),
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    publicUrl,
  );

  await visit(app("/servicios"));
  await visit(await firstDetailPath(page, "servicios"));
  await visit(app("/proyectos"));
  await visit(await firstDetailPath(page, "proyectos"));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`^${publicUrl}/proyectos/`),
  );
  await visit(app("/blog"));
  await visit(await firstDetailPath(page, "blog"));
  await visit(app("/estimador"));
  await visit(app("/contacto"));

  // Structured data and Open Graph must point at the public URL with the prefix.
  await page.goto(app("/"));
  const absoluteUrls = await page.evaluate(() => [
    ...Array.from(
      document.querySelectorAll<HTMLMetaElement>(
        'meta[property="og:image"], meta[property="og:url"], meta[name="twitter:image"]',
      ),
    ).map((meta) => meta.content),
    ...Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ).flatMap((script) =>
      Array.from(
        (script.textContent || "").matchAll(/"(https?:\/\/[^"]+)"/g),
        (match) => match[1],
      ),
    ),
  ]);
  const strayAbsolute = absoluteUrls.filter(
    (value) => value.startsWith(origin) && !value.startsWith(publicUrl),
  );
  expect(absoluteUrls.some((value) => value.startsWith(publicUrl))).toBe(true);
  expect(strayAbsolute).toEqual([]);

  expect(visited).toHaveLength(9);
  expectClean(state, "the public journey");
});

test("client-side navigation keeps the prefix", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop navigation only");
  const state = watch(page);

  await page.goto(app("/"));
  await page
    .getByRole("navigation")
    .first()
    .getByRole("link", { name: "Servicios", exact: true })
    .click();
  await expect(page).toHaveURL(`${publicUrl}/servicios`);
  await page
    .getByRole("navigation")
    .first()
    .getByRole("link", { name: "Proyectos", exact: true })
    .click();
  await expect(page).toHaveURL(`${publicUrl}/proyectos`);

  expectClean(state, "client-side navigation");
});

test("manifest, robots and service worker stay confined to the prefix", async ({
  page,
  request,
}) => {
  const manifest = await (await request.get(app("/manifest.webmanifest"))).json();
  expect(manifest.start_url).toBe(basePath);
  expect(manifest.scope).toBe(basePath);
  for (const icon of manifest.icons as Array<{ src: string }>) {
    expect(insidePrefix(icon.src)).toBe(true);
    expect((await request.get(icon.src)).status()).toBe(200);
  }
  for (const shortcut of manifest.shortcuts as Array<{ url: string }>) {
    expect(insidePrefix(shortcut.url)).toBe(true);
  }

  const robots = await (await request.get(app("/robots.txt"))).text();
  expect(robots).toContain(`Disallow: ${basePath}/admin`);
  expect(robots).toContain(`Sitemap: ${publicUrl}/sitemap.xml`);

  const sitemap = await (await request.get(app("/sitemap.xml"))).text();
  const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
  expect(locations.length).toBeGreaterThan(10);
  expect(locations.filter((url) => !url.startsWith(publicUrl))).toEqual([]);

  const worker = await request.get(app("/sw.js"));
  expect(worker.headers()["service-worker-allowed"]).toBeUndefined();

  await page.goto(app("/"));
  await page.waitForLoadState("load");
  await page.waitForTimeout(1_000);
  const registrations = await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).map((item) => item.scope),
  );
  expect(registrations).toEqual([]);
});

test("language preference is saved through the prefixed API in a scoped cookie", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  const state = watch(page);
  await page.goto(app("/"));
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");

  const selector = page.getByRole("group", { name: "Idioma" });
  await selector.scrollIntoViewIfNeeded();
  const [localeResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/locale")),
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    selector.getByRole("button", { name: "Cambiar a English" }).click(),
  ]);
  expect(new URL(localeResponse.url()).pathname).toBe(app("/api/locale"));
  expect(localeResponse.status()).toBe(200);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(publicUrl);
  const cookie = (await context.cookies()).find(
    (item) => item.name === "arqvia_locale",
  );
  expect(cookie).toMatchObject({ path: basePath, value: "en" });

  await page.goto(app("/servicios"));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  expectClean(state, "the language switch");
});

test("quote form submits to the prefixed lead API and lands on the thank-you page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");
  test.setTimeout(90_000);

  const prisma = new PrismaClient();
  const suffix = Date.now();
  const name = `Consulta Arqvia ${suffix}`;
  const email = `base-path-${suffix}@arqvia.test`;
  const state = watch(page);

  try {
    await page.goto(app("/contacto"));
    await page.getByLabel(/nombre completo/i).fill(name);
    await page.getByLabel(/whatsapp/i).fill("+54 351 555 0000");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/ciudad/i).fill("Córdoba Capital");
    await page
      .getByText(/agregar superficie, presupuesto, visita o archivos/i)
      .click();
    await page.getByLabel(/tipo de cliente/i).selectOption({ label: "Particular" });
    await page.getByLabel(/tipo de proyecto/i).selectOption({ label: "Remodelación" });
    await page
      .getByLabel(/estado actual/i)
      .selectOption({ label: "Necesito remodelar un espacio existente" });
    await page
      .getByLabel(/mensaje/i)
      .fill("Consulta de prueba del sitio servido bajo un prefijo de ruta.");

    const [leadResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/leads"),
      ),
      page.getByRole("button", { name: /solicitar evaluación/i }).click(),
    ]);
    expect(new URL(leadResponse.url()).pathname).toBe(app("/api/leads"));
    expect(leadResponse.ok()).toBe(true);
    await expect(page).toHaveURL(new RegExp(`^${publicUrl}/gracias`));

    const lead = await prisma.lead.findFirstOrThrow({ where: { email } });
    expect(lead.name).toBe(name);
    expectClean(state, "the quote form");
  } finally {
    const leads = await prisma.lead.findMany({
      where: { email },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: leads.map((lead) => lead.id) } },
    });
    await prisma.lead.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
});

test("lead API origin check works under the prefix", async ({ request }) => {
  const foreign = await request.post(app("/api/leads"), {
    data: {},
    headers: { origin: "https://example.invalid" },
  });
  expect(foreign.status()).toBe(403);

  const sameOrigin = await request.post(app("/api/leads"), {
    data: { name: "", email: "sin-email", message: "corto" },
    headers: { origin, "x-forwarded-for": "203.0.113.94" },
  });
  expect(sameOrigin.status()).toBe(400);
});

test("requests outside the prefix move to the public URL keeping the path", async ({
  request,
}) => {
  const cases: Array<[string, string]> = [
    ["/", publicUrl],
    ["/servicios", `${publicUrl}/servicios`],
    ["/proyectos/casa-patio?ref=viejo", `${publicUrl}/proyectos/casa-patio?ref=viejo`],
    ["/admin/login", `${publicUrl}/admin/login`],
  ];

  for (const [path, expected] of cases) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(308);
    expect(response.headers().location, path).toBe(expected);
  }

  // Nothing under the prefix is redirected away (no loops).
  for (const path of ["/", "/servicios", "/api/ready", "/icons/arqvia-192.png"]) {
    const response = await request.get(app(path), { maxRedirects: 0 });
    expect(response.status(), app(path)).toBe(200);
  }
});

test("admin session lives entirely under the prefix", async ({
  context,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One admin session is enough");
  test.setTimeout(180_000);
  await context.clearCookies();
  const state = watch(page);

  // Anonymous access goes to the prefixed login with an app-relative callback.
  await page.goto(app("/admin/leads"));
  await expect(page).toHaveURL(
    `${publicUrl}/admin/login?callbackUrl=${encodeURIComponent("/admin/leads")}`,
  );
  const anonymousApi = await page.request.get(app("/api/admin/references?type=user"));
  expect(anonymousApi.status()).toBe(403);
  state.failedResponses.length = 0;

  // A wrong password is rejected in place.
  await page.locator("#admin-email").fill(adminEmail);
  await page.locator("#admin-password").fill("not-the-password");
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`^${publicUrl}/admin/login`));

  await page.locator("#admin-password").fill(adminPassword);
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page).toHaveURL(`${publicUrl}/admin/leads`, { timeout: 20_000 });

  const cookies = await context.cookies();
  const session = cookies.find((item) => item.name.endsWith(".session-token"));
  expect(session?.name).toBe(`${basePath.slice(1)}.session-token`);
  expect(session?.path).toBe(basePath);
  expect(session?.httpOnly).toBe(true);
  expect(cookies.filter((item) => item.name.includes("authjs"))).toEqual([]);
  expect(cookies.filter((item) => item.path === "/")).toEqual([]);

  const adminPages = [
    "/admin",
    "/admin/leads",
    "/admin/projects",
    "/admin/services",
    "/admin/blog",
    "/admin/media",
    "/admin/team",
    "/admin/settings",
    "/admin/users",
    "/admin/visitas",
    "/admin/reports",
    "/admin/activity",
    "/admin/system",
  ];
  for (const path of adminPages) {
    const response = await page.goto(app(path), { waitUntil: "load" });
    expect(response?.status(), path).toBe(200);
    await expect(page).toHaveURL(`${publicUrl}${path}`);
    await expectDocumentInsidePrefix(page, path);
  }

  // Plain GET form (not next/link): must post back inside the prefix.
  await page.goto(app("/admin/users"));
  await page
    .locator(`form[action="${app("/admin/users")}"] input[name="q"]`)
    .fill("admin");
  await page
    .locator(`form[action="${app("/admin/users")}"]`)
    .getByRole("button", { name: "Filtrar" })
    .click();
  await expect(page).toHaveURL(new RegExp(`^${publicUrl}/admin/users\\?`));

  // Plain anchors to API downloads.
  await page.goto(app("/admin/leads"));
  const exportHref = await page
    .locator(`a[href^="${app("/api/admin/leads/export")}"]`)
    .first()
    .getAttribute("href");
  // The export requires a same-origin source, as a real anchor click sends.
  const exported = await page.request.get(exportHref!, {
    headers: { referer: `${publicUrl}/admin/leads` },
  });
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-type"]).toContain("text/csv");

  // Client fetch to the admin API (reference search) goes through the prefix.
  const references = await page.request.get(app("/api/admin/references?type=user"));
  expect(references.status()).not.toBe(404);

  // A client navigation inside the panel.
  await page.goto(app("/admin"));
  await page.getByRole("link", { name: /consultas|leads/i }).first().click();
  await expect(page).toHaveURL(new RegExp(`^${publicUrl}/admin/leads`));

  // Logging out returns to the demo home, not to the root of the domain.
  await page.locator("form button", { hasText: "Salir" }).first().click();
  await expect(page).toHaveURL(publicUrl, { timeout: 20_000 });
  expect(
    (await context.cookies()).filter((item) => item.name.endsWith(".session-token")),
  ).toEqual([]);

  await page.goto(app("/admin"));
  await expect(page).toHaveURL(
    `${publicUrl}/admin/login?callbackUrl=${encodeURIComponent("/admin")}`,
  );

  expectClean(state, "the admin journey");
});
