import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";

const testOrigin =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://localhost:${process.env.PLAYWRIGHT_PORT || "3100"}`;
const analyticsProvider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || "none";

/**
 * Un píxel transparente en lugar de cada imagen optimizada.
 *
 * Las pruebas de desborde miden el ancho que dicta el CSS, y `next/image`
 * reserva su caja antes de descargar nada: lo que llegue por la red no cambia
 * el resultado. Pedir las imágenes de verdad, en cambio, sí rompe. Cambiar de
 * viewport hace que el navegador vuelva a elegir del `srcset`, y la navegación
 * siguiente cancela esas peticiones a medio camino; con la caché de imágenes
 * fría —la de cualquier máquina de integración— el servidor queda esperando
 * optimizaciones que ya nadie va a reclamar. Como el navegador abre seis
 * conexiones por origen, las navegaciones siguientes encolan detrás de esas y
 * se cuelgan esperando `load` para siempre.
 */
const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function stubOptimizedImages(page: Page) {
  await page.route("**/_next/image**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PIXEL }),
  );
}

type EstimatorFixture = {
  client: PrismaClient;
  enabled: boolean;
  updatedAt: Date;
  version: number;
};

let estimatorFixture: EstimatorFixture | null = null;

test.beforeEach(async ({}, testInfo) => {
  if (!/^estimator (transfers|rejects)/i.test(testInfo.title)) return;

  const client = new PrismaClient();
  const original = await client.estimateConfig.findUniqueOrThrow({
    where: { id: "arqvia-estimator" },
    select: { enabled: true, updatedAt: true, version: true },
  });
  estimatorFixture = { client, ...original };

  if (!original.enabled) {
    await client.estimateConfig.update({
      where: { id: "arqvia-estimator" },
      data: { enabled: true },
    });
  }
});

test.afterEach(async ({}, testInfo) => {
  if (!/^estimator (transfers|rejects)/i.test(testInfo.title)) return;
  const fixture = estimatorFixture;
  estimatorFixture = null;
  if (!fixture) return;

  try {
    await fixture.client.estimateConfig.update({
      where: { id: "arqvia-estimator" },
      data: {
        enabled: fixture.enabled,
        updatedAt: fixture.updatedAt,
        version: fixture.version,
      },
    });
  } finally {
    await fixture.client.$disconnect();
  }
});

async function getJsonLdSchemas(page: Page) {
  return page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent || "{}")),
    );
}

async function expectCanonical(page: Page, pathname: string) {
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute("href", /^https?:\/\//);
  const href = await canonical.getAttribute("href");
  const canonicalUrl = new URL(href!);
  expect(
    canonicalUrl.protocol === "https:" || canonicalUrl.hostname === "localhost",
  ).toBe(true);
  expect(new URL(href!).pathname).toBe(pathname);
}

function findSchema(
  schemas: Array<Record<string, unknown>>,
  type: string,
): Record<string, unknown> | undefined {
  return schemas.find((schema) => {
    const schemaType = schema["@type"];
    return Array.isArray(schemaType)
      ? schemaType.includes(type)
      : schemaType === type;
  });
}

function expectBreadcrumbTrail(
  schemas: Array<Record<string, unknown>>,
  expectedPathnames: string[],
) {
  const breadcrumb = findSchema(schemas, "BreadcrumbList");
  expect(breadcrumb).toBeTruthy();

  const itemListElement = breadcrumb!.itemListElement as Array<{ item: string }>;
  const items = itemListElement.map(
    (item) => new URL(item.item).pathname,
  );

  expect(items).toEqual(expectedPathnames);
}

function expectAbsolutePublicUrl(value: string) {
  expect(value).toMatch(/^https?:\/\//);
  const url = new URL(value);
  expect(url.protocol === "https:" || url.hostname === "localhost").toBe(true);
}

function getSubmittedLeadPayload(
  request: import("@playwright/test").Request,
): Record<string, unknown> {
  const contentType = request.headers()["content-type"] || "";
  if (contentType.includes("application/json")) {
    return request.postDataJSON() as Record<string, unknown>;
  }

  const body = request.postData() || "";
  const payloadPart = body.match(
    /name="payload"\r?\n\r?\n([\s\S]*?)\r?\n--/,
  );
  if (!payloadPart) throw new Error("Lead multipart payload was not found");
  return JSON.parse(payloadPart[1]) as Record<string, unknown>;
}

test("home exposes conversion paths and portfolio", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /arquitectura pensada para construirse bien/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /solicitar presupuesto/i }).first()).toBeVisible();
  await page.getByRole("link", { name: /ver proyectos/i }).first().click();
  await expect(page).toHaveURL(/\/proyectos/);
  await expect(
    page.getByRole("heading", { name: /proyectos construidos para vivir/i }),
  ).toBeVisible();

  expect(pageErrors).toEqual([]);
});

const forbiddenPublicCopyPatterns = [
  /\btemplate\b/i,
  /\bdemo\b/i,
  /\beditable\b/i,
  /\bplaceholder\b/i,
  /campo editable/i,
  /datos demo/i,
  /hero seleccionado/i,
  /\bconcepto\b/i,
  /\bconceptual(:es)\b/i,
  /cta contextual/i,
  /lead listo/i,
  /reemplazar antes de publicar/i,
  /p.gina preparada/i,
  /\bacceso interno\b/i,
];

for (const path of [
  "/",
  "/servicios",
  "/servicios/diseno-arquitectonico",
  "/servicios/renders-visualizacion",
  "/proceso",
  "/proyectos",
  "/nosotros",
  "/contacto",
  "/estimador",
  "/faq",
  "/blog",
  "/blog/anteproyecto-vs-proyecto-ejecutivo",
  "/remodelacion-de-cocinas-cordoba",
]) {
  test(`public copy has no internal product wording: ${path}`, async ({ page }) => {
    await page.goto(path);
    const visibleText = await page.locator("body").innerText();

    for (const pattern of forbiddenPublicCopyPatterns) {
      expect(visibleText).not.toMatch(pattern);
    }
  });
}

test("footer keeps administration out of public navigation and copy", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator('header a[href^="/admin"]')).toHaveCount(0);
  await expect(page.locator('footer a[href^="/admin"]')).toHaveCount(0);
  await expect(page.locator("footer")).not.toContainText(/acceso interno/i);
});

test("footer keeps desktop columns and groups long navigation on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const footer = page.locator("footer");
  const mobileGroups = footer.locator("details");
  await expect(mobileGroups).toHaveCount(3);
  await expect(mobileGroups.first()).toBeHidden();
  await expect(
    footer
      .locator('[data-footer-group="Servicios"] > div')
      .getByRole("link")
      .first(),
  ).toBeVisible();
  await expect(footer.locator('a[href^="tel:"]')).toHaveAttribute(
    "href",
    "tel:+543515551234",
  );
  await expect(footer.locator('a[href^="mailto:"]')).toHaveAttribute(
    "href",
    "mailto:hola@arqvia.com.ar",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const servicesGroup = footer
    .locator('[data-footer-group="Servicios"]')
    .locator("details");
  const servicesSummary = servicesGroup.locator("summary");

  await expect(servicesSummary).toBeVisible();
  await expect(servicesGroup).not.toHaveAttribute("open", "");
  await servicesSummary.focus();
  await page.keyboard.press("Enter");
  await expect(servicesGroup).toHaveAttribute("open", "");
  await expect(servicesGroup.getByRole("link").first()).toBeVisible();

  const resourcesGroup = footer
    .locator('[data-footer-group="Recursos"]')
    .locator("details");
  await resourcesGroup.locator("summary").press("Enter");
  await resourcesGroup.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page).toHaveURL(/\/blog$/);
});

test("mobile menu traps focus and closes accessibly", async ({ page }) => {
  await stubOptimizedImages(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.locator('button[aria-controls="mobile-site-menu"]');
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");

  const mobileMenu = page.getByRole("navigation", { name: "Mobile" });
  const firstLink = mobileMenu.getByRole("link", { name: "Inicio", exact: true });
  const lastLink = mobileMenu.getByRole("link", { name: /solicitar presupuesto/i });
  await expect(firstLink).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(lastLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();

  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();
});

test("mobile menu remains fully usable on a short landscape viewport", async ({
  page,
}) => {
  await stubOptimizedImages(page);
  await page.setViewportSize({ width: 640, height: 320 });
  await page.goto("/");

  await page.locator('button[aria-controls="mobile-site-menu"]').click();
  const mobileMenu = page.getByRole("navigation", { name: "Mobile" });
  const quoteLink = mobileMenu.getByRole("link", {
    name: /solicitar presupuesto/i,
  });

  await quoteLink.scrollIntoViewIfNeeded();
  await expect(quoteLink).toBeVisible();
  await expect(quoteLink).toBeEnabled();
});

test("header identifies the active public section", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/proyectos/casa-patio-norte");

  const primaryNavigation = page.locator('nav[aria-label="Principal"]');
  await expect(primaryNavigation.locator('a[href="/proyectos"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(primaryNavigation.locator('a[href="/servicios"]')).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("home reveals sections on scroll without moving the hero image", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const heroImage = page.locator('[data-testid="hero-architectural-image"]');
  await expect(heroImage).toBeVisible();
  expect(
    await heroImage.evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");

  const process = page.locator(".process-grid.scroll-reveal");
  await process.scrollIntoViewIfNeeded();
  await expect(process).toHaveClass(/is-visible/);
  await expect
    .poll(() => process.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
  await expect
    .poll(() => process.evaluate((element) => getComputedStyle(element).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
});

test("reduced motion keeps animated content in its final state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const heroTitle = page.locator(".hero-reveal").first();
  const process = page.locator(".process-grid.scroll-reveal");
  await process.scrollIntoViewIfNeeded();

  for (const element of [heroTitle, process]) {
    await expect(element).toBeVisible();
    await expect
      .poll(() =>
        element.evaluate((node) => ({
          animation: getComputedStyle(node).animationName,
          opacity: getComputedStyle(node).opacity,
          transform: getComputedStyle(node).transform,
        })),
      )
      .toEqual({ animation: "none", opacity: "1", transform: "none" });
  }
});

test("admin surfaces send no-store and noindex headers", async ({ request }) => {
  const loginResponse = await request.get("/admin/login");
  expect(loginResponse.status()).toBe(200);
  expect(loginResponse.headers()["cache-control"]).toContain("no-store");
  expect(loginResponse.headers()["x-robots-tag"]).toContain("noindex");

  const exportResponse = await request.get("/api/admin/leads/export");
  expect(exportResponse.status()).toBe(403);
  expect(exportResponse.headers()["cache-control"]).toContain("no-store");
  expect(exportResponse.headers()["x-robots-tag"]).toContain("noindex");

  const activityExportResponse = await request.get(
    "/api/admin/activity/export",
  );
  expect(activityExportResponse.status()).toBe(403);

  const retentionResponse = await request.post("/api/cron/retention");
  expect(retentionResponse.status()).toBe(401);
});

test("public pages expose production security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(headers["content-security-policy"]).toContain("worker-src 'self'");
  expect(headers["content-security-policy"]).toContain("manifest-src 'self'");
});

test("PWA manifest, icons and service worker are production ready", async ({
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  expect(manifestResponse.headers()["content-type"]).toContain(
    "application/manifest+json",
  );

  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    short_name: "Arqvia",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.status(), icon.src).toBe(200);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }

  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.status()).toBe(200);
  expect(workerResponse.headers()["cache-control"]).toContain("no-store");
  expect(workerResponse.headers()["service-worker-allowed"]).toBe("/");
  expect(workerResponse.headers()["content-security-policy"]).toContain(
    "connect-src 'self'",
  );
  const workerSource = await workerResponse.text();
  expect(workerSource).toContain('const PRIVATE_PATH_PREFIXES = ["/admin", "/api"]');
  expect(workerSource).not.toContain("cache.put(");
});

test("offline navigation uses Arqvia fallback without caching private data", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.goto("/contacto");
    await expect(
      page.getByRole("heading", { name: /volvamos a conectar/i }),
    ).toBeVisible();
    await expect(
      page.locator("main > p").filter({ hasText: /el sitio no pudo responder/i }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  await expect(page.getByRole("heading", { name: /contanos sobre tu proyecto/i })).toBeVisible({
    timeout: 10_000,
  });
});

test("quote form preserves entered data while offline", async ({ context, page }) => {
  await page.goto("/contacto");
  const name = page.getByLabel(/nombre completo/i);
  const message = page.getByLabel(/mensaje/i);

  await name.fill("Consulta sin conexión");
  await page.getByLabel(/whatsapp/i).fill("+54 351 555 1515");
  await page.getByLabel(/email/i).fill("offline@example.com");
  await page.getByLabel(/ciudad/i).fill("Córdoba Capital");
  await page.getByLabel(/tipo de proyecto/i).selectOption({ label: "Remodelación" });
  await message.fill("Necesito revisar una remodelación residencial completa.");

  await context.setOffline(true);
  try {
    await page.getByRole("button", { name: /solicitar evaluaci/i }).click();
    await expect(
      page.locator('[role="alert"]').filter({ hasText: /sin conexi.n/i }),
    ).toContainText(/sin conexi.n/i);
    await expect(name).toHaveValue("Consulta sin conexión");
    await expect(message).toHaveValue(
      "Necesito revisar una remodelación residencial completa.",
    );
    await expect(page).toHaveURL(/\/contacto$/);
  } finally {
    await context.setOffline(false);
  }
});

test("health and readiness endpoints expose only operational status", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toContain("no-store");
  expect(await health.json()).toEqual({ status: "ok" });

  const readiness = await request.get("/api/ready");
  expect(readiness.status()).toBe(200);
  expect(readiness.headers()["cache-control"]).toContain("no-store");
  const payload = await readiness.json();
  expect(payload).toEqual({
    status: "ready",
    checks: { database: "ok", essentialTables: "ok" },
  });
  expect(JSON.stringify(payload)).not.toMatch(/database_url|secret|password|sqlite|postgres/i);
});

test("public WhatsApp links always include a phone number", async ({ page }) => {
  for (const path of ["/", "/contacto", "/servicios/construccion-llave-en-mano", "/proyectos/casa-patio-norte"]) {
    await page.goto(path);
    const links = await page
      .locator('a[href^="https://wa.me"]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
      );

    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
      expect(href).not.toContain("wa.me/?text=");
    }
  }
});

test("thank you page WhatsApp CTA asks for photos and plans", async ({ page }) => {
  await page.goto("/gracias");
  const whatsappHref = await page
    .getByRole("link", { name: /escribir por whatsapp/i })
    .getAttribute("href");

  expect(whatsappHref).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
  expect(decodeURIComponent(whatsappHref!)).toContain(
    "sumar fotos, planos o referencias",
  );
});

test("lead API rejects cross-origin and invalid submissions", async ({ request }) => {
  const sameOriginHeaders = {
    origin: testOrigin,
    "x-forwarded-for": "203.0.113.91",
  };

  const blocked = await request.post("/api/leads", {
    data: {},
    headers: { origin: "https://example.invalid" },
  });
  expect(blocked.status()).toBe(403);
  await expect(blocked.json()).resolves.toMatchObject({
    message: "Origen no permitido",
  });

  const blockedReferer = await request.post("/api/leads", {
    data: {},
    headers: { referer: "https://example.invalid/contacto" },
  });
  expect(blockedReferer.status()).toBe(403);
  await expect(blockedReferer.json()).resolves.toMatchObject({
    message: "Origen no permitido",
  });

  const invalid = await request.post("/api/leads", {
    headers: sameOriginHeaders,
    data: {
      name: "",
      email: "sin-email",
      phone: "123",
      city: "",
      projectType: "",
      message: "corto",
      sourcePage: "/contacto",
    },
  });
  expect(invalid.status()).toBe(400);
  const payload = await invalid.json();
  expect(payload.message).toMatch(/revis/i);
  expect(payload.errors).toHaveProperty("email");
  expect(payload.errors).toHaveProperty("projectType");

  const nonJson = await request.post("/api/leads", {
    headers: sameOriginHeaders,
    form: {
      name: "Consulta sin JSON",
    },
  });
  expect(nonJson.status()).toBe(415);

  const invalidSource = await request.post("/api/leads", {
    headers: sameOriginHeaders,
    data: {
      name: "Consulta Origen",
      email: "origen@example.com",
      phone: "+54 351 555 0000",
      city: "Córdoba Capital",
      projectType: "Remodelación",
      message: "Quiero revisar una remodelación con origen inválido.",
      sourcePage: "https://example.invalid/contacto",
    },
  });
  expect(invalidSource.status()).toBe(400);
  await expect(invalidSource.json()).resolves.toMatchObject({
    errors: expect.objectContaining({ sourcePage: expect.any(Array) }),
  });

  const oversizedJson = await request.post("/api/leads", {
    headers: {
      origin: testOrigin,
      "x-forwarded-for": "203.0.113.92",
    },
    data: {
      message: "x".repeat(65 * 1024),
    },
  });
  expect(oversizedJson.status()).toBe(413);
  await expect(oversizedJson.json()).resolves.toMatchObject({
    message: expect.stringMatching(/64 KB/),
  });
});

test("robots and sitemap expose public SEO routes only", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /admin");
  expect(robotsText).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("/proyectos/casa-patio-norte");
  expect(sitemapText).toContain("/servicios/construccion-llave-en-mano");
  expect(sitemapText).not.toContain("/estimador");
  expect(sitemapText).toContain("/remodelacion-de-cocinas-cordoba");
  expect(sitemapText).toContain("/zonas/cordoba-capital");
  expect(sitemapText).not.toContain("/admin");
  expect(sitemapText).not.toContain("/gracias");

  const sitemapUrls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    ([, location]) => new URL(location),
  );
  expect(sitemapUrls.length).toBeGreaterThan(20);
  const sitemapOrigin = sitemapUrls[0].origin;
  expect(
    sitemapOrigin.startsWith("https://") || sitemapOrigin.startsWith("http://localhost"),
  ).toBe(true);

  for (const sitemapUrl of sitemapUrls) {
    expect(sitemapUrl.origin, sitemapUrl.href).toBe(sitemapOrigin);
    const response = await request.get(`${sitemapUrl.pathname}${sitemapUrl.search}`);
    expect(response.status(), sitemapUrl.href).toBeLessThan(400);
  }
});

test("primary public journeys do not expose broken internal links", async ({
  page,
  request,
}) => {
  const entryPaths = [
    "/",
    "/proyectos",
    "/servicios",
    "/proceso",
    "/nosotros",
    "/blog",
    "/faq",
    "/contacto",
  ];
  const internalLinks = new Set(entryPaths);

  for (const entryPath of entryPaths) {
    await page.goto(entryPath);
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
    );

    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== testOrigin || url.pathname.startsWith("/admin")) continue;
      internalLinks.add(`${url.pathname}${url.search}`);
    }
  }

  for (const href of internalLinks) {
    const response = await request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test("home exposes structured business data for local search", async ({ page }) => {
  await page.goto("/");
  const jsonLdScripts = await getJsonLdSchemas(page);
  const business = findSchema(jsonLdScripts, "HomeAndConstructionBusiness");

  expect(business).toBeTruthy();
  expect(business!.name).toBe("Arqvia");
  expect(business!.priceRange).toBeUndefined();
  expect((business!.address as Record<string, unknown>)["@type"]).toBe(
    "PostalAddress",
  );
  expect(
    (business!.address as Record<string, unknown>).streetAddress,
  ).toBeUndefined();
  expect(business!.hasOfferCatalog).toBeUndefined();
  const servedAreaNames = (business!.areaServed as Array<Record<string, string>>)
    .map((area) => area.name);
  expect(servedAreaNames).toEqual(
    expect.arrayContaining(["Córdoba Capital", "Villa Allende"]),
  );
});

test("service pages expose commercial service schema", async ({ page }) => {
  await page.goto("/servicios/construccion-llave-en-mano");
  await expect(
    page.getByRole("heading", { name: /beneficios para el proyecto/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/presupuesto por etapas|un solo equipo coordina/i).first(),
  ).toBeVisible();

  await expectCanonical(page, "/servicios/construccion-llave-en-mano");
  const jsonLdScripts = await getJsonLdSchemas(page);
  const service = findSchema(jsonLdScripts, "Service");

  expect(service).toBeTruthy();
  expect(service!.name).toContain("Construcci");
  expect((service!.provider as Record<string, unknown>)["@type"]).toBe(
    "HomeAndConstructionBusiness",
  );
  expect(service!.offers).toBeUndefined();
  expect(
    (service!.availableChannel as Record<string, string>).serviceUrl,
  ).toContain("/contacto");
  expectBreadcrumbTrail(jsonLdScripts, [
    "/",
    "/servicios",
    "/servicios/construccion-llave-en-mano",
  ]);
});

test("blog and project detail expose complete structured media data", async ({
  page,
}) => {
  await page.goto("/blog/anteproyecto-vs-proyecto-ejecutivo");
  await expectCanonical(page, "/blog/anteproyecto-vs-proyecto-ejecutivo");
  const blogSchemas = await getJsonLdSchemas(page);
  const article = findSchema(blogSchemas, "Article");

  expect(article).toBeTruthy();
  expectAbsolutePublicUrl(article!.image as string);
  expect(article!.datePublished).toBeTruthy();
  expect(article!.dateModified).toBeTruthy();
  expect(findSchema(blogSchemas, "FAQPage")).toBeUndefined();
  expectBreadcrumbTrail(blogSchemas, [
    "/",
    "/blog",
    "/blog/anteproyecto-vs-proyecto-ejecutivo",
  ]);

  await page.goto("/proyectos/casa-patio-norte");
  await expectCanonical(page, "/proyectos/casa-patio-norte");
  const projectSchemas = await getJsonLdSchemas(page);
  const project = findSchema(projectSchemas, "Project");

  expect(project).toBeTruthy();
  for (const src of project!.image as string[]) {
    expectAbsolutePublicUrl(src);
  }
  expectBreadcrumbTrail(projectSchemas, [
    "/",
    "/proyectos",
    "/proyectos/casa-patio-norte",
  ]);
});

test("blog guide uses editorial sections, functional anchors and one contextual CTA", async ({
  page,
}) => {
  await page.goto("/blog/anteproyecto-vs-proyecto-ejecutivo");

  await expect(page.locator('article img[alt=""]')).toHaveCount(1);

  const index = page.getByRole("navigation", {
    name: /índice del artículo/i,
  });
  const indexLinks = index.getByRole("link");
  await expect(indexLinks).toHaveCount(3);

  const sectionHrefs = await indexLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  );
  for (const href of sectionHrefs) {
    expect(href).toMatch(/^#[a-z0-9-]+$/);
    await expect(page.locator(href!)).toHaveCount(1);
  }

  await indexLinks.first().click();
  await expect(page).toHaveURL(/#el-anteproyecto-define-la-idea$/);
  await expect(
    page.getByRole("heading", { name: "El anteproyecto define la idea" }),
  ).toBeVisible();

  await expect(page.getByText("Qué preparar antes de consultar")).toHaveCount(0);
  await expect(page.getByText("Qué conviene dejar definido")).toHaveCount(0);
  await expect(
    page.getByText("De la consulta inicial a los próximos pasos"),
  ).toHaveCount(0);

  const contextualCta = page.getByTestId("blog-contextual-cta");
  await expect(contextualCta.getByRole("link")).toHaveCount(1);
  await expect(contextualCta.getByRole("link")).toHaveAttribute(
    "href",
    /origen=%2Fblog%2Fanteproyecto-vs-proyecto-ejecutivo/,
  );

  const relatedContent = page.getByRole("heading", {
    name: "Contenido relacionado",
  });
  await expect(relatedContent).toBeVisible();
  const relatedSection = relatedContent.locator("xpath=ancestor::section[1]");
  await expect(
    relatedSection.getByRole("link", { name: /diseño arquitectónico/i }),
  ).toHaveAttribute("href", "/servicios/diseno-arquitectonico");
  await expect(relatedSection.locator('a[href^="/blog/"]')).toHaveCount(2);
});

test("blog and footer wrap long managed copy without horizontal overflow", async ({
  page,
}) => {
  await stubOptimizedImages(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog/anteproyecto-vs-proyecto-ejecutivo", {
    waitUntil: "domcontentloaded",
  });
  await page.evaluate(() => document.fonts.ready);

  const unbrokenText = "arquitectura".repeat(40);
  await page.locator("article h1").evaluate((element, value) => {
    element.textContent = value;
  }, unbrokenText);
  await page.locator('footer a[href^="mailto:"] span').evaluate((element, value) => {
    element.textContent = value;
  }, `${unbrokenText}@example.com`);

  const overflowState = await page.evaluate(() => {
    const articleTitle = document.querySelector("article h1");
    const emailLink = document.querySelector('footer a[href^="mailto:"]');

    return {
      articleTitle:
        articleTitle!.scrollWidth > articleTitle!.clientWidth,
      document:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      emailLink: emailLink!.scrollWidth > emailLink!.clientWidth,
    };
  });
  expect(overflowState).toEqual({
    articleTitle: false,
    document: false,
    emailLink: false,
  });
});

test("local SEO pages expose canonical URL and breadcrumb schema", async ({ page }) => {
  await page.goto("/remodelacion-de-cocinas-cordoba");
  await expectCanonical(page, "/remodelacion-de-cocinas-cordoba");

  const schemas = await getJsonLdSchemas(page);
  expect(findSchema(schemas, "Service")).toBeTruthy();
  expect(findSchema(schemas, "FAQPage")).toBeTruthy();
  expectBreadcrumbTrail(schemas, ["/", "/remodelacion-de-cocinas-cordoba"]);

  await page.goto("/zonas/cordoba-capital");
  await expectCanonical(page, "/zonas/cordoba-capital");
  const areaSchemas = await getJsonLdSchemas(page);
  expect(findSchema(areaSchemas, "FAQPage")).toBeTruthy();
  expectBreadcrumbTrail(areaSchemas, ["/", "/zonas/cordoba-capital"]);
});

test("quote form validates required fields", async ({ page }) => {
  await page.goto("/contacto");
  await page.getByRole("button", { name: /solicitar evaluaci/i }).click();
  await expect(page.locator("#name-error")).toBeVisible();
  await expect(page.locator("#projectType-error")).toBeVisible();
});

test("home prioritizes projects and does not advertise the estimator", async ({
  page,
}) => {
  await page.goto("/");
  // El índice de obra de la portada es la sección de proyectos: su enlace a
  // /proyectos es el que tiene que estar a la vista.
  await expect(
    page.getByRole("link", { name: /ver (todos los )?proyectos/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /estim. un rango inicial para tu proyecto/i }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /estimador/i })).toHaveCount(0);
});

test("public discovery pages lead with useful content instead of repeated guidance", async ({
  page,
}) => {
  await page.goto("/proyectos");
  await expect(page.getByLabel(/filtros de proyectos/i)).toBeVisible();
  await expect(page.getByText(/buscás un resultado similar/i)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /querés evaluar un proyecto similar/i }),
  ).toBeVisible();

  await page.goto("/servicios");
  await expect(
    page.getByRole("heading", { name: /diseño, obra e interiores con un alcance claro/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /qué servicio necesitás según tu etapa/i }),
  ).toHaveCount(0);

  await page.goto("/servicios/construccion-llave-en-mano");
  await expect(
    page.getByRole("heading", { name: /beneficio principal/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /qué incluye/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /qué necesita el cliente para empezar/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /^entregables$/i }),
  ).toHaveCount(0);

  await page.goto("/faq");
  await expect(
    page.getByRole("heading", { name: /respuestas para avanzar con más claridad/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /seguís con dudas/i }),
  ).toBeVisible();

  await page.goto("/contacto");
  await expect(
    page.getByRole("heading", { name: /contanos sobre tu proyecto/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /solicitar evaluación/i }),
  ).toBeVisible();
  await expect(page.locator('main a[href^="tel:"]')).toHaveAttribute(
    "href",
    "tel:+543515551234",
  );
  await expect(page.locator('main a[href^="mailto:"]')).toHaveAttribute(
    "href",
    "mailto:hola@arqvia.com.ar",
  );
  await expect(page.getByText(/después de enviar la consulta/i)).toHaveCount(0);
});

test("public discovery pages expose active filters and direct contact paths", async ({
  page,
}) => {
  await page.goto("/proyectos");
  await expect(
    page.getByRole("link", { name: "Todos", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.goto("/servicios");
  await expect(
    page.getByRole("link", { name: /consultar por whatsapp/i }),
  ).toBeVisible();

  await page.goto("/proceso");
  await expect(
    page.getByRole("link", { name: /consultar por whatsapp/i }),
  ).toBeVisible();
});

test("estimator transfers a server-confirmed range into the lead and thank-you flow", async ({
  page,
}) => {
  let submittedPayload: Record<string, unknown> | undefined;

  await page.route("**/api/leads", async (route) => {
    submittedPayload = getSubmittedLeadPayload(route.request());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        attachmentCount: 0,
        estimate: {
          projectTypeLabel: "Remodelación integral",
          finishTier: "PREMIUM",
          areaM2: 80,
          totalMinUsd: 45000,
          totalMaxUsd: 90000,
          configVersion: 1,
        },
      }),
      status: 201,
    });
  });

  await page.goto("/estimador");
  await expectCanonical(page, "/estimador");
  await page.getByRole("radio", { name: /remodelaci.n integral/i }).check();
  await page.getByLabel(/superficie aproximada/i).fill("80");
  await page.getByRole("radio", { name: /superior/i }).check();
  await page.getByRole("button", { name: /calcular rango orientativo/i }).click();

  await expect(page.getByText(/rango inicial estimado/i)).toBeVisible();
  await expect(page.getByText(/USD\s*45\.000/i)).toBeVisible();
  await page.getByRole("button", { name: /solicitar evaluaci.n profesional/i }).click();

  const projectInput = page.getByLabel(/tipo de proyecto estimado/i);
  const areaInput = page.getByLabel(/superficie estimada/i);
  await expect(projectInput).toHaveValue("Remodelación integral");
  await expect(projectInput).toHaveAttribute("readonly", "");
  await expect(areaInput).toHaveValue("80 m²");
  await expect(areaInput).toHaveAttribute("readonly", "");

  await page.getByLabel(/nombre completo/i).fill("Consulta Estimador");
  await page.getByLabel(/whatsapp/i).fill("+54 351 555 6767");
  await page.getByLabel(/email/i).fill("estimador@example.com");
  await page.getByLabel(/ciudad/i).fill("Córdoba Capital");
  await page
    .getByText(/agregar superficie, presupuesto, visita o archivos/i)
    .click();
  await page.getByLabel(/tipo de cliente/i).selectOption({ label: "Particular" });
  await page.getByLabel(/mensaje/i).fill(
    "Quiero validar el alcance de esta remodelación integral y coordinar los próximos pasos.",
  );
  await page.getByRole("button", { name: /solicitar evaluaci.n del proyecto/i }).click();

  await expect(page).toHaveURL(/\/gracias/);
  await expect(page.getByText(/rango asociado a tu consulta/i)).toBeVisible();
  await expect(page.getByText(/USD\s*45\.000/i)).toBeVisible();
  expect(submittedPayload).toMatchObject({
    sourcePage: "/estimador",
    projectType: "Remodelación integral",
    areaM2: "80 m²",
    budgetRange: "",
    estimateTier: "PREMIUM",
    estimateAreaM2: 80,
  });
  expect(submittedPayload?.estimateRuleId).toBeTruthy();
  expect(submittedPayload?.estimateConfigVersion).toBeTruthy();
});

test("project gallery supports keyboard navigation and restores focus", async ({
  page,
}) => {
  await page.goto("/proyectos/casa-patio-norte");
  const firstImage = page.getByRole("button", { name: /abrir imagen 1 de 2/i });
  await firstImage.click();

  const dialog = page.getByRole("dialog", { name: /galer.a de casa patio norte/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 / 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("2 / 2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(firstImage).toBeFocused();
});

test("estimator rejects unsupported and decimal surfaces instead of correcting them silently", async ({
  page,
}) => {
  await page.goto("/estimador");
  const area = page.getByLabel(/superficie aproximada/i);
  const calculate = page.getByRole("button", {
    name: /calcular rango orientativo/i,
  });

  for (const value of ["9", "2001", "123.4"]) {
    await area.fill(value);
    await calculate.click();
    await expect(page.locator("#estimate-area-error")).toBeVisible();
    await expect(page.getByText(/rango inicial estimado/i)).toHaveCount(0);
  }

  await area.fill("123");
  await calculate.click();
  await expect(page.locator("#estimate-area-error")).toHaveCount(0);
  await expect(page.getByText(/rango inicial estimado/i)).toBeVisible();
});

test("compact service quote form sends qualification fields", async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;

  await page.route("**/api/leads", async (route) => {
    submittedPayload = getSubmittedLeadPayload(route.request());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
      status: 201,
    });
  });

  await page.goto("/servicios/construccion-llave-en-mano");
  await expect(page.getByText(/diagn.stico r.pido/i)).toBeVisible();
  await page.getByLabel(/nombre completo/i).fill("Consulta Compacta");
  await page.getByLabel(/whatsapp/i).fill("+54 351 555 7777");
  await page.getByLabel(/email/i).fill("compacta@example.com");
  await page.getByLabel(/ciudad/i).fill("Villa Allende");
  await page.getByLabel(/tipo de proyecto/i).selectOption({ label: "Obra nueva" });
  await page
    .getByLabel(/etapa actual/i)
    .selectOption({ label: "Tengo planos" });
  await page
    .getByLabel(/rango de presupuesto/i)
    .selectOption({ label: "Más de USD 80.000" });
  await page.getByRole("checkbox", { name: /necesito visita/i }).check();
  await page.getByRole("checkbox", { name: /tengo planos o im.genes/i }).check();
  await page
    .getByLabel(/links de fotos, planos o referencias/i)
    .fill("https://drive.google.com/arqvia-referencias");
  await page
    .getByLabel(/mensaje/i)
    .fill("Necesitamos revisar una obra llave en mano con presupuesto por etapas.");
  await page.getByRole("button", { name: /solicitar evaluaci/i }).click();

  await expect(page).toHaveURL(/\/gracias/);
  expect(submittedPayload).toMatchObject({
    budgetRange: "Más de USD 80.000",
    currentStatus: "Tengo planos",
    hasPlans: true,
    needsVisit: true,
    referenceLinks: "https://drive.google.com/arqvia-referencias",
    sourcePage: "/servicios/construccion-llave-en-mano",
  });
});

test("contact form preserves project source from detail CTA", async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;

  await page.route("**/api/leads", async (route) => {
    submittedPayload = getSubmittedLeadPayload(route.request());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
      status: 201,
    });
  });

  await page.goto("/proyectos/casa-patio-norte");
  await expect(
    page.getByRole("link", { name: /pedir presupuesto/i }),
  ).toHaveAttribute("href", /origen=%2Fproyectos%2Fcasa-patio-norte/);
  await page.getByRole("link", { name: /pedir presupuesto/i }).click();
  await expect(
    page.getByText(/tomamos como referencia inicial/i),
  ).toBeVisible();
  await expect(page.getByText(/proyecto Casa Patio Norte/i)).toBeVisible();

  await page.getByLabel(/nombre completo/i).fill("Consulta Proyecto");
  await page.getByLabel(/whatsapp/i).fill("+54 351 555 8888");
  await page.getByLabel(/email/i).fill("proyecto@example.com");
  await page.getByLabel(/ciudad/i).fill("Villa Allende");
  await page
    .getByText(/agregar superficie, presupuesto, visita o archivos/i)
    .click();
  await page.getByLabel(/tipo de cliente/i).selectOption({ label: "Particular" });
  await page.getByLabel(/tipo de proyecto/i).selectOption({ label: "Obra nueva" });
  await page
    .getByLabel(/estado actual/i)
    .selectOption({ label: "Tengo terreno" });
  await page
    .getByLabel(/mensaje/i)
    .fill("Queremos consultar por una obra residencial similar al caso publicado.");
  await page.getByRole("button", { name: /solicitar evaluaci/i }).click();

  await expect(page).toHaveURL(/\/gracias/);
  expect(submittedPayload).toMatchObject({
    sourcePage: "/proyectos/casa-patio-norte",
  });
});

test("local SEO CTA preserves landing source in the quote flow", async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;

  await page.route("**/api/leads", async (route) => {
    submittedPayload = getSubmittedLeadPayload(route.request());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
      status: 201,
    });
  });

  await page.goto("/remodelacion-de-cocinas-cordoba");
  await expect(page.getByTestId("local-seo-primary-cta")).toHaveAttribute(
    "href",
    /origen=%2Fremodelacion-de-cocinas-cordoba/,
  );
  await expect(page.getByTestId("local-seo-final-cta")).toHaveAttribute(
    "href",
    /origen=%2Fremodelacion-de-cocinas-cordoba/,
  );
  await expect(
    page.getByRole("link", { name: /solicitar|pedir|evaluar/i }).first(),
  ).toHaveAttribute("href", /origen=%2Fremodelacion-de-cocinas-cordoba/);
  await expect(
    page
      .locator("footer")
      .getByRole("link", { name: /solicitar presupuesto/i })
      .first(),
  ).toHaveAttribute("href", /origen=%2Fremodelacion-de-cocinas-cordoba/);
  await page.getByRole("link", { name: /solicitar|pedir|evaluar/i }).first().click();
  await expect(
    page.getByText(/tomamos como referencia inicial/i),
  ).toBeVisible();

  await page.getByLabel(/nombre completo/i).fill("Consulta Landing Local");
  await page.getByLabel(/whatsapp/i).fill("+54 351 555 9999");
  await page.getByLabel(/email/i).fill("landing@example.com");
  await page.getByLabel(/ciudad/i).fill("Cordoba Capital");
  await page
    .getByText(/agregar superficie, presupuesto, visita o archivos/i)
    .click();
  await page.getByLabel(/tipo de cliente/i).selectOption({ label: "Particular" });
  await page.getByLabel(/tipo de proyecto/i).selectOption({ label: "Remodelación" });
  await page
    .getByLabel(/mensaje/i)
    .fill("Quiero revisar una remodelacion de cocina desde esta landing local.");
  await page.getByRole("button", { name: /solicitar evaluaci/i }).click();

  await expect(page).toHaveURL(/\/gracias/);
  expect(submittedPayload).toMatchObject({
    sourcePage: "/remodelacion-de-cocinas-cordoba",
  });
});

test("persistent WhatsApp actions preserve project context", async ({ page }, testInfo) => {
  await page.goto("/proyectos/casa-patio-norte");

  if (testInfo.project.name === "mobile") {
    await page.evaluate(() => window.scrollTo(0, 600));
  }

  const persistentWhatsApp =
    testInfo.project.name === "mobile"
      ? page
          .getByRole("navigation", { name: /acciones rápidas/i })
          .getByRole("link", { name: "WhatsApp", exact: true })
      : page
          .locator("header")
          .getByRole("link", { name: "WhatsApp", exact: true });
  await expect(persistentWhatsApp).toBeVisible();
  const href = await persistentWhatsApp.getAttribute("href");

  expect(href).toBeTruthy();
  expect(decodeURIComponent(href!)).toContain(
    "Referencia: /proyectos/casa-patio-norte",
  );
});

test("disabled analytics does not load external measurement scripts", async ({ page }) => {
  test.skip(analyticsProvider !== "none", "Analytics is enabled for this run");
  await page.goto("/");

  await expect(
    page.locator('script[src*="googletagmanager.com"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /preferencias de cookies/i }),
  ).toHaveCount(0);
});

test("analytics loads only after explicit consent", async ({ page }) => {
  test.skip(analyticsProvider === "none", "Analytics is disabled for this run");
  await page.route("https://www.googletagmanager.com/**", async (route) => {
    await route.fulfill({
      body: "/* analytics test stub */",
      contentType: "application/javascript",
      status: 200,
    });
  });

  await page.goto("/");
  await expect(
    page.locator('script[src*="googletagmanager.com"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: /preferencias de medici.n/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /permitir medici.n/i }).click();
  await expect(
    page.locator('script[src*="googletagmanager.com"]'),
  ).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("arqvia-analytics-consent-v1")))
    .toBe("granted");
});

test("commercial CTAs preserve page source across public sections", async ({ page }) => {
  const cases = [
    {
      path: "/proyectos",
      expected: "origen=%2Fproyectos",
      name: /solicitar presupuesto para mi proyecto/i,
    },
    {
      path: "/servicios",
      expected: "origen=%2Fservicios",
      name: /solicitar presupuesto para un servicio/i,
    },
    {
      path: "/proceso",
      expected: "origen=%2Fproceso",
      name: /coordinar evaluaci/i,
    },
    {
      path: "/nosotros",
      expected: "origen=%2Fnosotros",
      name: /solicitar evaluaci.n con arqvia/i,
    },
    {
      path: "/faq",
      expected: "origen=%2Ffaq",
      name: /solicitar orientaci.n/i,
    },
    {
      path: "/zonas/cordoba-capital",
      expected: "origen=%2Fzonas%2Fcordoba-capital",
      name: /solicitar presupuesto en c/i,
    },
    {
      path: "/blog/anteproyecto-vs-proyecto-ejecutivo",
      expected: "origen=%2Fblog%2Fanteproyecto-vs-proyecto-ejecutivo",
      name: /evaluar mi proyecto/i,
    },
  ];

  for (const item of cases) {
    await page.goto(item.path);
    await expect(page.getByRole("link", { name: item.name }).first()).toHaveAttribute(
      "href",
      new RegExp(item.expected),
    );
  }
});

test("before after labels and drag handle remain visually separated", async ({ page }) => {
  await page.goto("/");
  const labels = page.getByTestId("before-after-labels");
  const handle = page.getByTestId("before-after-handle");
  const range = page.getByTestId("before-after-range");

  await labels.scrollIntoViewIfNeeded();
  await expect(labels).toBeVisible();
  await expect(handle).toBeVisible();
  await expect(range).toBeVisible();

  const labelsBox = await labels.boundingBox();
  const handleBox = await handle.boundingBox();
  const rangeBox = await range.boundingBox();

  expect(labelsBox).not.toBeNull();
  expect(handleBox).not.toBeNull();
  expect(rangeBox).not.toBeNull();
  expect(labelsBox!.y + labelsBox!.height).toBeLessThan(handleBox!.y);
  expect(rangeBox!.height).toBeGreaterThanOrEqual(200);
  expect(rangeBox!.width).toBeGreaterThan(handleBox!.width * 4);
});

test("before after accepts an imprecise mobile touch drag across the visible handle", async ({
  context,
  page,
}) => {
  await stubOptimizedImages(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const range = page.getByTestId("before-after-range");
  const handle = page.getByTestId("before-after-handle");
  await range.scrollIntoViewIfNeeded();

  const rangeBox = await range.boundingBox();
  const handleBox = await handle.boundingBox();
  expect(rangeBox).not.toBeNull();
  expect(handleBox).not.toBeNull();

  const initialValue = Number(await range.inputValue());
  const startX = handleBox!.x + 4;
  const y = handleBox!.y + handleBox!.height / 2;
  const endX = rangeBox!.x + rangeBox!.width * 0.78;
  const session = await context.newCDPSession(page);

  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x: startX, y, radiusX: 10, radiusY: 10 }],
  });
  for (let step = 1; step <= 5; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          id: 1,
          x: startX + ((endX - startX) * step) / 5,
          y,
          radiusX: 10,
          radiusY: 10,
        },
      ],
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  await expect.poll(async () => Number(await range.inputValue())).toBeGreaterThan(
    initialValue + 12,
  );
  await expect(handle).toHaveCSS("width", "48px");
  await expect(handle).toHaveCSS("height", "48px");
});

test("project gallery supports horizontal swipe on mobile", async ({
  context,
  page,
}) => {
  await stubOptimizedImages(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proyectos/casa-patio-norte");
  await page.getByRole("button", { name: /abrir imagen 1 de 2/i }).click();

  const dialog = page.getByRole("dialog", { name: /galer.a de casa patio norte/i });
  const activeImage = page.getByTestId("gallery-active-image");
  await expect(dialog.getByText("1 / 2")).toBeVisible();
  const imageBox = await activeImage.boundingBox();
  expect(imageBox).not.toBeNull();

  const y = imageBox!.y + imageBox!.height / 2;
  const startX = imageBox!.x + imageBox!.width * 0.78;
  const endX = imageBox!.x + imageBox!.width * 0.22;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 2, x: startX, y, radiusX: 10, radiusY: 10 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 2, x: endX, y, radiusX: 10, radiusY: 10 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  await expect(dialog.getByText("2 / 2")).toBeVisible();
});

test("mobile typography, language controls and tablet footer keep usable proportions", async ({
  page,
}) => {
  await stubOptimizedImages(page);
  await page.setViewportSize({ width: 320, height: 844 });

  for (const path of [
    "/",
    "/blog",
    "/nosotros",
    "/estimador",
    "/zonas/cordoba-capital",
  ]) {
    await page.goto(path);
    const fontSize = await page
      .locator("h1")
      .evaluate((heading) => Number.parseFloat(getComputedStyle(heading).fontSize));
    expect(fontSize, path).toBeLessThanOrEqual(42);
  }

  const localeButtons = page.locator("footer [data-locale-option]");
  await localeButtons.first().scrollIntoViewIfNeeded();
  for (const button of await localeButtons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  const tabletFooterGroup = page
    .locator('[data-footer-group="Servicios"]')
    .locator("details");
  await expect(tabletFooterGroup).toBeVisible();
});

test("active project filter is brought into view on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/proyectos?categoria=Residencial");

  const activeFilter = page
    .getByTestId("project-filters")
    .getByRole("link", { name: "Residencial", exact: true });
  await expect(activeFilter).toHaveAttribute("aria-current", "page");
  await expect
    .poll(async () => {
      const box = await activeFilter.boundingBox();
      return box ? box.x >= 0 && box.x + box.width <= 320 : false;
    })
    .toBe(true);
});

test("project portfolio covers load visible architectural images", async ({ page }) => {
  // Esta es la única prueba que pide las portadas de verdad, así que no puede
  // usar el stub. Lo que sí se saca es la espera del evento load: incluía todas
  // las demás imágenes del listado, y el corte de la prueba llegaba antes de
  // que el optimizador terminara con las cuatro portadas que sí se afirman.
  await page.goto("/proyectos", { waitUntil: "domcontentloaded" });

  const projectCards = page.locator("article").filter({
    has: page.getByRole("link", { name: /ver proyecto|ver/i }),
  });
  await expect(
    page.getByRole("heading", {
      name: /proyectos construidos para vivir, trabajar y crecer/i,
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(projectCards.first()).toBeVisible({ timeout: 15_000 });
  const cardCount = await projectCards.count();
  expect(cardCount).toBeGreaterThanOrEqual(4);

  const covers: string[] = [];
  for (let index = 0; index < Math.min(cardCount, 4); index += 1) {
    const card = projectCards.nth(index);
    await card.scrollIntoViewIfNeeded();
    const image = card.locator("img").first();
    await expect(image).toBeVisible();
    const source = (await image.getAttribute("src")) ?? "";
    expect(source).not.toBe("");
    covers.push(source);
  }

  // Cada portada se pide primero por HTTP. Eso hace dos cosas: afirma que la
  // portada se sirve de verdad —200 y un tipo de imagen, no una respuesta vacía
  // ni un error— y deja la versión optimizada ya hecha en el servidor. Esperar
  // sólo con naturalWidth no alcanzaba: en un runner de dos núcleos y con la
  // caché fría, la etiqueta img se quedaba con la petición cancelada y el valor
  // no se movía del 0 por mucho que se ampliara la espera.
  for (const source of covers) {
    const response = await page.request.get(new URL(source, testOrigin).toString(), {
      timeout: 60_000,
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\//);
  }

  // Con las cuatro portadas ya optimizadas, la recarga las toma de la caché del
  // servidor y el navegador puede decodificarlas sin carrera.
  await page.reload({ waitUntil: "domcontentloaded" });
  for (let index = 0; index < covers.length; index += 1) {
    const card = projectCards.nth(index);
    await card.scrollIntoViewIfNeeded();
    const image = card.locator("img").first();
    await expect(image).toBeVisible();
    await expect
      .poll(async () => image.evaluate((img) => (img as HTMLImageElement).naturalWidth), {
        timeout: 20_000,
      })
      .toBeGreaterThan(80);
  }
});

test("before after uses a coherent bathroom remodel image pair", async ({
  page,
}) => {
  await page.goto("/");

  const beforeImage = page.getByTestId("before-after-image-before");
  const afterImage = page.getByTestId("before-after-image-after");

  await expect(beforeImage).toHaveAttribute(
    "alt",
    /mismo baño antes de la remodelaci/i,
  );
  await expect(afterImage).toHaveAttribute(
    "alt",
    /mismo baño despu/i,
  );

  const beforeSrc = await beforeImage.getAttribute("src");
  const afterSrc = await afterImage.getAttribute("src");

  expect(beforeSrc).toContain("arqvia-bathroom-before-renovation");
  expect(afterSrc).toContain("arqvia-bathroom-after-renovation");
});

test("remodeling project detail uses its own before after case data", async ({
  page,
}) => {
  await page.goto("/proyectos/cocina-terracota");

  await expect(
    page.getByRole("heading", { name: /antes y despu/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/muestra el mismo ambiente desde un encuadre comparable/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /quiero una transformaci/i }),
  ).toHaveAttribute("href", /origen=%2Fproyectos%2Fcocina-terracota/);

  const beforeImage = page.getByTestId("before-after-image-before");
  const afterImage = page.getByTestId("before-after-image-after");
  await expect(beforeImage).toHaveAttribute(
    "alt",
    /cocina terracota antes de la remodelaci/i,
  );
  await expect(afterImage).toHaveAttribute(
    "alt",
    /cocina terracota despu/i,
  );
  expect(await beforeImage.getAttribute("src")).toContain(
    "arqvia-cocina-terracota-before-renovation",
  );
  expect(await afterImage.getAttribute("src")).toContain(
    "arqvia-cocina-terracota-after-renovation",
  );
  await expect(
    page.getByText(/guardado, iluminaci.n, ventilaci.n/i),
  ).toBeVisible();
  await expect(
    page.getByText(/organizaci.n de la vivienda alrededor de un patio protegido/i),
  ).toHaveCount(0);
});

test("FAQ page renders without browser runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/faq");
  await expect(
    page.getByRole("heading", { name: /respuestas para avanzar con m.s claridad/i }),
  ).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test("not found page keeps Arqvia recovery paths", async ({ page }) => {
  await page.goto("/obra-que-no-existe");

  await expect(
    page.getByRole("heading", { name: /esta pagina no esta en el plano/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /volver al inicio/i })).toBeVisible();
  await expect(
    page.locator("main").getByRole("link", { name: /solicitar presupuesto/i }),
  ).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("unknown dynamic content returns a real HTTP 404", async ({ request }) => {
  for (const path of [
    "/proyectos/no-existe",
    "/servicios/no-existe",
    "/blog/no-existe",
    "/zonas/no-existe",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(response.headers()["x-robots-tag"] || response.headers()["content-type"]).toBeTruthy();
  }
});

test("malformed dynamic slugs return 404 without a server error", async ({ request }) => {
  for (const path of ["/proyectos/%E0%A4%A", "/blog/%C3%28"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

const publicPages = [
  "/",
  "/proyectos",
  "/proyectos/casa-patio-norte",
  "/servicios",
  "/servicios/construccion-llave-en-mano",
  "/proceso",
  "/nosotros",
  "/contacto",
  "/estimador",
  "/faq",
  "/blog",
  "/blog/anteproyecto-vs-proyecto-ejecutivo",
  "/remodelacion-de-cocinas-cordoba",
  "/zonas/cordoba-capital",
];

for (const path of publicPages) {
  test(`public page has no horizontal overflow: ${path}`, async ({ page }) => {
    await stubOptimizedImages(page);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(hasOverflow).toBe(false);

    const clippedControls = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      return Array.from(
        document.querySelectorAll<HTMLElement>(
          "a[href], button, input, select, textarea, [role='dialog']",
        ),
      )
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight
          );
        })
        .filter((element) => {
          if (element.closest("[data-horizontal-scroll='true']")) return false;
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > viewportWidth + 1;
        })
        .map((element) => element.outerHTML.slice(0, 180));
    });

    expect(clippedControls, path).toEqual([]);
  });
}

for (const path of publicPages) {
  test(`public page has one h1 and no duplicated brand title: ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).not.toHaveTitle(/Arqvia \| Arqvia/);
  });
}

for (const path of [
  "/",
  "/proyectos",
  "/servicios",
  "/contacto",
  "/estimador",
  "/faq",
  "/blog/anteproyecto-vs-proyecto-ejecutivo",
  "/privacidad",
  "/terminos",
  "/cookies",
  "/aviso-presupuestos",
]) {
  test(`axe accessibility scan: ${path}`, async ({ page }) => {
    await page.goto(path);
    const scan = await new AxeBuilder({ page }).analyze();

    expect(scan.violations).toEqual([]);
  });
}
