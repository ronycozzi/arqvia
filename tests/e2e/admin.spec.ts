import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { readFileSync } from "node:fs";
import { calculateEstimate } from "../../src/lib/estimator";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const prisma = new PrismaClient();
const adminActionTimeout = 45_000;
const testOrigin =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://localhost:${process.env.PLAYWRIGHT_PORT || "3100"}`;
const leadRequestHeaders = { Origin: testOrigin };

async function confirmDeleteFromTrigger(
  page: Page,
  trigger: Locator,
  dialogName: RegExp = /eliminar/i,
) {
  const nativeDialogHandled = page
    .waitForEvent("dialog", { timeout: 1_000 })
    .then(async (dialog) => {
      await dialog.accept();
      return true;
    })
    .catch(() => false);

  await trigger.click();
  if (await nativeDialogHandled) return;

  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  const confirmButton = dialog.getByRole("button", {
    name: /^confirmar (?:eliminación|revocación)$/i,
  });
  if ((await confirmButton.count()) > 0) {
    await confirmButton.click();
    return;
  }
  await dialog.getByRole("button", { name: /^eliminar$/i }).click();
}

async function expectPermanentContentRedirect(
  page: Page,
  sourcePath: string,
  destinationPath: string,
) {
  await expect
    .poll(async () => {
      const response = await page.request.get(sourcePath, { maxRedirects: 0 });
      return {
        location: response.headers().location,
        status: response.status(),
      };
    }, { timeout: 20_000 })
    .toEqual({ location: destinationPath, status: 308 });
}

async function expectAdminDashboardRedirect(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();
}

async function cleanupCmsTestContent() {
  await prisma.contentRedirect.deleteMany({
    where: {
      OR: [
        { sourcePath: { contains: "casa-cms" } },
        { sourcePath: { contains: "servicio-cms" } },
        { sourcePath: { contains: "guia-cms" } },
        { sourcePath: { contains: "area-cms" } },
      ],
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { action: "EXPORT_LEADS" },
        { summary: { contains: "Consulta Arqvia " } },
        { summary: { contains: "Casa CMS" } },
        { summary: { contains: "Servicio CMS" } },
        { summary: { contains: "Usuario CMS" } },
        { summary: { contains: "Categoría CMS" } },
        { summary: { contains: "Cliente CMS" } },
        { summary: { contains: "Integrante CMS" } },
        { summary: { contains: "Área CMS" } },
        { summary: { contains: "Guía CMS" } },
        { summary: { contains: "Pregunta CMS" } },
        { summary: { contains: "Nota comercial" } },
        { summary: { contains: "Imagen CMS" } },
        { summary: { contains: "Visita E2E " } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "usuario-cms-" } },
        { name: { startsWith: "Usuario CMS" } },
      ],
    },
  });
  await prisma.lead.deleteMany({
    where: {
      OR: [
        { email: { endsWith: "@arqvia.test" } },
        { email: { startsWith: "consulta-" } },
        { email: { startsWith: "visita-e2e-" } },
        { name: { startsWith: "Consulta Arqvia " } },
        { name: { startsWith: "Exportacion masiva " } },
        { name: { startsWith: "Visita E2E " } },
      ],
    },
  });
  await prisma.project.deleteMany({
    where: {
      OR: [
        { title: { startsWith: "Casa CMS" } },
        { slug: { startsWith: "casa-cms" } },
        { title: { startsWith: "Borrador CMS" } },
        { slug: { startsWith: "borrador-cms" } },
      ],
    },
  });
  await prisma.service.deleteMany({
    where: {
      OR: [
        { title: { startsWith: "Servicio CMS" } },
        { slug: { startsWith: "servicio-cms" } },
        { title: { startsWith: "Borrador CMS" } },
        { slug: { startsWith: "borrador-cms" } },
      ],
    },
  });
  await prisma.blogPost.deleteMany({
    where: {
      OR: [
        { title: { startsWith: "Guía CMS" } },
        { slug: { startsWith: "guia-cms" } },
      ],
    },
  });
  await prisma.faq.deleteMany({
    where: {
      OR: [
        { question: { startsWith: "Pregunta CMS" } },
        { category: { startsWith: "Categoría CMS" } },
      ],
    },
  });
  await prisma.testimonial.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "Cliente CMS" } },
        { quote: { contains: "testimonio creado desde el CMS" } },
      ],
    },
  });
  await prisma.teamMember.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "Integrante CMS" } },
        { specialty: { startsWith: "Especialidad CMS" } },
      ],
    },
  });
  await prisma.area.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "Área CMS" } },
        { slug: { startsWith: "area-cms" } },
      ],
    },
  });
  await prisma.mediaAsset.deleteMany({
    where: {
      OR: [
        { title: { startsWith: "Imagen CMS" } },
        { url: { contains: "imagen-cms" } },
      ],
    },
  });
  await prisma.projectCategory.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "Categoría Proyecto CMS" } },
        { slug: { startsWith: "categoria-proyecto-cms" } },
        { slug: { startsWith: "categoria-proyecto-borrador-cms" } },
      ],
    },
  });
  await prisma.serviceCategory.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "Categoría Servicio CMS" } },
        { slug: { startsWith: "categoria-servicio-cms" } },
        { slug: { startsWith: "categoria-servicio-borrador-cms" } },
      ],
    },
  });
}

test.beforeAll(async () => {
  await cleanupCmsTestContent();
});

test.afterAll(async () => {
  await cleanupCmsTestContent();
  await prisma.$disconnect();
});

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");

  if (await page.getByRole("heading", { name: /ingresar al admin/i }).isVisible()) {
    await page.locator("#admin-email").fill("admin@arqvia.local");
    await page.locator("#admin-password").fill("ChangeMe123!");
    await page.getByRole("button", { name: /entrar al panel/i }).click();
  }

  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();
}

test("admin list pagination canonicalizes an out-of-range page", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/users?q=admin%40arqvia.local&page=999");

  await expect
    .poll(() => new URL(page.url()).searchParams.get("page"))
    .toBeNull();
  expect(new URL(page.url()).searchParams.get("q")).toBe("admin@arqvia.local");
  await expect(page.getByText("Resultado actual")).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("article")
      .filter({ hasText: "admin@arqvia.local" })
      .getByText("admin@arqvia.local", { exact: true }),
  ).toBeVisible();
});

test("admin mobile shows compact navigation and lead cards", async ({ page }) => {
  await prisma.lead.create({
    data: {
      name: "Consulta Arqvia Mobile",
      email: "consulta-mobile@arqvia.test",
      phone: "+5493515550000",
      city: "Córdoba Capital",
      clientType: "Particular",
      projectType: "Remodelación integral",
      currentStatus: "Necesito ordenar alcance y presupuesto",
      budgetRange: "USD 25.000 - 50.000",
      needsVisit: true,
      hasPlans: false,
      message:
        "Quiero evaluar una remodelación integral y coordinar una visita técnica.",
      sourcePage: "/contacto",
    },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAdmin(page);

  await page.getByText(/abrir módulos del panel/i).click();
  await expect(
    page.getByRole("navigation", { name: /administraci.n mobile/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /^administraci.n$/i }),
  ).toHaveCount(0);

  await page.goto("/admin/leads");
  await expect(
    page.getByRole("link", { name: "Consulta Arqvia Mobile" }).first(),
  ).toBeVisible();
  await expect(page.getByText(/cambiar estado/i).first()).toBeVisible();
  await expect(page.getByText(/lectura comercial/i).first()).toBeVisible();
  await expect(page.getByText(/conviene calificar antes de presupuestar/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /whatsapp/i }).first()).toBeVisible();
  await expect(page.locator("table").first()).toBeHidden();
});

test("admin assigns a lead, schedules follow-up and records a qualified close", async ({
  page,
}) => {
  const unique = Date.now();
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@arqvia.local" },
    select: { email: true, id: true, name: true },
  });
  const lead = await prisma.lead.create({
    data: {
      city: "Córdoba Capital",
      email: `consulta-crm-${unique}@example.com`,
      message: "Necesito una propuesta integral y quiero coordinar próximos pasos.",
      name: `Consulta Arqvia CRM ${unique}`,
      phone: "+54 351 555 9090",
      projectType: "Construcción llave en mano",
      sourcePage: "/contacto",
    },
  });

  await loginAdmin(page);
  await page.goto(`/admin/leads/${lead.id}`);

  const commercialSection = page.getByRole("region", {
      name: "Responsable, próxima acción y valor",
      exact: true,
    });
  await commercialSection
    .getByLabel("Responsable", { exact: true })
    .selectOption(admin.id);
  await commercialSection
    .getByLabel("Próximo seguimiento", { exact: true })
    .fill("2027-01-15T10:30");
  await commercialSection
    .getByLabel("Presupuesto enviado (USD)", { exact: true })
    .fill("85000");
  await commercialSection
    .getByRole("button", { name: "Guardar seguimiento", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Seguimiento comercial actualizado." }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    commercialSection.getByLabel("Responsable", { exact: true }),
  ).toHaveValue(admin.id);

  await page.getByLabel("Estado del lead", { exact: true }).selectOption("QUOTED");
  await expect
    .poll(async () => (await prisma.lead.findUnique({ where: { id: lead.id } }))?.status)
    .toBe("QUOTED");

  await commercialSection
    .getByLabel("Motivo de pérdida", { exact: true })
    .fill("El cliente decidió postergar la inversión.");
  await commercialSection
    .getByRole("button", { name: "Guardar seguimiento", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Seguimiento comercial actualizado." }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Estado del lead", { exact: true }).selectOption("LOST");

  const contactResponse = await page.request.post(
    `/api/admin/leads/${lead.id}/contact`,
    {
      data: { channel: "WHATSAPP" },
      headers: leadRequestHeaders,
    },
  );
  expect(contactResponse.status()).toBe(200);

  await expect.poll(async () => {
    const saved = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: { commercialActivities: true },
    });
    return {
      activities: saved?.commercialActivities.length,
      assignedUserId: saved?.assignedUserId,
      lostReason: saved?.lostReason,
      nextFollowUpAt: saved?.nextFollowUpAt,
      quotedAmountUsd: saved?.quotedAmountUsd,
      status: saved?.status,
    };
  }).toEqual({
    activities: 7,
    assignedUserId: admin.id,
    lostReason: "El cliente decidió postergar la inversión.",
    nextFollowUpAt: null,
    quotedAmountUsd: 85_000,
    status: "LOST",
  });
});

test("admin dashboard exposes commercial readiness guidance", async ({ page }) => {
  const suffix = Date.now();
  const name = `Consulta Arqvia Dashboard ${suffix}`;
  await prisma.lead.create({
    data: {
      name,
      email: `consulta-dashboard-${suffix}@arqvia.test`,
      phone: "+54 351 555 1400",
      city: "Cordoba Capital",
      clientType: "Particular",
      projectType: "Construccion llave en mano",
      currentStatus: "Necesito remodelar un espacio existente",
      areaM2: "120 m2",
      budgetRange: "USD 80.000 o mas",
      startDate: "Proximos 3 meses",
      needsVisit: true,
      hasPlans: true,
      message:
        "Queremos avanzar con una obra residencial completa, revisar etapas, presupuesto y coordinar una visita tecnica.",
      sourcePage: "/contacto",
    },
  });

  await loginAdmin(page);
  await page.goto("/admin");

  await expect(page.getByText(/responder primero/i)).toBeVisible();
  await expect(page.getByText(/oportunidades calientes/i)).toBeVisible();
  const hotLeadCard = page
    .getByRole("link")
    .filter({ hasText: name })
    .filter({ hasText: /oportunidad para contactar hoy/i });
  await expect(hotLeadCard).toBeVisible();
  await expect(hotLeadCard.getByText(/alta . 100/i)).toBeVisible();

  const readinessPanel = page.getByTestId("admin-readiness-panel");
  await expect(readinessPanel).toBeVisible();
  const readinessToggle = readinessPanel.getByRole("button").first();
  if (await readinessToggle.isVisible()) await readinessToggle.click();
  await expect(readinessPanel.getByText(/puesta a punto comercial/i)).toBeVisible();
  await expect(
    readinessPanel.getByRole("heading", {
      name: /checklist de venta del sitio/i,
    }),
  ).toBeVisible();
  await expect(
    readinessPanel.getByText(/portfolio con prueba comercial/i),
  ).toBeVisible();
  await expect(
    readinessPanel.getByText(/servicios con p.ginas completas/i),
  ).toBeVisible();
  await expect(readinessPanel.getByText(/crm en movimiento/i)).toBeVisible();
  await expect(
    readinessPanel.getByText("controles aprobados", { exact: true }),
  ).toBeVisible();
  await expect(readinessPanel.getByText(/\d+%/)).toHaveCount(0);
  await expect(readinessPanel.getByRole("link").first()).toHaveAttribute(
    "href",
    /^\/admin\//,
  );

  const launchPanel = page.getByTestId("admin-launch-readiness-panel");
  await expect(launchPanel).toBeVisible();
  const launchToggle = launchPanel.getByRole("button").first();
  if (await launchToggle.isVisible()) await launchToggle.click();
  await expect(launchPanel.getByText(/publicaci.n/i).first()).toBeVisible();
  await expect(
    launchPanel.getByRole("heading", {
      name: /checklist t.cnico antes de publicar/i,
    }),
  ).toBeVisible();
  await expect(
    launchPanel.getByText("Dominio publico", { exact: true }),
  ).toBeVisible();
  await expect(
    launchPanel.getByText("WhatsApp comercial", { exact: true }),
  ).toBeVisible();
  await expect(
    launchPanel.getByText("Primera pantalla", { exact: true }),
  ).toBeVisible();
  await expect(launchPanel.getByText(/base de datos de producci.n/i)).toBeVisible();
  await expect(launchPanel.getByText(/im.genes persistentes/i)).toBeVisible();
  await expect(
    launchPanel.getByText(/protecci.n antiabuso distribuida/i),
  ).toBeVisible();
});

test("admin core screens pass automated accessibility checks", async ({ page }) => {
  await loginAdmin(page);

  for (const path of [
    "/admin",
    "/admin/leads",
    "/admin/projects",
    "/admin/home",
    "/admin/projects/new",
    "/admin/media",
    "/admin/faq/new",
    "/admin/testimonials/new",
    "/admin/visitas",
    "/admin/settings",
    "/admin/system",
  ]) {
    await page.goto(path);
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations, `Accessibility violations on ${path}`).toEqual([]);
  }
});

test("admin marks all notifications as read and can undo without changing lead status", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const testStartedAt = new Date();
  const suffix = Date.now();
  const name = `Consulta Arqvia Notificación ${suffix}`;
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@arqvia.local" },
    select: {
      id: true,
      leadNotificationsReadAt: true,
      leadNotificationsUndoAt: true,
      leadNotificationsUndoFor: true,
    },
  });
  const originalNotificationState = {
    leadNotificationsReadAt: admin.leadNotificationsReadAt,
    leadNotificationsUndoAt: admin.leadNotificationsUndoAt,
    leadNotificationsUndoFor: admin.leadNotificationsUndoFor,
  };

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      leadNotificationsReadAt: null,
      leadNotificationsUndoAt: null,
      leadNotificationsUndoFor: null,
    },
  });
  const lead = await prisma.lead.create({
    data: {
      name,
      email: `consulta-notificacion-${suffix}@arqvia.test`,
      phone: "+54 351 555 1700",
      city: "Córdoba Capital",
      clientType: "Particular",
      projectType: "Remodelación integral",
      currentStatus: "Necesito remodelar un espacio existente",
      budgetRange: "USD 25.000 - 50.000",
      needsVisit: true,
      hasPlans: true,
      message: "Consulta para verificar lectura y restauración de notificaciones.",
      sourcePage: "/contacto",
    },
  });

  try {
    await loginAdmin(page);
    await page.goto("/admin");

    const recentLead = page
      .getByRole("link")
      .filter({ hasText: name })
      .first();
    await expect(recentLead).toBeVisible();
    await expect(recentLead.getByText("Nueva", { exact: true })).toBeVisible();
    await expect(recentLead.getByText("Sin contactar", { exact: true })).toBeVisible();

    const notificationTrigger = page.getByRole("button", {
      name: /notificaciones: \d+ sin leer/i,
    });
    await notificationTrigger.click();
    const notificationDialog = page.getByRole("dialog", {
      name: /centro de notificaciones/i,
    });
    await notificationDialog
      .getByRole("button", { name: /marcar todas como leídas/i })
      .click();

    await expect(
      page.getByRole("button", { name: /notificaciones: 0 sin leer/i }),
    ).toBeVisible();
    await expect(recentLead.getByText("Nueva", { exact: true })).toHaveCount(0);
    await expect(recentLead.getByText("Sin contactar", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /deshacer/i })).toBeVisible();

    const markedUser = await prisma.user.findUniqueOrThrow({
      where: { id: admin.id },
      select: { leadNotificationsReadAt: true },
    });
    expect(markedUser.leadNotificationsReadAt).not.toBeNull();

    await page.getByRole("button", { name: /deshacer/i }).click();
    await expect(recentLead.getByText("Nueva", { exact: true })).toBeVisible();

    const restoredUser = await prisma.user.findUniqueOrThrow({
      where: { id: admin.id },
      select: { leadNotificationsReadAt: true },
    });
    expect(restoredUser.leadNotificationsReadAt).toBeNull();

    const unchangedLead = await prisma.lead.findUniqueOrThrow({
      where: { id: lead.id },
      select: { status: true },
    });
    expect(unchangedLead.status).toBe("NEW");
  } finally {
    await prisma.auditLog.deleteMany({
      where: {
        entity: "LeadNotification",
        userId: admin.id,
        createdAt: { gte: testStartedAt },
      },
    });
    await prisma.lead.deleteMany({ where: { id: lead.id } });
    await prisma.user.update({
      where: { id: admin.id },
      data: originalNotificationState,
    });
  }
});

test("admin API rejects anonymous and cross-origin mutable requests", async ({ page, request }) => {
  const suffix = Date.now();
  const lead = await prisma.lead.create({
    data: {
      name: `Consulta Seguridad API ${suffix}`,
      email: `seguridad-api-${suffix}@arqvia.test`,
      phone: "+54 351 555 1600",
      city: "Cordoba Capital",
      clientType: "Particular",
      projectType: "Remodelacion",
      currentStatus: "Tengo una idea",
      areaM2: "60 m2",
      budgetRange: "USD 20.000 a 40.000",
      startDate: "Este semestre",
      needsVisit: true,
      hasPlans: false,
      message: "Consulta creada para verificar seguridad de API admin.",
      sourcePage: "/contacto",
    },
  });

  const anonymousPatch = await request.patch(`/api/admin/leads/${lead.id}`, {
    data: { status: "CONTACTED" },
  });
  expect(anonymousPatch.status()).toBe(403);
  const anonymousMediaDelete = await request.delete("/api/admin/media/not-found");
  expect(anonymousMediaDelete.status()).toBe(403);
  const anonymousMediaSearch = await request.get("/api/admin/media?q=casa");
  expect(anonymousMediaSearch.status()).toBe(403);
  const anonymousReferenceSearch = await request.get(
    "/api/admin/references?type=projects&q=casa",
  );
  expect(anonymousReferenceSearch.status()).toBe(403);

  await loginAdmin(page);

  const approvedMediaSearch = await page.request.get(
    "/api/admin/media?q=casa&take=5",
  );
  expect(approvedMediaSearch.status()).toBe(200);
  const approvedMediaPayload = (await approvedMediaSearch.json()) as {
    assets: Array<Record<string, unknown>>;
    hasMore: boolean;
  };
  expect(Array.isArray(approvedMediaPayload.assets)).toBe(true);
  expect(typeof approvedMediaPayload.hasMore).toBe("boolean");
  for (const asset of approvedMediaPayload.assets) {
    expect(Object.keys(asset).sort()).toEqual(
      ["altText", "category", "id", "title", "url"].sort(),
    );
  }
  const referenceSearch = await page.request.get(
    "/api/admin/references?type=projects&q=casa&take=5",
  );
  expect(referenceSearch.status()).toBe(200);
  const referencePayload = (await referenceSearch.json()) as {
    hasMore: boolean;
    options: Array<Record<string, unknown>>;
  };
  expect(Array.isArray(referencePayload.options)).toBe(true);
  expect(typeof referencePayload.hasMore).toBe("boolean");
  for (const option of referencePayload.options) {
    expect(Object.keys(option).every((key) => ["id", "label", "meta"].includes(key))).toBe(
      true,
    );
  }
  const invalidReferenceSearch = await page.request.get(
    "/api/admin/references?type=users&q=admin",
  );
  expect(invalidReferenceSearch.status()).toBe(400);

  const crossOriginStatus = await page.request.patch(`/api/admin/leads/${lead.id}`, {
    data: { status: "CONTACTED" },
    headers: { Origin: "https://evil.example" },
  });
  expect(crossOriginStatus.status()).toBe(403);
  await expect(crossOriginStatus.json()).resolves.toMatchObject({
    message: "Origen no permitido",
  });

  const crossOriginNote = await page.request.post(
    `/api/admin/leads/${lead.id}/notes`,
    {
      data: { body: "Nota enviada desde un origen externo." },
      headers: { Origin: "https://evil.example" },
    },
  );
  expect(crossOriginNote.status()).toBe(403);

  const crossOriginMediaDelete = await page.request.delete(
    "/api/admin/media/not-found",
    {
      headers: { Origin: "https://evil.example" },
    },
  );
  expect(crossOriginMediaDelete.status()).toBe(403);

  const missingSourceMediaDelete = await page.request.delete(
    "/api/admin/media/not-found",
  );
  expect(missingSourceMediaDelete.status()).toBe(403);

  const missingMediaDelete = await page.request.delete("/api/admin/media/not-found", {
    headers: { Origin: testOrigin },
  });
  expect(missingMediaDelete.status()).toBe(404);

  const malformedNote = await page.evaluate(async (leadId) => {
    const response = await fetch(`/api/admin/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    return { status: response.status, payload: await response.json() };
  }, lead.id);
  expect(malformedNote.status).toBe(400);
  expect(malformedNote.payload).toMatchObject({ message: "Datos inválidos" });
});

test("direct admin settings visit preserves a safe callback and returns after login", async ({
  page,
}) => {
  await page.goto("/admin/settings");

  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/admin/login" &&
      url.searchParams.get("callbackUrl") === "/admin/settings"
    );
  });
  await expect(page.getByRole("heading", { name: /ingresar al admin/i })).toBeVisible();

  await page.locator("#admin-email").fill("admin@arqvia.local");
  await page.locator("#admin-password").fill("ChangeMe123!");
  await page.getByRole("button", { name: /entrar al panel/i }).click();

  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(
    page.getByRole("heading", { name: /marca, contacto y primera pantalla/i }),
  ).toBeVisible();
});

test("admin login ignores malicious external callbackUrl", async ({ page }) => {
  await page.goto(
    `/admin/login?callbackUrl=${encodeURIComponent("https://evil.example/admin/settings")}`,
  );
  await expect(page.getByRole("heading", { name: /ingresar al admin/i })).toBeVisible();

  await page.locator("#admin-email").fill("admin@arqvia.local");
  await page.locator("#admin-password").fill("ChangeMe123!");
  await page.getByRole("button", { name: /entrar al panel/i }).click();

  await expect(page).toHaveURL((url) => {
    return url.origin !== "https://evil.example" && url.pathname === "/admin";
  });
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();
});

test("admin settings are protected and manageable for seeded admin", async (
  { page },
  testInfo,
) => {
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: /ingresar al admin/i })).toBeVisible();

  await loginAdmin(page);
  await expect(page.getByRole("navigation", { name: /acciones r/i })).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(0);
  if (!new URL(page.url()).pathname.startsWith("/admin/settings")) {
    const toolsToggle = page.getByRole("button", {
      name: /accesos y herramientas/i,
    });
    if (testInfo.project.name === "mobile") {
      await expect(toolsToggle).toBeVisible();
      await toolsToggle.click();
    }
    await page.getByRole("link", { name: /configuraci/i }).first().click();
  }

  await expect(page).toHaveURL(/\/admin\/settings/);
  await expect(
    page.getByRole("heading", { name: /marca, contacto y primera pantalla/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/nombre de empresa/i)).toBeVisible();
  await expect(page.getByLabel(/título hero/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /guardar configuración/i }),
  ).toBeEnabled();
  await expect(page.getByText(/preview de venta/i)).toBeVisible();
  await expect(page.getByText(/publicacion/i).first()).toBeVisible();
  await expect(page.getByText(/dominio publico/i)).toBeVisible();
  await expect(page.getByText(/bloqueo anti-localhost/i)).toBeVisible();
  await expect(page.getByText(/acciones de conversion/i)).toBeVisible();
  await page.getByLabel(/nombre de empresa/i).fill("Arqvia");
  await page
    .getByLabel(/título hero/i)
    .fill("Arquitectura pensada para construirse bien.");
  await page.getByRole("button", { name: /guardar configuración/i }).click();
  await expect(page.getByText(/configuración guardada/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(
    page.getByRole("link", { name: /editar configuraci.n/i }),
  ).toHaveAttribute("href", "/admin/settings");
  await expect(
    page.getByRole("link", { name: /ver sitio actualizado/i }),
  ).toHaveAttribute("href", "/");

  await page.goto("/admin/reports");
  await expect(page).toHaveURL(/\/admin\/reports/);
  await expect(page.getByRole("heading", { name: /lectura clara/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /exportar vista/i })).toBeVisible();
  const sevenDaysLink = page.locator('a[href="/admin/reports?dias=7"]').first();
  await expect(sevenDaysLink).toBeVisible();
  await expect(page.getByRole("link", { name: /30 días/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /90 días/i })).toBeVisible();
  await page.goto("/admin/reports?dias=7");
  await expect(page).toHaveURL(/\/admin\/reports\?dias=7/);
  await expect(page.getByText(/consultas que conviene reactivar/i)).toBeVisible();
  await expect(page.getByText(/estado de oportunidades/i)).toBeVisible();
  await page.goto("/admin/reports?dias=7&estado=NEW");
  await expect(page.getByText("Vista 7 días")).toBeVisible();
  await expect(page.getByText(/filtrada por nuevo/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /exportar vista/i })).toHaveAttribute(
    "href",
    /dias=7&estado=NEW/,
  );
  const filteredExport = await page.request.get(
    "/api/admin/leads/export?dias=7&estado=NEW",
    { headers: { Origin: testOrigin } },
  );
  expect(filteredExport.status()).toBe(200);
  expect(filteredExport.headers()["content-disposition"]).toContain(
    "arqvia-leads-7d-new.csv",
  );
  expect(filteredExport.headers()["x-arqvia-export-limit"]).toBe("none");
  expect(filteredExport.headers()["x-arqvia-export-truncated"]).toBe("false");
  expect(filteredExport.headers()["x-arqvia-export-row-count"]).toMatch(/^\d+$/);
  expect(filteredExport.headers()["x-arqvia-export-batch-size"]).toBe("250");
});

test("investment estimator settings are Admin-only and expose versioned ranges", async ({
  page,
}) => {
  await page.goto("/admin/estimador");
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/admin/login" &&
      url.searchParams.get("callbackUrl") === "/admin/estimador"
    );
  });

  await loginAdmin(page);
  await expect(
    page.locator("nav").getByRole("link", { name: "Estimador", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin/estimador");
  await expect(page).toHaveURL(/\/admin\/estimador$/);
  await expect(
    page.getByRole("heading", { name: /rangos orientativos de inversi.n/i }),
  ).toBeVisible();
  await expect(
    page.getByText("Versión publicada", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel(/multiplicador esencial/i)).toBeVisible();
  await expect(page.getByLabel(/multiplicador equilibrado/i)).toBeVisible();
  await expect(page.getByLabel(/multiplicador superior/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /nueva categor.a/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver estimador/i })).toHaveAttribute(
    "href",
    "/estimador",
  );
});

test("admin services expose commercial readiness signals", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/services");

  await expect(page.getByText("Listos para vender")).toBeVisible();
  await expect(page.getByText("A revisar")).toBeVisible();
  await expect(
    page.getByText(/(pendiente(s)? · )?(Lista para vender|Revisar antes de publicar|Contenido débil)/).first(),
  ).toBeVisible();
  await expect(page.getByText(/proyectos relacionados/i).first()).toBeVisible();
  await expect(page.getByText(/2 preguntas frecuentes/i).first()).toBeVisible();
  await expect(page.getByText(/\d+%/)).toHaveCount(0);
});

test("draft projects and services stay private until published", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");
  test.setTimeout(60_000);

  const suffix = Date.now();
  const serviceTitle = `Borrador CMS Servicio ${suffix}`;
  const serviceSlug = `borrador-cms-servicio-${suffix}`;
  const projectTitle = `Borrador CMS Proyecto ${suffix}`;
  const projectSlug = `borrador-cms-proyecto-${suffix}`;

  const serviceCategory = await prisma.serviceCategory.create({
    data: {
      name: `Categoria Servicio Borrador CMS ${suffix}`,
      slug: `categoria-servicio-borrador-cms-${suffix}`,
      description: "Categoria temporal para verificar borradores de servicios.",
    },
  });
  const projectCategory = await prisma.projectCategory.create({
    data: {
      name: `Categoria Proyecto Borrador CMS ${suffix}`,
      slug: `categoria-proyecto-borrador-cms-${suffix}`,
      description: "Categoria temporal para verificar borradores de proyectos.",
    },
  });

  const draftService = await prisma.service.create({
    data: {
      publicationStatus: "DRAFT",
      publishedAt: null,
      title: serviceTitle,
      slug: serviceSlug,
      categoryId: serviceCategory.id,
      icon: "DraftingCompass",
      shortDescription:
        "Servicio en revision interna antes de aparecer en la web publica.",
      description:
        "Servicio creado como borrador para verificar que Arqvia puede preparar paginas comerciales sin publicarlas.",
      coverImage: "/images/arqvia-construction-technical.webp",
      mainBenefit: "Permite ordenar contenido antes de publicarlo.",
      audience: "Equipo interno de contenido y direccion comercial.",
      included: "Alcance, beneficios, proceso, preguntas frecuentes y CTA.",
      benefits: "Control editorial, SEO preparado y revision previa.",
      process: "Carga inicial, revision, ajuste comercial y publicacion.",
      faq: "Se publica solo cuando el estado cambia a Publicado.",
      whatsappMessage:
        "Hola, quiero consultar por un servicio de Arqvia.",
      seoTitle: `${serviceTitle} | Arqvia`,
      seoDescription:
        "Servicio en borrador para verificar control editorial de Arqvia.",
      featured: false,
    },
  });

  await prisma.project.create({
    data: {
      publicationStatus: "DRAFT",
      publishedAt: null,
      title: projectTitle,
      slug: projectSlug,
      summary:
        "Proyecto en revision interna antes de aparecer en el portfolio publico.",
      description:
        "Caso de estudio creado como borrador para comprobar que el portfolio puede prepararse sin exponer contenido incompleto.",
      location: "Cordoba Capital",
      year: "2026",
      areaM2: 124,
      status: "En revision",
      clientType: "Residencial",
      servicePerformed: "Proyecto arquitectonico y direccion tecnica",
      coverImage: "/images/arqvia-casa-patio-norte.webp",
      challenge: "Ordenar una ficha comercial antes de publicarla.",
      solution: "Mantener el contenido privado mientras se revisa.",
      process: "Carga, revision editorial, ajuste tecnico y publicacion.",
      result: "Caso listo para ser publicado cuando el equipo lo apruebe.",
      optimized: "Claridad comercial, SEO y consistencia visual.",
      specialNote: "Este contenido debe permanecer fuera del sitio publico.",
      materials: "Hormigon, vidrio y madera.",
      duration: "8 meses",
      constructionSystem: "Tradicional",
      currentStage: "Revision interna",
      responsibleTeam: "Equipo Arqvia",
      architectDirector: "Direccion Arqvia",
      featured: false,
      seoTitle: `${projectTitle} | Arqvia`,
      seoDescription:
        "Proyecto en borrador para verificar control editorial de Arqvia.",
      seoCategory: "Residencial",
      imageAlt: "Proyecto residencial en revision interna",
      categoryId: projectCategory.id,
      serviceId: draftService.id,
    },
  });

  await loginAdmin(page);

  await page.goto(`/admin/services?estado=DRAFT&q=${serviceSlug}`);
  const serviceCard = page.getByRole("article").filter({ hasText: serviceTitle });
  await expect(serviceCard.getByRole("heading", { name: serviceTitle })).toBeVisible();
  await expect(serviceCard.getByText("Borrador").first()).toBeVisible();
  await expect(serviceCard.getByRole("link", { name: "Ver" })).toHaveCount(0);

  await page.goto(`/admin/projects?estado=DRAFT&q=${projectSlug}`);
  const projectCard = page.getByRole("article").filter({ hasText: projectTitle });
  await expect(projectCard.getByRole("heading", { name: projectTitle })).toBeVisible();
  await expect(projectCard.getByText("Borrador").first()).toBeVisible();
  await expect(projectCard.getByRole("link", { name: "Ver" })).toHaveCount(0);

  const privateService = await request.get(`/servicios/${serviceSlug}`);
  expect([200, 404]).toContain(privateService.status());
  const privateServiceHtml = await privateService.text();
  expect(privateServiceHtml).not.toContain(serviceTitle);
  expect(privateServiceHtml).toContain("Esta pagina no esta en el plano");
  const privateProject = await request.get(`/proyectos/${projectSlug}`);
  expect([200, 404]).toContain(privateProject.status());
  const privateProjectHtml = await privateProject.text();
  expect(privateProjectHtml).not.toContain(projectTitle);
  expect(privateProjectHtml).toContain("Esta pagina no esta en el plano");

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).not.toContain(`/servicios/${serviceSlug}`);
  expect(sitemap).not.toContain(`/proyectos/${projectSlug}`);
});

test("admin can upload and delete media assets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const title = `Imagen CMS ${suffix}`;
  const altText =
    "Imagen CMS de prueba para biblioteca visual de Arqvia con archivo real.";
  const rightsNote =
    "Fotografía propia de prueba autorizada para la web institucional.";
  const imageBuffer = readFileSync(
    "public/images/arqvia-kitchen-before-remodel.webp",
  );

  await loginAdmin(page);
  await page.goto("/admin/media");

  await expect(
    page.getByRole("heading", { name: /imágenes para proyectos/i }),
  ).toBeVisible();
  await page
    .locator('input[name="file"]')
    .setInputFiles({
      name: `imagen-cms-${suffix}.webp`,
      mimeType: "image/webp",
      buffer: imageBuffer,
    });
  await page.getByLabel(/título interno/i).fill(title);
  await page.getByLabel(/alt text/i).fill(altText);
  await page.locator('select[name="category"]').selectOption("Proyecto");
  const uploadForm = page
    .getByRole("button", { name: /subir imagen/i })
    .locator("xpath=ancestor::form");
  await uploadForm
    .getByLabel(/URL de origen/i)
    .fill("https://arqvia.com.ar/archivo/casa-patio");
  await uploadForm.getByLabel(/Nota de licencia o derechos/i).fill(rightsNote);
  await uploadForm.getByLabel(/Autorizar para uso público/i).check();
  await uploadForm.getByRole("button", { name: /subir imagen/i }).click();

  await expect(page.getByText(/imagen subida correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(
    page.getByRole("status").locator("code").filter({ hasText: /\/uploads\/media\//i }),
  ).toBeVisible();

  await page.goto(`/admin/media?q=${encodeURIComponent(title)}`);
  const mediaCard = page.getByRole("article").filter({ hasText: title });
  await expect(mediaCard.getByRole("heading", { name: title })).toBeVisible();
  await expect(mediaCard.getByText(altText)).toBeVisible();
  await expect(mediaCard.getByText("Aprobada para uso público")).toBeVisible();
  await expect(mediaCard.getByRole("link", { name: "Ver origen" })).toHaveAttribute(
    "href",
    "https://arqvia.com.ar/archivo/casa-patio",
  );
  await expect(mediaCard.locator("img")).toBeVisible();
  await expect(mediaCard.getByText(/\/uploads\/media\//i)).toBeVisible();

  await confirmDeleteFromTrigger(
    page,
    mediaCard.getByRole("button", { name: /eliminar/i }),
    /eliminar imagen/i,
  );
  await expect(page).toHaveURL(/\/admin\/media\?deleted=1/, {
    timeout: adminActionTimeout,
  });
  await page.goto(`/admin/media?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("admin can revoke access without deleting historical authorship", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Usuario CMS ${suffix}`;
  const email = `usuario-cms-${suffix}@arqvia.local`;
  const password = "UsuarioCMS123!";

  await loginAdmin(page);
  await page.goto("/admin/users/new");
  await page.getByLabel(/^nombre$/i).fill(name);
  await page.getByLabel(/^email$/i).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('select[name="role"]').selectOption("EDITOR");
  await page.getByRole("button", { name: /guardar usuario/i }).click();
  await expect(page.getByText(/usuario creado correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("link", { name: /editar usuario/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/users/new",
  );

  await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(
    page.getByRole("article").filter({ hasText: email }).getByText("Editor"),
  ).toBeVisible();

  const savedUser = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  const lead = await prisma.lead.create({
    data: {
      name: `Consulta Arqvia Usuario ${suffix}`,
      email: `consulta-usuario-${suffix}@arqvia.local`,
      phone: "+54 351 555 0102",
      city: "Córdoba Capital",
      projectType: "Construcción llave en mano",
      message: "Consulta asociada a una nota histórica de usuario.",
      sourcePage: "/contacto",
    },
  });
  const note = await prisma.leadNote.create({
    data: {
      leadId: lead.id,
      body: "Nota histórica creada antes de revocar el acceso del usuario.",
      userId: savedUser.id,
    },
  });

  await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
  await expect(
    page.getByRole("article").filter({ hasText: email }).getByText("Activo"),
  ).toBeVisible();
  await page.getByRole("button", { name: /^revocar$/i }).click();
  const cancelDialog = page.getByRole("dialog", { name: /revocar acceso/i });
  await expect(cancelDialog).toBeVisible();
  await cancelDialog.getByRole("button", { name: /cancelar/i }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /^revocar$/i }),
    /revocar acceso/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
      return page
        .getByRole("article")
        .filter({ hasText: email })
        .getByText("Inactivo")
        .count();
    }, { timeout: 20_000 })
    .toBe(1);

  await expect
    .poll(async () => {
      const preservedNote = await prisma.leadNote.findUnique({
        where: { id: note.id },
        select: { body: true, userId: true },
      });
      return preservedNote?.body && preservedNote.userId === savedUser.id;
    }, { timeout: 20_000 })
    .toBeTruthy();

  await prisma.lead.delete({ where: { id: lead.id } });
  await prisma.user.delete({ where: { id: savedUser.id } });
});

test("editor can operate content but cannot access commercial or Admin-only modules", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Usuario CMS ${suffix}`;
  const email = `usuario-cms-${suffix}@arqvia.local`;
  const password = "UsuarioCMS123!";
  const editorLead = await prisma.lead.create({
    data: {
      name: `Consulta Arqvia Editor ${suffix}`,
      email: `consulta-editor-${suffix}@arqvia.test`,
      phone: "+54 351 555 0103",
      city: "Córdoba Capital",
      projectType: "Dirección de obra",
      message: "Consulta para comprobar operaciones autorizadas del rol Editor.",
      sourcePage: "/contacto",
    },
  });

  await loginAdmin(page);
  await page.goto("/admin/users/new");
  await page.getByLabel(/^nombre$/i).fill(name);
  await page.getByLabel(/^email$/i).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('select[name="role"]').selectOption("EDITOR");
  await page.getByRole("button", { name: /guardar usuario/i }).click();
  await expect(page.getByText(/usuario creado correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });

  await page.getByRole("button", { name: /salir/i }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/admin/login?switch=1");
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#admin-password").fill(password);
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /usuarios/i })).toHaveCount(0);

  await expect(page.getByRole("link", { name: "Visitas", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Reportes", exact: true })).toHaveCount(0);
  await page.goto("/admin/media");
  await expect(
    page.getByRole("heading", { name: /im.genes para proyectos/i }),
  ).toBeVisible();

  const editorPatchResponse = await page.request.patch(
    `/api/admin/leads/${editorLead.id}`,
    {
      data: { status: "CONTACTED" },
      headers: { Origin: testOrigin },
    },
  );
  expect(editorPatchResponse.status()).toBe(403);
  const editorNoteResponse = await page.request.post(
    `/api/admin/leads/${editorLead.id}/notes`,
    {
      data: { body: "Seguimiento registrado por Editor desde la matriz E2E." },
      headers: { Origin: testOrigin },
    },
  );
  expect(editorNoteResponse.status()).toBe(403);
  const editorExportResponse = await page.request.get(
    `/api/admin/leads/export?q=${encodeURIComponent(editorLead.email)}`,
    { headers: { Origin: testOrigin } },
  );
  expect(editorExportResponse.status()).toBe(403);

  for (const restrictedPath of [
    "/admin/users",
    "/admin/users/new",
    "/admin/settings",
    "/admin/estimador",
    "/admin/estimador/new",
    "/admin/automations",
    "/admin/activity",
    "/admin/visitas",
    "/admin/reports",
  ]) {
    await expectAdminDashboardRedirect(page, restrictedPath);
  }

  await expect(page.getByRole("link", { name: /usuarios/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /configuraci.n/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /estimador/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /automatizaciones/i })).toHaveCount(0);

  await page.getByRole("button", { name: /salir/i }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/admin/login?switch=1");
  await page.locator("#admin-email").fill("admin@arqvia.local");
  await page.locator("#admin-password").fill("ChangeMe123!");
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();
  await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /revocar/i }),
    /revocar acceso/i,
  );
  await expect
    .poll(async () => {
      const revokedUser = await prisma.user.findUnique({
        where: { email },
        select: { active: true },
      });
      return revokedUser?.active;
    }, { timeout: 20_000 })
    .toBe(false);

  await prisma.lead.delete({ where: { id: editorLead.id } });
  await prisma.user.delete({ where: { email } });
});

test("viewer can review leads but cannot export or update them", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const viewerEmail = `usuario-cms-viewer-${suffix}@arqvia.local`;
  const viewerPassword = "UsuarioCMS123!";
  const lead = await prisma.lead.create({
    data: {
      name: `Consulta Arqvia Viewer ${suffix}`,
      email: `consulta-viewer-${suffix}@arqvia.local`,
      phone: "+54 351 555 0101",
      city: "Córdoba Capital",
      projectType: "Remodelación",
      currentStatus: "Necesita remodelar un espacio existente",
      areaM2: "80",
      budgetRange: "USD 30.000 a 80.000",
      startDate: "Próximos 3 meses",
      needsVisit: true,
      hasPlans: false,
      message: "Quiero revisar un proyecto y coordinar una visita técnica.",
      sourcePage: "/contacto",
      estimate: {
        create: {
          projectTypeKey: "remodelacion-integral",
          projectTypeLabel: "Remodelación integral",
          finishTier: "BALANCED",
          areaM2: 80,
          rateMinUsdM2: 475,
          rateMaxUsdM2: 650,
          totalMinUsd: 38_000,
          totalMaxUsd: 52_000,
          configVersion: 1,
        },
      },
    },
  });
  const visit = await prisma.technicalVisit.create({
    data: { leadId: lead.id },
  });
  const attachment = await prisma.leadAttachment.create({
    data: {
      leadId: lead.id,
      fileName: `viewer-${suffix}.pdf`,
      originalName: `planos-viewer-${suffix}.pdf`,
      storageKey: `local:lead-attachments/viewer-${suffix}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 128,
    },
  });
  await prisma.leadNote.create({
    data: {
      leadId: lead.id,
      body: `Nota privada viewer ${suffix}: presupuesto y decisión comercial interna.`,
    },
  });

  await prisma.user.create({
    data: {
      name: `Usuario CMS Viewer ${suffix}`,
      email: viewerEmail,
      passwordHash: await hash(viewerPassword, 10),
      role: "VIEWER",
      active: true,
    },
  });

  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(viewerEmail);
  await page.locator("#admin-password").fill(viewerPassword);
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

  await expect(page.getByText(lead.name, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.city, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.budgetRange!, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/datos protegidos|informaci.n comercial protegida/i).first()).toBeVisible();

  for (const restrictedPath of [
    "/admin/visitas",
    "/admin/reports",
    "/admin/activity",
    "/admin/estimador",
    "/admin/estimador/new",
    "/admin/automations",
    "/admin/users",
    "/admin/users/new",
    "/admin/settings",
  ]) {
    await expectAdminDashboardRedirect(page, restrictedPath);
  }

  await page.goto("/admin/leads");
  await expect(page.getByRole("link", { name: /exportar csv/i })).toHaveCount(0);
  await expect(page.getByText(/modo lectura/i)).toBeVisible();
  await expect(page.getByText(lead.name, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.city, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.budgetRange!, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.message, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/estimaci.n 38/i)).toHaveCount(0);
  await expect(page.getByText(/prioridad comercial/i)).toHaveCount(0);

  for (const sensitiveQuery of [lead.name, lead.email, lead.phone, lead.city]) {
    await page.goto(`/admin/leads?q=${encodeURIComponent(sensitiveQuery)}`);
    await expect(page.getByText(lead.name, { exact: true })).toHaveCount(0);
    await expect(page.getByText(lead.email, { exact: true })).toHaveCount(0);
    await expect(page.getByText(lead.phone, { exact: true })).toHaveCount(0);
  }

  await page.goto("/admin/projects");
  await expect(page.getByRole("heading", { name: /proyectos y casos de estudio/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /nuevo proyecto/i })).toHaveCount(0);
  await page.goto("/admin/projects/new");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

  await page.goto("/admin/services");
  await expect(page.getByRole("heading", { name: /servicios y p.ginas seo/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /nuevo servicio/i })).toHaveCount(0);
  await page.goto("/admin/services/new");
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/media");
  await expect(
    page.getByRole("heading", { name: /im.genes para proyectos/i }),
  ).toBeVisible();
  await expect(page.locator('input[name="file"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^eliminar$/i })).toHaveCount(0);

  await page.goto(`/admin/leads/${lead.id}`);
  await expect(page.getByText(/modo lectura/i)).toBeVisible();
  await expect(page.getByText(/cambiar estado/i)).toHaveCount(0);
  await expect(page.getByText(/score comercial/i)).toHaveCount(0);
  await expect(page.getByText(/se.ales positivas/i)).toHaveCount(0);
  await expect(page.getByText(/datos a confirmar/i)).toHaveCount(0);
  await expect(page.getByText(lead.name, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.city, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.budgetRange!, { exact: true })).toHaveCount(0);
  await expect(page.getByText(lead.message, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/estimaci.n web/i)).toHaveCount(0);
  await expect(page.getByText(/referencia de inversi.n calculada/i)).toHaveCount(0);
  await expect(
    page.getByText(/el mensaje completo puede contener informaci.n personal/i),
  ).toBeVisible();
  await expect(
    page.getByText(/las se.ales de prioridad.*informaci.n personal/i),
  ).toHaveCount(0);
  await expect(page.getByText(new RegExp(`Nota privada viewer ${suffix}`))).toHaveCount(0);
  await expect(page.getByText(/solo admin y editor pueden ver el detalle/i)).toHaveCount(0);
  await expect(page.getByText(/leadnote/i)).toHaveCount(0);

  const patchResponse = await page.request.patch(`/api/admin/leads/${lead.id}`, {
    data: { status: "CONTACTED" },
    headers: { Origin: testOrigin },
  });
  expect(patchResponse.status()).toBe(403);

  const noteResponse = await page.request.post(
    `/api/admin/leads/${lead.id}/notes`,
    {
      data: { body: "Nota que Viewer no debe poder guardar." },
      headers: { Origin: testOrigin },
    },
  );
  expect(noteResponse.status()).toBe(403);

  const exportResponse = await page.request.get("/api/admin/leads/export", {
    headers: { Origin: testOrigin },
  });
  expect(exportResponse.status()).toBe(403);

  const attachmentResponse = await page.request.get(
    `/api/admin/leads/${lead.id}/attachments/${attachment.id}`,
  );
  expect(attachmentResponse.status()).toBe(403);

  const attachmentDeleteResponse = await page.request.delete(
    `/api/admin/leads/${lead.id}/attachments/${attachment.id}`,
    { headers: { Origin: testOrigin } },
  );
  expect(attachmentDeleteResponse.status()).toBe(403);

  const calendarResponse = await page.request.get(
    `/api/admin/visitas/${visit.id}/calendar`,
  );
  expect(calendarResponse.status()).toBe(403);

  const mediaDeleteResponse = await page.request.delete(
    "/api/admin/media/not-found",
    { headers: { Origin: testOrigin } },
  );
  expect(mediaDeleteResponse.status()).toBe(403);

  const mediaSearchResponse = await page.request.get(
    "/api/admin/media?q=casa&take=5",
  );
  expect(mediaSearchResponse.status()).toBe(200);
  const mediaSearchPayload = (await mediaSearchResponse.json()) as {
    assets: Array<Record<string, unknown>>;
  };
  expect(Array.isArray(mediaSearchPayload.assets)).toBe(true);
  expect(
    mediaSearchPayload.assets.some(
      (asset) => "rightsNote" in asset || "sourceUrl" in asset,
    ),
  ).toBe(false);

  const referenceSearchResponse = await page.request.get(
    "/api/admin/references?type=services&q=obra&take=5",
  );
  expect(referenceSearchResponse.status()).toBe(200);
  const referenceSearchPayload = (await referenceSearchResponse.json()) as {
    options: Array<Record<string, unknown>>;
  };
  expect(Array.isArray(referenceSearchPayload.options)).toBe(true);
  expect(
    referenceSearchPayload.options.some(
      (option) => "seoDescription" in option || "description" in option,
    ),
  ).toBe(false);

  const mediaUploadResponse = await page.request.post("/api/admin/media", {
    headers: { Origin: testOrigin },
    multipart: {
      altText: "Imagen que Viewer no debe poder subir.",
      category: "Proyecto",
      file: {
        name: `viewer-${suffix}.webp`,
        mimeType: "image/webp",
        buffer: readFileSync("public/images/arqvia-kitchen-before-remodel.webp"),
      },
      title: `Imagen Viewer ${suffix}`,
    },
  });
  expect(mediaUploadResponse.status()).toBe(403);
});

test("changing a password revokes an existing user session", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const email = `usuario-cms-session-${suffix}@arqvia.local`;
  const password = "UsuarioCMS123!";
  const user = await prisma.user.create({
    data: {
      name: `Usuario CMS Session ${suffix}`,
      email,
      passwordHash: await hash(password, 10),
      role: "EDITOR",
      active: true,
    },
  });

  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#admin-password").fill(password);
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash("UsuarioCMS456!", 10),
      sessionVersion: { increment: 1 },
    },
  });

  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: /ingresar al admin/i })).toBeVisible();
});

test("estimator kill switch removes every public promotion", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");
  test.setTimeout(60_000);

  const testStartedAt = new Date();
  const original = await prisma.estimateConfig.findUnique({
    where: { id: "arqvia-estimator" },
    select: { enabled: true, updatedAt: true, version: true },
  });
  expect(original).toBeTruthy();

  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill("admin@arqvia.local");
  await page.locator("#admin-password").fill("ChangeMe123!");
  await page.getByRole("button", { name: /entrar al panel/i }).click();
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

  async function setEstimatorEnabled(enabled: boolean, waitForUi = true) {
    await page.goto("/admin/estimador");
    const toggle = page.getByRole("checkbox", {
      name: /mostrar el estimador en el sitio p.blico/i,
    });
    if ((await toggle.isChecked()) !== enabled) {
      await toggle.setChecked(enabled);
    }
    await page
      .getByRole("button", { name: /guardar configuraci.n/i })
      .click();
    await expect
      .poll(
        async () =>
          (
            await prisma.estimateConfig.findUnique({
              where: { id: "arqvia-estimator" },
              select: { enabled: true },
            })
          )?.enabled,
      )
      .toBe(enabled);
    if (waitForUi) {
      await expect(
        page.getByText(/configuraci.n guardada y publicada/i),
      ).toBeVisible({ timeout: 15_000 });
    }
  }

  try {
    await setEstimatorEnabled(false);

    await page.goto("/");
    await expect(
      page.locator("header").getByRole("link", { name: /estimador/i }),
    ).toHaveCount(0);
    await expect(
      page.locator("footer").getByRole("link", { name: /estimar inversi.n/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /estim. un rango/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /prepar. la informaci.n clave/i }),
    ).toHaveCount(0);

    await page.goto("/estimador");
    await expect(
      page.getByRole("heading", { name: /cada proyecto necesita un alcance/i }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i,
    );
    await expect(
      page.locator('script[type="application/ld+json"]').filter({
        hasText: "WebApplication",
      }),
    ).toHaveCount(0);

    const sitemap = await request.get("/sitemap.xml");
    expect(await sitemap.text()).not.toContain("/estimador");
  } finally {
    try {
      await setEstimatorEnabled(original!.enabled, false);
    } finally {
      await prisma.$transaction([
        prisma.estimateConfig.update({
          where: { id: "arqvia-estimator" },
          data: {
            enabled: original!.enabled,
            updatedAt: original!.updatedAt,
            version: original!.version,
          },
        }),
        prisma.auditLog.deleteMany({
          where: {
            createdAt: { gte: testStartedAt },
            entity: "EstimateConfig",
            entityId: "arqvia-estimator",
          },
        }),
      ]);
    }
  }
});

test("admin can manage project and service categories", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const projectName = `Categoría Proyecto CMS ${suffix}`;
  const projectSlug = `categoria-proyecto-cms-${suffix}`;
  const serviceName = `Categoría Servicio CMS ${suffix}`;
  const serviceSlug = `categoria-servicio-cms-${suffix}`;

  await loginAdmin(page);

  await page.goto("/admin/categories/new?type=project");
  await page.getByLabel(/^nombre$/i).fill(projectName);
  await page.getByLabel(/^slug$/i).fill(projectSlug);
  await page
    .getByLabel(/^descripción$/i)
    .fill("Categoría creada desde el CMS para organizar proyectos de Arqvia.");
  await page.getByRole("button", { name: /guardar categoría/i }).click();
  await expect(page.getByText(/categoría creada correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("link", { name: /editar categor.a/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver proyectos/i })).toHaveAttribute(
    "href",
    "/proyectos",
  );
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/categories/new?type=project",
  );

  await page.goto("/admin/categories/new?type=service");
  await page.getByLabel(/^nombre$/i).fill(serviceName);
  await page.getByLabel(/^slug$/i).fill(serviceSlug);
  await page
    .getByLabel(/^descripción$/i)
    .fill("Categoría creada desde el CMS para agrupar servicios de Arqvia.");
  await page.getByRole("button", { name: /guardar categoría/i }).click();
  await expect(page.getByText(/categoría creada correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("link", { name: /editar categor.a/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver servicios/i })).toHaveAttribute(
    "href",
    "/servicios",
  );
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/categories/new?type=service",
  );

  await page.goto(`/admin/categories?q=${encodeURIComponent("CMS " + suffix)}`);
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByRole("heading", { name: serviceName })).toBeVisible();
  await expect(page.getByText("Categorías visibles")).toBeVisible();

  await page.goto(
    `/admin/categories?tipo=project&q=${encodeURIComponent(projectName)}`,
  );
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByRole("heading", { name: serviceName })).toHaveCount(0);

  await page.goto(
    `/admin/categories?tipo=service&q=${encodeURIComponent(serviceName)}`,
  );
  await expect(page.getByRole("heading", { name: serviceName })).toBeVisible();
  await expect(page.getByRole("heading", { name: projectName })).toHaveCount(0);

  await page.goto(`/admin/categories?q=${encodeURIComponent("CMS " + suffix)}`);
  await page
    .getByRole("article")
    .filter({ hasText: projectName })
    .getByRole("button", { name: /eliminar/i })
    .click();
  const cancelDialog = page.getByRole("dialog", { name: /eliminar categor/i });
  await expect(cancelDialog).toBeVisible();
  await expect(cancelDialog).toContainText(projectName);
  await cancelDialog.getByRole("button", { name: /cancelar/i }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

  await confirmDeleteFromTrigger(
    page,
    page
      .getByRole("article")
      .filter({ hasText: projectName })
      .getByRole("button", { name: /eliminar/i }),
    /eliminar categor/i,
  );

  await page.goto(`/admin/categories?q=${encodeURIComponent("CMS " + suffix)}`);
  await confirmDeleteFromTrigger(
    page,
    page
      .getByRole("article")
      .filter({ hasText: serviceName })
      .getByRole("button", { name: /eliminar/i }),
    /eliminar categor/i,
  );

  await expect
    .poll(async () => {
      await page.goto(`/admin/categories?q=${encodeURIComponent("CMS " + suffix)}`);
      return (await page.getByText(projectName).count()) + (await page.getByText(serviceName).count());
    }, { timeout: 20_000 })
    .toBe(0);
});

test("admin can create a project that appears on the public site", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");
  test.setTimeout(180_000);

  const suffix = Date.now();
  const title = `Casa CMS ${suffix}`;
  const slug = `casa-cms-${suffix}`;
  const updatedSlug = `${slug}-editada`;
  const galleryAlt = `Galeria CMS ${suffix}`;
  const galleryCaption = "Vista final publicada desde el admin";
  const updatedGalleryCaption = "Vista final actualizada desde el editor";

  await loginAdmin(page);

  await page.goto("/admin/projects/new");
  await page.locator('select[name="publicationStatus"]').selectOption("PUBLISHED");
  await page.getByLabel(/^título$/i).fill(title);
  await page.getByLabel(/^slug$/i).fill(slug);
  await page
    .getByLabel(/^resumen$/i)
    .fill("Proyecto creado desde el CMS para verificar el flujo comercial.");
  await page
    .getByLabel(/descripción larga/i)
    .fill("Caso de estudio generado por Playwright para comprobar que el admin alimenta el portfolio público.");
  await page
    .getByLabel(/^desafío$/i)
    .fill("Ordenar una necesidad residencial y convertirla en un caso de estudio claro.");
  await page
    .getByLabel(/^solución$/i)
    .fill("Definir alcance, materialidad, ficha técnica y narrativa del proyecto.");
  await page
    .getByLabel(/^proceso$/i)
    .fill("Consulta inicial, anteproyecto, documentación, obra y entrega final.");
  await page
    .getByLabel(/^resultado$/i)
    .fill("Proyecto visible en el portfolio público con datos guardados en Prisma.");
  await page.getByLabel(/qué se optimizó/i).fill("Distribución y claridad comercial.");
  await page
    .getByLabel(/qué lo hizo especial/i)
    .fill("La conexión directa entre CMS y página pública.");
  await page.getByLabel(/seo title/i).fill(`${title} | Proyecto CMS`);
  await page
    .getByLabel(/seo description/i)
    .fill("Proyecto de prueba creado desde el admin CMS para verificar el portfolio público.");
  await page
    .getByLabel(/alt text/i)
    .fill("Casa contemporánea creada desde el CMS de Arqvia");

  const coverMediaField = page.getByTestId("media-field-coverImage");
  await coverMediaField
    .locator('input[name="coverImage"]')
    .fill("/images/arqvia-casa-patio-norte.webp");
  const selectedCoverImage = await coverMediaField
    .locator('input[name="coverImage"]')
    .inputValue();
  expect(selectedCoverImage).toMatch(/^\/(images|uploads)\//);

  const galleryMediaField = page.getByTestId("media-gallery-gallery");
  await expect(galleryMediaField).toBeVisible();
  const selectedGalleryImage = "/images/arqvia-casa-patio-norte.webp";
  expect(selectedGalleryImage).toMatch(/^\/(images|uploads)\//);
  await galleryMediaField
    .getByLabel(/url o ruta pública/i)
    .fill(selectedGalleryImage);
  await galleryMediaField.getByLabel(/texto alternativo/i).fill(galleryAlt);
  await galleryMediaField
    .getByLabel(/descripción breve/i)
    .fill(galleryCaption);

  await page.getByRole("button", { name: /guardar proyecto/i }).click();
  await expect(page.getByRole("link", { name: /editar proyecto/i })).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(
    page.getByRole("link", { name: /ver proyecto publicado/i }),
  ).toHaveAttribute("href", `/proyectos/${slug}`);
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/projects/new",
  );
  await expect
    .poll(async () => (await page.request.get(`/proyectos/${slug}`)).status(), {
      timeout: 20_000,
    })
    .toBe(200);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .toContain(`/proyectos/${slug}`);
  await expect
    .poll(
      async () =>
        prisma.project.findUnique({
          where: { slug },
          select: {
            coverImage: true,
            images: { select: { altText: true, caption: true, url: true } },
          },
        }),
      { timeout: 20_000 },
    )
    .toMatchObject({
      coverImage: selectedCoverImage,
      images: [
        {
          altText: galleryAlt,
          caption: galleryCaption,
          url: selectedGalleryImage,
        },
      ],
    });

  await page.goto(`/proyectos/${slug}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByAltText(galleryAlt)).toBeVisible();
  await page.getByAltText(galleryAlt).click();
  await expect(page.getByRole("dialog")).toContainText(galleryCaption);
  await page.getByRole("button", { name: /cerrar/i }).click();

  await page.goto(`/admin/projects?q=${slug}`);
  const projectCard = page.getByRole("article").filter({ hasText: title });
  const editProjectHref = await projectCard
    .getByRole("link", { name: /^editar$/i })
    .getAttribute("href");
  expect(editProjectHref).toMatch(/^\/admin\/projects\/[^/]+$/);
  await page.goto(editProjectHref!);
  const editGalleryField = page.getByTestId("media-gallery-gallery");
  await expect(editGalleryField.getByLabel(/url o ruta pública/i)).toHaveValue(
    selectedGalleryImage,
  );
  await expect(editGalleryField.getByLabel(/texto alternativo/i)).toHaveValue(
    galleryAlt,
  );
  await editGalleryField
    .getByLabel(/descripción breve/i)
    .fill(updatedGalleryCaption);
  await page.getByLabel(/^slug$/i).fill(updatedSlug);
  await page.getByRole("button", { name: /guardar proyecto/i }).click();
  await expect(page.getByText(/proyecto actualizado correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect
    .poll(async () => (await page.request.get(`/proyectos/${updatedSlug}`)).status(), {
      timeout: 20_000,
    })
    .toBe(200);
  await expectPermanentContentRedirect(
    page,
    `/proyectos/${slug}`,
    `/proyectos/${updatedSlug}`,
  );
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .toContain(`/proyectos/${updatedSlug}`);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .not.toContain(`/proyectos/${slug}</loc>`);

  await expect
    .poll(
      async () =>
        prisma.project.findUnique({
          where: { slug: updatedSlug },
          select: { images: { select: { caption: true } } },
        }),
      { timeout: 20_000 },
    )
    .toMatchObject({ images: [{ caption: updatedGalleryCaption }] });
  await page.goto(`/proyectos/${updatedSlug}`);
  await page.getByAltText(galleryAlt).click();
  await expect(page.getByRole("dialog")).toContainText(updatedGalleryCaption);
  await page.getByRole("button", { name: /cerrar/i }).click();

  await page.goto(`/admin/projects?q=${updatedSlug}`);
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /eliminar/i }),
    /eliminar proyecto/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/projects?q=${updatedSlug}`);
      return page.getByText(title).count();
    }, {
      timeout: 20_000,
    })
    .toBe(0);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .not.toContain(`/proyectos/${updatedSlug}`);
  await expect
    .poll(
      async () =>
        (await page.request.get(`/proyectos/${slug}`, { maxRedirects: 0 })).status(),
      { timeout: 20_000 },
    )
    .toBe(404);
});

test("admin cannot publish an incomplete before after project gallery", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const title = `Casa CMS ${suffix} Antes`;
  const slug = `casa-cms-${suffix}-antes`;

  await loginAdmin(page);

  await page.goto("/admin/projects/new");
  await page.getByLabel(/^título$/i).fill(title);
  await page.getByLabel(/^slug$/i).fill(slug);
  await page
    .getByLabel(/^resumen$/i)
    .fill("Proyecto con galería incompleta para validar el par antes y después.");
  await page
    .getByLabel(/descripción larga/i)
    .fill("Caso usado para comprobar que el admin no publica un comparador sin su imagen posterior.");
  await page
    .getByLabel(/^desafío$/i)
    .fill("Evitar que el portfolio muestre transformaciones incompletas.");
  await page
    .getByLabel(/^solución$/i)
    .fill("Validar que before y after se carguen como un par del mismo ambiente.");
  await page
    .getByLabel(/^proceso$/i)
    .fill("Carga de imágenes, validación semántica y rechazo del formulario.");
  await page
    .getByLabel(/^resultado$/i)
    .fill("El proyecto no debe guardarse si falta la imagen after.");
  await page.getByLabel(/qué se optimizó/i).fill("Control editorial de portfolio.");
  await page
    .getByLabel(/qué lo hizo especial/i)
    .fill("La validación evita evidencia visual incompleta.");
  await page.getByLabel(/seo title/i).fill(`${title} | Validación CMS`);
  await page
    .getByLabel(/seo description/i)
    .fill("Validación de galería antes y después para proyectos creados desde admin.");
  await page
    .getByLabel(/alt text/i)
    .fill("Cocina antes de una remodelación incompleta");
  const galleryField = page.getByTestId("media-gallery-gallery");
  await galleryField
    .getByLabel(/url o ruta pública/i)
    .fill("/images/arqvia-kitchen-before-remodel.webp");
  await galleryField.getByLabel(/^tipo$/i).selectOption("before");
  await galleryField
    .getByLabel(/texto alternativo/i)
    .fill("Cocina antes de la intervención");
  await galleryField
    .getByLabel(/descripción breve/i)
    .fill("Estado inicial del mismo ambiente");

  await page.getByRole("button", { name: /guardar proyecto/i }).click();

  await expect(page.getByText(/revisá la galería del proyecto/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(
    page.getByText(/una imagen tipo before y una imagen tipo after/i),
  ).toBeVisible();
  await expect
    .poll(async () => prisma.project.count({ where: { slug } }), {
      timeout: 10_000,
    })
    .toBe(0);
});

test("admin can create a service that appears on the public site", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");
  test.setTimeout(180_000);

  const suffix = Date.now();
  const title = `Servicio CMS ${suffix}`;
  const slug = `servicio-cms-${suffix}`;
  const updatedSlug = `${slug}-editado`;

  await loginAdmin(page);

  await page.goto("/admin/services/new");
  await page.locator('select[name="publicationStatus"]').selectOption("PUBLISHED");
  await page.getByLabel(/^título$/i).fill(title);
  await page.getByLabel(/^slug$/i).fill(slug);
  await page
    .getByLabel(/descripción corta/i)
    .fill("Servicio creado desde el CMS para verificar páginas públicas.");
  await page
    .getByLabel(/descripción larga/i)
    .fill("Página de servicio generada por Playwright para comprobar que el admin alimenta el sitio público.");
  await page
    .getByLabel(/beneficio principal/i)
    .fill("Permite publicar servicios comerciales sin tocar código.");
  await page
    .getByLabel(/para quién es/i)
    .fill("Empresas de arquitectura, construcción, remodelación e interiorismo.");
  await page
    .getByLabel(/beneficios comerciales/i)
    .fill(
      "Ordena el alcance antes de invertir.\nReduce cambios durante la ejecución.\nFacilita comparar presupuestos.",
    );
  await page
    .getByLabel(/mensaje whatsapp/i)
    .fill("Hola, vi este servicio CMS y quiero consultar por mi proyecto.");
  await page.getByLabel(/seo title/i).fill(`${title} | Arqvia`);
  await page
    .getByLabel(/seo description/i)
    .fill("Servicio de prueba creado desde el admin para verificar el CMS público.");

  await page.getByRole("button", { name: /guardar servicio/i }).click();
  await expect
    .poll(
      async () =>
        Boolean(
          await prisma.service.findUnique({
            where: { slug },
            select: { id: true },
          }),
        ),
      { timeout: 90_000 },
    )
    .toBe(true);
  const createdService = await prisma.service.findUniqueOrThrow({
    where: { slug },
    select: { id: true },
  });
  await expect
    .poll(async () => (await page.request.get(`/servicios/${slug}`)).status(), {
      timeout: 20_000,
    })
    .toBe(200);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .toContain(`/servicios/${slug}`);

  await page.goto(`/servicios/${slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();

  await page.goto(`/admin/services/${createdService.id}`);
  await page.getByLabel(/^slug$/i).fill(updatedSlug);
  await page.getByRole("button", { name: /guardar servicio/i }).click();
  await expect
    .poll(async () => (await page.request.get(`/servicios/${updatedSlug}`)).status(), {
      timeout: 90_000,
    })
    .toBe(200);
  await expectPermanentContentRedirect(
    page,
    `/servicios/${slug}`,
    `/servicios/${updatedSlug}`,
  );
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .toContain(`/servicios/${updatedSlug}`);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .not.toContain(`/servicios/${slug}</loc>`);

  await page.goto(`/admin/services?q=${updatedSlug}`);
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /eliminar/i }),
    /eliminar servicio/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/services?q=${updatedSlug}`);
      return page.getByText(title).count();
    }, {
      timeout: 20_000,
    })
    .toBe(0);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .not.toContain(`/servicios/${updatedSlug}`);
  await expect
    .poll(
      async () =>
        (await page.request.get(`/servicios/${slug}`, { maxRedirects: 0 })).status(),
      { timeout: 20_000 },
    )
    .toBe(404);
});

test("admin can review a submitted quote request", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Consulta Arqvia ${suffix}`;
  const email = `consulta-${suffix}@example.com`;
  const attachmentName = `plano-cocina-${suffix}.webp`;
  const attachmentBuffer = readFileSync(
    "public/images/arqvia-kitchen-before-remodel.webp",
  );

  await page.goto("/contacto");
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
  await page.getByLabel(/superficie aproximada/i).fill("85 m2");
  await page
    .getByLabel(/rango de presupuesto/i)
    .selectOption({ label: "USD 30.000 - 80.000" });
  await page.getByLabel(/fecha ideal/i).fill("Próximos 3 meses");
  await page.getByLabel(/necesito visita técnica/i).check();
  await page.getByLabel(/tengo planos o imágenes/i).check();
  await page
    .getByLabel(/links de fotos, planos o referencias/i)
    .fill("https://drive.google.com/arqvia-cocina-estar");
  await page.locator('input[name="attachments"]').setInputFiles({
    name: attachmentName,
    mimeType: "image/webp",
    buffer: attachmentBuffer,
  });
  await expect(page.getByText(attachmentName, { exact: true })).toBeVisible();
  await page
    .getByLabel(/mensaje/i)
    .fill("Queremos remodelar cocina y estar, mejorar iluminación y ordenar el presupuesto por etapas.");
  await page.getByRole("button", { name: /solicitar evaluación/i }).click();
  await expect(page).toHaveURL(/\/gracias/);

  const submittedLead = await prisma.lead.findFirstOrThrow({
    where: { email },
    include: { attachments: true },
  });
  expect(submittedLead.hasPlans).toBe(true);
  expect(submittedLead.attachments).toHaveLength(1);
  expect(submittedLead.attachments[0]).toMatchObject({
    originalName: attachmentName,
    mimeType: "image/webp",
  });
  expect(submittedLead.attachments[0].storageKey).toMatch(/^local:/);

  const anonymousDownload = await page.request.get(
    `/api/admin/leads/${submittedLead.id}/attachments/${submittedLead.attachments[0].id}`,
  );
  expect(anonymousDownload.status()).toBe(403);

  await loginAdmin(page);
  await page.goto(`/admin/leads?q=${encodeURIComponent(email)}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
  await page.getByRole("link", { name }).click();

  await expect(page.getByRole("heading", { name: /necesita resolver/i })).toBeVisible();
  await expect(page.getByText(/remodelar cocina y estar/i)).toBeVisible();
  await expect(
    page.getByText("https://drive.google.com/arqvia-cocina-estar", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/calificaci.n comercial/i)).toBeVisible();
  await expect(page.getByText(/oportunidad para contactar hoy/i)).toBeVisible();
  await expect(page.getByText(/presupuesto alto o amplio/i)).toBeVisible();
  await expect(page.getByText(/brief operativo/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /fotos y planos de la consulta/i }),
  ).toBeVisible();
  await expect(page.getByText(attachmentName, { exact: true })).toBeVisible();
  const attachmentDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /descargar/i }).click();
  const attachmentDownload = await attachmentDownloadPromise;
  expect(await attachmentDownload.failure()).toBeNull();
  expect(attachmentDownload.suggestedFilename()).toBe(attachmentName);

  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", {
      name: new RegExp(`eliminar ${attachmentName}`, "i"),
    }),
  );
  await expect(page.getByText(attachmentName, { exact: true })).toHaveCount(0);
  await expect
    .poll(() =>
      prisma.leadAttachment.count({ where: { leadId: submittedLead.id } }),
    )
    .toBe(0);
  await expect(page.getByText(/primer mensaje sugerido/i)).toBeVisible();
  await expect(page.getByText(/resumen interno/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /responder por whatsapp/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /responder por email/i })).toBeVisible();
  await expect(page.getByText(/plantillas r.pidas/i)).toBeVisible();
  await page.getByRole("button", { name: /whatsapp/i }).click();
  await expect(page.getByLabel(/nueva nota/i)).toHaveValue(/WhatsApp/);

  const note = `Nota comercial ${suffix}`;
  await page.getByLabel(/nueva nota/i).fill(note);
  await page.getByRole("button", { name: /guardar nota/i }).click();
  await expect(page.getByText(/nota guardada correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByText(note).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /actividad reciente/i })).toBeVisible();

  await page.getByRole("link", { name: /historial de cambios/i }).click();
  await expect(page.getByRole("heading", { name: /actividad del panel/i })).toBeVisible();
  await expect(page.getByText(/agregó una nota interna/i).first()).toBeVisible();
  await expect(page.getByText(note)).toHaveCount(0);

  await page.goto(`/admin/leads?q=${encodeURIComponent(email)}`);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /exportar csv/i }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();

  await page.goto("/admin/activity");
  await expect(page.getByText(`Nueva consulta web de ${name}`).first()).toBeVisible();
  await page.goto(
    `/admin/activity?entidad=LeadNote&q=${encodeURIComponent(name)}`,
  );
  await expect(page.getByText("Resultado actual")).toBeVisible();
  await expect(page.getByText(/agregó una nota interna/i).first()).toBeVisible();
  await expect(page.getByText(note)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /exportar csv/i })).toHaveAttribute(
    "href",
    /(?=.*entidad=LeadNote)(?=.*q=)/,
  );
  const activityExport = await page.request.get(
    `/api/admin/activity/export?entidad=LeadNote&q=${encodeURIComponent(name)}`,
    { headers: { Origin: testOrigin } },
  );
  expect(activityExport.status()).toBe(200);
  expect(activityExport.headers()["content-disposition"]).toContain(
    "arqvia-actividad-leadnote-todas.csv",
  );
  expect(activityExport.headers()["x-arqvia-export-truncated"]).toBe("false");
  expect(activityExport.headers()["x-arqvia-export-row-count"]).toMatch(/^\d+$/);
  expect(await activityExport.text()).toContain("LeadNote");
  await expect
    .poll(() =>
      prisma.auditLog.count({
        where: { action: "EXPORT_ACTIVITY", entity: "AuditLog" },
      }),
    )
    .toBeGreaterThan(0);
});

test("public technical visit request can be coordinated and downloaded from the admin agenda", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Visita E2E ${suffix}`;
  const email = `visita-e2e-${suffix}@example.com`;
  const phone = `+54 351 6${String(suffix).slice(-6)}`;
  const preferredDate = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const scheduledDate = new Date(Date.now() + 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const scheduledTime = "14:30";
  const address = "Av. Rafael Nunez 6200, Cordoba";
  const requestNotes = "Hay acceso lateral; revisar cocina y galeria.";
  const internalNotes = "Llevar medidor laser y revisar acceso lateral.";

  await page.goto("/contacto");
  await page.getByLabel(/nombre completo/i).fill(name);
  await page.getByLabel(/whatsapp/i).fill(phone);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/ciudad/i).fill("Cordoba Capital");
  await page
    .getByText(/agregar superficie, presupuesto, visita o archivos/i)
    .click();
  await page.getByLabel(/tipo de cliente/i).selectOption({ label: "Particular" });
  await page.getByLabel(/tipo de proyecto/i).selectOption({ label: "Remodelación" });
  await page.getByLabel(/necesito visita t.cnica/i).check();
  await page.getByLabel(/fecha preferida/i).fill(preferredDate);
  await page.getByLabel(/direcci.n o referencia del espacio/i).fill(address);
  await page.getByLabel(/^tarde$/i).check();
  await page.getByLabel(/detalle para la visita/i).fill(requestNotes);
  await page
    .getByLabel(/mensaje/i)
    .fill("Necesito evaluar una remodelacion integral y ordenar el alcance de obra.");
  await page.getByRole("button", { name: /solicitar evaluaci.n/i }).click();
  await expect(page).toHaveURL(/\/gracias/);

  const submittedLead = await prisma.lead.findFirstOrThrow({
    where: { email },
    include: { technicalVisit: true },
  });
  expect(submittedLead.needsVisit).toBe(true);
  expect(submittedLead.technicalVisit).toMatchObject({
    status: "REQUESTED",
    requestedDate: preferredDate,
    preferredWindow: "AFTERNOON",
    address,
    requestNotes,
    scheduledAt: null,
  });

  await loginAdmin(page);
  await page.goto(`/admin/leads/${submittedLead.id}#visita-tecnica`);
  const visitSection = page.locator("#visita-tecnica");
  await expect(visitSection.getByText("Por la tarde", { exact: true })).toBeVisible();
  await expect(visitSection.getByText(requestNotes, { exact: true })).toBeVisible();
  await expect(visitSection.getByLabel(/direcci.n/i)).toHaveValue(address);

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@arqvia.local" },
  });

  await visitSection.getByLabel(/estado/i).selectOption("CONFIRMED");
  await visitSection.getByLabel(/fecha confirmada/i).fill(scheduledDate);
  await visitSection.getByLabel(/horario/i).fill(scheduledTime);
  await visitSection.getByLabel(/duraci.n/i).selectOption("90");
  await visitSection.getByLabel(/responsable/i).selectOption(admin.id);
  await visitSection.getByLabel(/notas internas/i).fill(internalNotes);
  await visitSection.getByRole("button", { name: /guardar coordinaci.n/i }).click();

  const expectedScheduledAt = new Date(
    `${scheduledDate}T${scheduledTime}:00-03:00`,
  );
  await expect
    .poll(async () => {
      const visit = await prisma.technicalVisit.findUniqueOrThrow({
        where: { leadId: submittedLead.id },
      });
      return {
        status: visit.status,
        scheduledAt: visit.scheduledAt?.toISOString(),
        durationMinutes: visit.durationMinutes,
        assignedUserId: visit.assignedUserId,
        address: visit.address,
        internalNotes: visit.internalNotes,
      };
    }, { timeout: adminActionTimeout })
    .toEqual({
      status: "CONFIRMED",
      scheduledAt: expectedScheduledAt.toISOString(),
      durationMinutes: 90,
      assignedUserId: admin.id,
      address,
      internalNotes,
    });

  const persistedVisit = await prisma.technicalVisit.findUniqueOrThrow({
    where: { leadId: submittedLead.id },
  });
  await page.goto(
    `/admin/visitas?vista=proximas&q=${encodeURIComponent(email)}`,
  );
  await expect(
    page.getByRole("heading", { name: /agenda de visitas t.cnicas/i }),
  ).toBeVisible();
  const visitRow = page.getByRole("row").filter({ hasText: name });
  await expect(visitRow).toContainText("Confirmada");
  await expect(visitRow).toContainText("Admin Arqvia");
  await expect(visitRow).toContainText(address);

  const calendarDownloadPromise = page.waitForEvent("download");
  await page
    .getByRole("link", { name: `Descargar calendario de ${name}` })
    .click();
  const calendarDownload = await calendarDownloadPromise;
  expect(await calendarDownload.failure()).toBeNull();
  expect(calendarDownload.suggestedFilename()).toBe(
    `visita-arqvia-${scheduledDate}.ics`,
  );
  const calendarPath = await calendarDownload.path();
  expect(calendarPath).not.toBeNull();
  const calendar = readFileSync(calendarPath!, "utf8");
  const unfoldedCalendar = calendar.replace(/\r\n[ \t]/g, "");
  const formatIcsDate = (value: Date) =>
    value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const expectedEnd = new Date(expectedScheduledAt.getTime() + 90 * 60_000);

  expect(calendar).toContain("BEGIN:VCALENDAR\r\n");
  expect(unfoldedCalendar).toContain(`UID:${persistedVisit.id}@arqvia`);
  expect(unfoldedCalendar).toContain(
    `DTSTART:${formatIcsDate(expectedScheduledAt)}`,
  );
  expect(unfoldedCalendar).toContain(`DTEND:${formatIcsDate(expectedEnd)}`);
  expect(unfoldedCalendar).toContain(`SUMMARY:Visita técnica - ${name}`);
  expect(unfoldedCalendar).toContain(
    "LOCATION:Av. Rafael Nunez 6200\\, Cordoba",
  );
  expect(unfoldedCalendar).toContain(`Notas: ${internalNotes}`);
  expect(calendar).toContain("END:VCALENDAR\r\n");

  const conflictLead = await prisma.lead.create({
    data: {
      name: `Visita E2E Superposición ${suffix}`,
      email: `visita-e2e-conflicto-${suffix}@example.com`,
      phone: "+54 351 555 6677",
      city: "Córdoba Capital",
      projectType: "Remodelación",
      needsVisit: true,
      hasPlans: false,
      message: "Necesito coordinar una visita técnica.",
      sourcePage: "/contacto",
      technicalVisit: {
        create: { preferredWindow: "FLEXIBLE", status: "REQUESTED" },
      },
    },
  });
  await page.goto(`/admin/leads/${conflictLead.id}#visita-tecnica`);
  const conflictSection = page.locator("#visita-tecnica");
  await conflictSection.getByLabel(/estado/i).selectOption("CONFIRMED");
  await conflictSection.getByLabel(/fecha confirmada/i).fill(scheduledDate);
  await conflictSection.getByLabel(/horario/i).fill(scheduledTime);
  await conflictSection.getByLabel(/duraci.n/i).selectOption("60");
  await conflictSection
    .getByLabel(/responsable/i)
    .selectOption(admin.id);
  await conflictSection
    .getByRole("button", { name: /guardar coordinaci.n/i })
    .click();
  await expect(
    conflictSection.getByText(/ya tiene otra visita en ese horario/i),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const visit = await prisma.technicalVisit.findUniqueOrThrow({
        where: { leadId: conflictLead.id },
      });
      return { scheduledAt: visit.scheduledAt, status: visit.status };
    })
    .toEqual({ scheduledAt: null, status: "REQUESTED" });
});

test("lead API isolates repeated public submissions as possible duplicates", async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Consulta Arqvia Dedupe ${suffix}`;
  const email = `consulta-dedupe-${suffix}@example.com`;
  const phone = "+54 351 555 7788";

  const firstResponse = await request.post("/api/leads", {
    headers: leadRequestHeaders,
    data: {
      name,
      email,
      phone,
      city: "Córdoba Capital",
      clientType: "Particular",
      projectType: "Construcción llave en mano",
      currentStatus: "Tengo terreno y necesito ordenar el proyecto",
      areaM2: "180 m2",
      budgetRange: "USD 80.000 o más",
      startDate: "Próximos 3 meses",
      needsVisit: true,
      hasPlans: false,
      message:
        "Quiero avanzar con una vivienda y necesito una primera lectura técnica del proyecto.",
      sourcePage: "/contacto",
    },
  });

  expect(firstResponse.status()).toBe(201);
  const firstBody = await firstResponse.json();
  expect(firstBody).toMatchObject({ ok: true });
  expect(firstBody).not.toHaveProperty("deduped");

  const firstLead = await prisma.lead.findFirstOrThrow({
    where: { normalizedEmail: email },
    include: { technicalVisit: true },
  });
  await prisma.technicalVisit.update({
    where: { leadId: firstLead.id },
    data: {
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 86_400_000),
      internalNotes: "Ciclo anterior finalizado",
    },
  });

  const secondResponse = await request.post("/api/leads", {
    headers: leadRequestHeaders,
    data: {
      name,
      email: email.toUpperCase(),
      phone: "+54 (351) 555-7788",
      city: "Villa Allende",
      clientType: "Particular",
      projectType: "Construcción llave en mano",
      currentStatus: "Tengo planos y quiero revisar presupuesto",
      areaM2: "185 m2",
      budgetRange: "USD 120.000 o más",
      startDate: "Este mes",
      needsVisit: true,
      hasPlans: true,
      message:
        "Volví a consultar porque ya tengo más información y quiero coordinar una visita técnica.",
      sourcePage: "/proyectos/casa-patio-norte",
    },
  });

  expect(secondResponse.status()).toBe(201);
  const secondBody = await secondResponse.json();
  expect(secondBody).toMatchObject({ ok: true });
  expect(secondBody).not.toHaveProperty("deduped");

  const matchingLeads = await prisma.lead.findMany({
    where: {
      email: email.toLowerCase(),
    },
    include: {
      notes: true,
      technicalVisit: true,
    },
    orderBy: { createdAt: "asc" },
  });

  expect(matchingLeads).toHaveLength(2);
  expect(matchingLeads[0]).toMatchObject({
    city: "Córdoba Capital",
    budgetRange: "USD 80.000 o más",
    sourcePage: "/contacto",
    hasPlans: false,
  });
  expect(matchingLeads[0].technicalVisit).toMatchObject({
    status: "COMPLETED",
    internalNotes: "Ciclo anterior finalizado",
  });
  expect(matchingLeads[0].technicalVisit?.scheduledAt).not.toBeNull();
  expect(matchingLeads[0].notes).toHaveLength(0);
  expect(matchingLeads[1]).toMatchObject({
    budgetRange: "USD 120.000 o más",
    city: "Villa Allende",
    hasPlans: true,
    message:
      "Volví a consultar porque ya tengo más información y quiero coordinar una visita técnica.",
    possibleDuplicateOfId: matchingLeads[0].id,
    sourcePage: "/proyectos/casa-patio-norte",
  });
  expect(matchingLeads[1].technicalVisit).toMatchObject({
    status: "REQUESTED",
  });

  await expect
    .poll(
      () =>
        prisma.auditLog.count({
          where: {
            entity: "Lead",
            entityId: matchingLeads[1].id,
            summary: {
              contains: "Posible reconsulta web",
            },
          },
        }),
      { timeout: 20_000 },
    )
    .toBe(1);

  const differentIdentityResponse = await request.post("/api/leads", {
    headers: leadRequestHeaders,
    data: {
      name: `Consulta Arqvia Identidad Separada ${suffix}`,
      email,
      phone: "+54 351 555 9900",
      city: "La Calera",
      clientType: "Particular",
      projectType: "Ampliación",
      needsVisit: false,
      hasPlans: false,
      message:
        "Esta consulta comparte email pero no teléfono y debe conservar una ficha independiente.",
      sourcePage: "/contacto",
    },
  });
  expect(differentIdentityResponse.status()).toBe(201);
  const differentIdentityBody = await differentIdentityResponse.json();
  expect(differentIdentityBody).toMatchObject({ ok: true });
  expect(differentIdentityBody).not.toHaveProperty("deduped");
  await expect
    .poll(() => prisma.lead.count({ where: { normalizedEmail: email } }))
    .toBe(3);
});

test("lead API persists the server-calculated estimate and rejects stale versions", async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const config = await prisma.estimateConfig.findUniqueOrThrow({
    where: { id: "arqvia-estimator" },
  });
  const rule = await prisma.estimateRule.findFirstOrThrow({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  const expected = calculateEstimate(rule, 120, "PREMIUM", {
    ESSENTIAL: config.essentialMultiplier,
    BALANCED: config.balancedMultiplier,
    PREMIUM: config.premiumMultiplier,
  });

  if (!config.enabled) {
    await prisma.estimateConfig.update({
      where: { id: config.id },
      data: { enabled: true },
    });
  }

  try {
    const email = `consulta-estimador-${suffix}@example.com`;
    const headers = {
      ...leadRequestHeaders,
      "X-Forwarded-For": "203.0.113.81",
    };
    const payload = {
      name: `Consulta Arqvia Estimador ${suffix}`,
      email,
      phone: `+54 351 7${String(suffix).slice(-6)}`,
      city: "Cordoba Capital",
      clientType: "Particular",
      projectType: rule.label,
      currentStatus: "Tengo una idea inicial",
      areaM2: "120 m2",
      budgetRange: "A definir",
      startDate: "Proximos 6 meses",
      needsVisit: false,
      hasPlans: false,
      message: "Quiero validar el rango inicial y conversar sobre los proximos pasos.",
      sourcePage: "/estimador",
      estimateRuleId: rule.id,
      estimateTier: "PREMIUM",
      estimateAreaM2: 120,
      estimateConfigVersion: config.version,
      totalMinUsd: 1,
      totalMaxUsd: 2,
    };

    const response = await request.post("/api/leads", {
      data: payload,
      headers,
    });
    expect(response.status()).toBe(201);

    const saved = await prisma.lead.findFirstOrThrow({
      where: { normalizedEmail: email },
      include: { estimate: true },
    });
    expect(saved.estimate).toMatchObject({
      areaM2: 120,
      configVersion: config.version,
      finishTier: "PREMIUM",
      projectTypeKey: rule.key,
      rateMaxUsdM2: expected.rateMaxUsdM2,
      rateMinUsdM2: expected.rateMinUsdM2,
      totalMaxUsd: expected.totalMaxUsd,
      totalMinUsd: expected.totalMinUsd,
    });

    const staleEmail = `consulta-estimador-stale-${suffix}@example.com`;
    const staleResponse = await request.post("/api/leads", {
      data: {
        ...payload,
        email: staleEmail,
        phone: `+54 351 8${String(suffix).slice(-6)}`,
        estimateConfigVersion: config.version + 100,
      },
      headers,
    });
    expect(staleResponse.status()).toBe(409);
    await expect
      .poll(() => prisma.lead.count({ where: { normalizedEmail: staleEmail } }))
      .toBe(0);
  } finally {
    if (!config.enabled) {
      await prisma.estimateConfig.update({
        where: { id: config.id },
        data: { enabled: false },
      });
    }
  }
});

test("concurrent lead submissions remain isolated and related for review", async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const email = `consulta-concurrente-${suffix}@example.com`;
  const phone = `+54 351 56${String(suffix).slice(-6)}`;
  const basePayload = {
    name: `Consulta Arqvia Concurrente ${suffix}`,
    email,
    phone,
    city: "Córdoba Capital",
    clientType: "Particular",
    projectType: "Remodelación",
    currentStatus: "Necesito remodelar un espacio existente",
    areaM2: "95 m2",
    budgetRange: "USD 30.000 a 80.000",
    startDate: "Próximos 3 meses",
    needsVisit: true,
    hasPlans: false,
    sourcePage: "/contacto",
  };

  const [firstResponse, secondResponse] = await Promise.all([
    request.post("/api/leads", {
      data: { ...basePayload, message: "Consulta concurrente, variante uno." },
      headers: { ...leadRequestHeaders, "X-Forwarded-For": "203.0.113.40" },
    }),
    request.post("/api/leads", {
      data: { ...basePayload, message: "Consulta concurrente, variante dos." },
      headers: { ...leadRequestHeaders, "X-Forwarded-For": "203.0.113.40" },
    }),
  ]);

  expect([firstResponse.status(), secondResponse.status()].sort()).toEqual([201, 201]);

  const matchingLeads = await prisma.lead.findMany({
    where: { normalizedEmail: email },
    include: {
      automationDeliveries: { select: { event: true } },
      notes: true,
    },
  });
  expect(matchingLeads).toHaveLength(2);
  expect(matchingLeads.flatMap((lead) => lead.notes)).toHaveLength(0);
  expect(
    matchingLeads.filter((lead) => lead.possibleDuplicateOfId !== null),
  ).toHaveLength(1);
  expect(
    matchingLeads
      .flatMap((lead) => lead.automationDeliveries)
      .map((delivery) => delivery.event)
      .sort(),
  ).toEqual(["LEAD_CREATED", "LEAD_RECONSULTED"]);
});

test("admin lead follow-up filters expose stale leads, missing notes and reconsultations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const staleName = `Consulta Arqvia Seguimiento ${suffix}`;
  const staleEmail = `consulta-seguimiento-${suffix}@example.com`;
  const reconsultationName = `Consulta Arqvia Reconsulta ${suffix}`;
  const reconsultationEmail = `consulta-reconsulta-${suffix}@example.com`;

  const priorLead = await prisma.lead.create({
    data: {
      name: `Consulta antecedente ${suffix}`,
      email: `consulta-antecedente-${suffix}@example.com`,
      phone: "+54 351 555 4499",
      city: "Villa Allende",
      projectType: "Construcción llave en mano",
      message: "Consulta anterior conservada como ficha independiente.",
      sourcePage: "/contacto",
    },
  });

  const staleLead = await prisma.lead.create({
    data: {
      name: staleName,
      email: staleEmail,
      phone: "+54 351 555 4400",
      city: "Córdoba Capital",
      projectType: "Remodelación",
      currentStatus: "Necesito remodelar un espacio existente",
      budgetRange: "USD 30.000 - 80.000",
      needsVisit: true,
      hasPlans: false,
      message: "Necesito reactivar esta consulta porque ya pasaron varios días.",
      sourcePage: "/contacto",
      status: "NEW",
      createdAt: staleDate,
      updatedAt: staleDate,
      lastActivityAt: staleDate,
    },
  });

  const reconsultationLead = await prisma.lead.create({
    data: {
      name: reconsultationName,
      email: reconsultationEmail,
      phone: "+54 351 555 4411",
      city: "Villa Allende",
      projectType: "Construcción llave en mano",
      currentStatus: "Tengo terreno y quiero avanzar",
      budgetRange: "USD 80.000 o más",
      needsVisit: true,
      hasPlans: true,
      message: "Volví a escribir con más información para revisar una obra.",
      sourcePage: "/proyectos/casa-patio-norte",
      possibleDuplicateOfId: priorLead.id,
    },
  });

  await loginAdmin(page);

  await page.goto(
    `/admin/leads?seguimiento=sin-contactar&q=${encodeURIComponent(staleName)}`,
  );
  await expect(page.getByRole("link", { name: staleName }).first()).toBeVisible();
  await expect(
    page.locator("tr").filter({ has: page.getByRole("link", { name: staleName }) }).getByText("Sin contacto 48 h"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: reconsultationName })).toHaveCount(0);

  await page.goto(
    `/admin/leads?seguimiento=sin-notas&q=${encodeURIComponent(staleName)}`,
  );
  await expect(page.getByRole("link", { name: staleName }).first()).toBeVisible();
  await expect(
    page.locator("tr").filter({ has: page.getByRole("link", { name: staleName }) }).getByText("Sin notas"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: reconsultationName })).toHaveCount(0);

  await page.goto(
    `/admin/leads?seguimiento=reconsultas&q=${encodeURIComponent(reconsultationName)}`,
  );
  await expect(page.getByRole("link", { name: reconsultationName }).first()).toBeVisible();
  await expect(
    page.locator("tr").filter({ has: page.getByRole("link", { name: reconsultationName }) }).getByText("Posible reconsulta", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: staleName })).toHaveCount(0);

  await page.getByRole("link", { name: reconsultationName }).first().click();
  await expect(page.getByText(/se conservó como ficha independiente/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /revisar posible antecedente/i })).toBeVisible();

  const exportResponse = await page.request.get(
    "/api/admin/leads/export?seguimiento=reconsultas",
    { headers: { Origin: testOrigin } },
  );
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-disposition"]).toContain(
    "arqvia-leads-historico-todos-reconsultas.csv",
  );
  const exportCsv = await exportResponse.text();
  expect(exportCsv).toContain(reconsultationEmail);
  expect(exportCsv).not.toContain(staleEmail);

  await prisma.lead.deleteMany({
    where: {
      id: {
        in: [staleLead.id, reconsultationLead.id, priorLead.id],
      },
    },
  });
});

test("admin reports summarize leads and export the selected view", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Consulta Arqvia ${suffix} Reporte`;
  const email = `consulta-reporte-${suffix}@example.com`;

  const leadResponse = await request.post("/api/leads", {
    headers: leadRequestHeaders,
    data: {
      name,
      email,
      phone: "+54 351 555 1200",
      city: "Córdoba Capital",
      clientType: "Particular",
      projectType: "Remodelación",
      currentStatus: "Necesito remodelar un espacio existente",
      areaM2: "95 m2",
      budgetRange: "USD 30.000 - 80.000",
      startDate: "Próximos 3 meses",
      needsVisit: true,
      hasPlans: true,
      message:
        "Queremos remodelar cocina y estar con dirección técnica y presupuesto por etapas.",
      sourcePage: "/contacto",
    },
  });
  expect(leadResponse.status()).toBe(201);

  await loginAdmin(page);
  await page.goto("/admin/reports?dias=90");

  await expect(
    page.getByRole("heading", {
      name: /lectura clara de consultas, zonas y oportunidades/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("Córdoba Capital").first()).toBeVisible();
  await expect(page.getByText("Remodelación").first()).toBeVisible();
  await expect(page.getByText(/inteligencia comercial/i)).toBeVisible();
  await expect(page.getByText(/calidad de oportunidades/i)).toBeVisible();
  await expect(page.getByText(/score promedio/i)).toBeVisible();
  await expect(page.getByText(/consultas para responder primero/i)).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByRole("link", { name: /exportar vista/i })).toBeVisible();

  const exportResponse = await page.request.get(
    "/api/admin/leads/export?dias=90&estado=NEW",
    { headers: { Origin: testOrigin } },
  );
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-disposition"]).toContain(
    "arqvia-leads-90d-new.csv",
  );
  expect(exportResponse.headers()["x-arqvia-export-limit"]).toBe("none");
  expect(exportResponse.headers()["x-arqvia-export-truncated"]).toBe("false");
  expect(exportResponse.headers()["x-arqvia-export-row-count"]).toMatch(/^\d+$/);
  expect(exportResponse.headers()["x-arqvia-export-batch-size"]).toBe("250");
  const exportCsv = await exportResponse.text();
  expect(exportCsv).toContain(email);
  expect(exportCsv).toContain("Score comercial");
  expect(exportCsv).toContain("Razones de prioridad");
  expect(exportCsv).toContain("Oportunidad para contactar hoy");

  await page.goto("/admin/reports?dias=90&estado=NEW");
  await expect(page.getByText("Filtrada por Nuevo")).toBeVisible();
  await expect(page.getByRole("link", { name: /nuevo/i }).first()).toBeVisible();
});

test("admin CSV export streams the complete result beyond 1000 leads", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");
  test.setTimeout(120_000);

  const suffix = Date.now();
  const marker = `Exportacion masiva ${suffix}`;
  const leadCount = 1005;
  const oldestCreatedAt = suffix - leadCount - 60_000;

  try {
    await prisma.lead.createMany({
      data: Array.from({ length: leadCount }, (_, index) => ({
        name: `${marker} ${String(index).padStart(4, "0")}`,
        email: `exportacion-masiva-${suffix}-${index}@arqvia.test`,
        phone: `+54 351 7${String(index).padStart(6, "0")}`,
        city: "Cordoba Capital",
        projectType: "Construccion llave en mano",
        message: `${marker}: registro ${index} para validar exportacion completa.`,
        sourcePage: "/contacto",
        createdAt: new Date(oldestCreatedAt + index),
      })),
    });

    await loginAdmin(page);
    const exportResponse = await page.request.get(
      `/api/admin/leads/export?q=${encodeURIComponent(marker)}`,
      { headers: { Origin: testOrigin } },
    );

    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()["x-arqvia-export-row-count"]).toBe(
      String(leadCount),
    );
    expect(exportResponse.headers()["x-arqvia-export-limit"]).toBe("none");
    expect(exportResponse.headers()["x-arqvia-export-truncated"]).toBe("false");

    const csv = await exportResponse.text();
    const rows = csv.trimEnd().split("\r\n");
    expect(rows).toHaveLength(leadCount + 1);
    expect(csv).toContain(`exportacion-masiva-${suffix}-0@arqvia.test`);
    expect(csv).toContain(
      `exportacion-masiva-${suffix}-${leadCount - 1}@arqvia.test`,
    );
    expect(rows[1]).toContain(
      `exportacion-masiva-${suffix}-${leadCount - 1}@arqvia.test`,
    );
    expect(rows.at(-1)).toContain(`exportacion-masiva-${suffix}-0@arqvia.test`);
  } finally {
    await prisma.lead.deleteMany({
      where: { name: { startsWith: marker } },
    });
  }
});

test("admin can publish a FAQ that appears on the public FAQ page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const question = `Pregunta CMS ${suffix}: ¿Cómo se coordina una visita técnica`;
  const answer =
    "La visita técnica se coordina después de revisar ubicación, alcance, fotos disponibles y etapa actual del proyecto para llegar con criterios claros.";
  const category = `Categoría CMS ${suffix}`;

  await loginAdmin(page);
  await page.goto("/admin/faq/new");
  await page.getByLabel(/^pregunta$/i).fill(question);
  await page.getByLabel(/^categoría$/i).fill(category);
  await page.getByLabel(/^orden$/i).fill("1");
  await page.getByLabel(/^respuesta$/i).fill(answer);
  await page.getByRole("button", { name: /guardar pregunta/i }).click();
  await expect(page.getByText(/pregunta frecuente creada correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("button", { name: /guardar pregunta/i })).toBeDisabled();
  await expect(page.getByRole("link", { name: /editar pregunta/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver faq publicada/i })).toHaveAttribute(
    "href",
    "/faq",
  );
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/faq/new",
  );

  await page.goto("/faq");
  await expect(page.getByRole("button", { name: question })).toBeVisible();
  await page.getByRole("button", { name: question }).click();
  await expect(page.getByText(/la visita técnica se coordina/i)).toBeVisible();

  await page.goto(
    `/admin/faq?activa=publicada&q=${encodeURIComponent(question)}`,
  );
  await expect(page.getByRole("heading", { name: question })).toBeVisible();
  await expect(page.getByText("Resultado actual")).toBeVisible();
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /eliminar/i }),
    /eliminar pregunta/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/faq?q=${encodeURIComponent(question)}`);
      return page.getByText(question).count();
    }, {
      timeout: 20_000,
    })
    .toBe(0);
});

test("admin can publish a testimonial that appears on the home page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Cliente CMS ${suffix}`;
  const quote =
    "Este testimonio creado desde el CMS confirma que Arqvia puede publicar experiencias específicas con contexto comercial real.";

  await loginAdmin(page);
  await page.goto("/admin/testimonials/new");
  await page.getByLabel(/^nombre$/i).fill(name);
  await page.getByLabel(/^ubicación$/i).fill("Córdoba Capital");
  await page.getByLabel(/tipo de proyecto/i).fill("Remodelación integral");
  await page
    .getByLabel(/servicio o resultado breve/i)
    .fill("Proceso ordenado desde diagnóstico hasta entrega");
  await page.getByLabel(/^testimonio$/i).fill(quote);
  await page.getByRole("button", { name: /guardar testimonio/i }).click();
  await expect(page.getByText(/testimonio creado correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("link", { name: /editar testimonio/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver en la home/i })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/testimonials/new",
  );

  await page.goto("/");
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText(/testimonio creado desde el CMS/i)).toBeVisible();

  await page.goto(
    `/admin/testimonials?destacado=home&q=${encodeURIComponent(name)}`,
  );
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Resultado actual")).toBeVisible();
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /eliminar/i }),
    /eliminar testimonio/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/testimonials?q=${encodeURIComponent(name)}`);
      return page.getByText(name).count();
    }, {
      timeout: 20_000,
    })
    .toBe(0);
});

test("admin can publish a team member that appears on the about page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Integrante CMS ${suffix}`;
  const specialty = `Especialidad CMS ${suffix}`;

  await loginAdmin(page);
  await page.goto("/admin/team/new");
  await page.getByLabel(/^nombre$/i).fill(name);
  await page.getByLabel(/^rol$/i).fill("Dirección técnica");
  await page.getByLabel(/^especialidad$/i).fill(specialty);
  await page
    .getByLabel(/^bio$/i)
    .fill("Perfil creado desde el CMS para verificar que el equipo publicado aparece en la página Nosotros de Arqvia.");
  await page.getByRole("button", { name: /guardar integrante/i }).click();
  await expect(page.getByText(/integrante creado correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("link", { name: /editar integrante/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver en nosotros/i })).toHaveAttribute(
    "href",
    "/nosotros",
  );
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/team/new",
  );

  await page.goto("/nosotros");
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText(/dirección técnica/i).first()).toBeVisible();
  await expect(page.getByText(/perfil creado desde el CMS/i)).toBeVisible();

  await page.goto(`/admin/team?activo=visible&q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Resultado actual")).toBeVisible();
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /eliminar/i }),
    /eliminar integrante/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/team?q=${encodeURIComponent(name)}`);
      return page.getByText(name).count();
    }, { timeout: 20_000 })
    .toBe(0);
});

test("admin can publish a work area that creates a local SEO page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const name = `Área CMS ${suffix}`;
  const slug = `area-cms-${suffix}`;
  const updatedSlug = `${slug}-zona-norte`;

  await loginAdmin(page);
  await page.goto("/admin/areas/new");
  await page.getByLabel(/^nombre$/i).fill(name);
  await page.getByLabel(/^slug$/i).fill(slug);
  await page
    .getByLabel(/^descripción$/i)
    .fill("Zona publicada desde el CMS para verificar páginas locales, footer y sitemap con contenido de Arqvia.");
  await page.getByLabel(/seo title/i).fill(`Arquitectura y obra en ${name}`);
  await page
    .getByLabel(/seo description/i)
    .fill("Página local creada desde el CMS para verificar SEO local y cobertura comercial de Arqvia.");
  await page.getByRole("button", { name: /guardar área/i }).click();
  await expect(page.getByText(/área creada correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("link", { name: /editar .rea/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /ver p.gina local/i })).toHaveAttribute(
    "href",
    `/zonas/${slug}`,
  );
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/areas/new",
  );

  await expect
    .poll(async () => (await page.request.get(`/zonas/${slug}`)).status(), {
      timeout: 20_000,
    })
    .toBe(200);
  await page.goto(`/zonas/${slug}`);
  await expect(page.getByRole("heading", { name: new RegExp(name, "i") })).toBeVisible();

  await page.goto(`/admin/areas?activa=publicada&q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name: /editar/i }).click();
  await page.getByLabel(/^slug$/i).fill(updatedSlug);
  await page.getByRole("button", { name: /guardar área/i }).click();
  await expect(page.getByText(/área actualizada correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect
    .poll(async () => (await page.request.get(`/zonas/${updatedSlug}`)).status(), {
      timeout: 20_000,
    })
    .toBe(200);
  await expectPermanentContentRedirect(
    page,
    `/zonas/${slug}`,
    `/zonas/${updatedSlug}`,
  );
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .toContain(`/zonas/${updatedSlug}`);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .not.toContain(`/zonas/${slug}</loc>`);

  await page.goto(`/admin/areas?activa=publicada&q=${encodeURIComponent(updatedSlug)}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Resultado actual")).toBeVisible();
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /eliminar/i }),
    /eliminar .rea/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/areas?q=${encodeURIComponent(name)}`);
      return page.getByText(name).count();
    }, { timeout: 20_000 })
    .toBe(0);
  await expect
    .poll(
      async () =>
        (await page.request.get(`/zonas/${slug}`, { maxRedirects: 0 })).status(),
      { timeout: 20_000 },
    )
    .toBe(404);
});

test("admin can create a blog post that appears on the public blog", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const title = `Guía CMS ${suffix}`;
  const slug = `guia-cms-${suffix}`;
  const updatedSlug = `${slug}-actualizada`;

  await loginAdmin(page);

  await page.goto("/admin/blog/new");
  await page.getByLabel(/^título$/i).fill(title);
  await page.getByLabel(/^slug$/i).fill(slug);
  await page.getByLabel(/^categoría$/i).fill("Arquitectura");
  await page.getByRole("combobox", { name: /^estado$/i }).selectOption("PUBLISHED");
  await page
    .getByRole("textbox", { name: /^bajada$/i })
    .fill("Guía creada desde el panel para verificar el flujo editorial completo de Arqvia.");
  await page
    .getByRole("textbox", { name: /^contenido$/i })
    .fill(
      "Esta publicación prueba que el blog puede gestionarse desde el panel administrativo sin tocar código.\n\nEl contenido publicado queda disponible para el visitante y puede ayudar a ordenar consultas antes de una reunión inicial.",
    );
  await page.getByLabel(/seo title/i).fill(`${title} | Arqvia`);
  await page
    .getByLabel(/seo description/i)
    .fill("Guía creada desde el admin para verificar publicaciones públicas de Arqvia.");

  await page.getByRole("button", { name: /guardar publicación/i }).click();
  await expect(page.getByRole("link", { name: /editar publicaci.n/i })).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect(page.getByRole("link", { name: /ver publicaci.n/i })).toHaveAttribute(
    "href",
    `/blog/${slug}`,
  );
  await expect(page.getByRole("link", { name: /crear otro/i })).toHaveAttribute(
    "href",
    "/admin/blog/new",
  );
  await expect
    .poll(async () => (await page.request.get(`/blog/${slug}`)).status(), {
      timeout: 20_000,
    })
    .toBe(200);

  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto(`/blog/${slug}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(
    page
      .locator("article p")
      .getByText(
        "Esta publicación prueba que el blog puede gestionarse desde el panel administrativo sin tocar código.",
        { exact: true },
      ),
  ).toBeVisible();

  await page.goto(`/admin/blog?estado=PUBLISHED&q=${slug}`);
  await Promise.all([
    page.waitForURL(/\/admin\/blog\/[^/]+$/),
    page
      .getByRole("article")
      .filter({ hasText: title })
      .getByRole("link", { name: /editar/i })
      .click(),
  ]);
  await page.getByLabel(/^slug$/i).fill(updatedSlug);
  await page.getByRole("button", { name: /guardar publicación/i }).click();
  await expect(page.getByText(/publicación actualizada correctamente/i)).toBeVisible({
    timeout: adminActionTimeout,
  });
  await expect
    .poll(async () => (await page.request.get(`/blog/${updatedSlug}`)).status(), {
      timeout: 20_000,
    })
    .toBe(200);
  await expectPermanentContentRedirect(
    page,
    `/blog/${slug}`,
    `/blog/${updatedSlug}`,
  );
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .toContain(`/blog/${updatedSlug}`);
  await expect
    .poll(async () => (await page.request.get("/sitemap.xml")).text(), {
      timeout: 20_000,
    })
    .not.toContain(`/blog/${slug}</loc>`);

  await page.goto(`/admin/blog?estado=PUBLISHED&q=${updatedSlug}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Resultado actual")).toBeVisible();
  await confirmDeleteFromTrigger(
    page,
    page.getByRole("button", { name: /eliminar/i }),
    /eliminar publicaci.n/i,
  );
  await expect
    .poll(async () => {
      await page.goto(`/admin/blog?q=${slug}`);
      return page.getByText(title).count();
    }, {
      timeout: 20_000,
    })
    .toBe(0);
  await expect
    .poll(
      async () =>
        (await page.request.get(`/blog/${slug}`, { maxRedirects: 0 })).status(),
      { timeout: 20_000 },
    )
    .toBe(404);
});

test("seeded admin can monitor lead automation readiness", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/automations");

  await expect(page).toHaveURL(/\/admin\/automations$/);
  await expect(
    page.getByRole("heading", { name: /entregas de automatizaci.n/i }),
  ).toBeVisible();

  const readiness = page.getByRole("region", {
    name: /configuraci.n de ejecuci.n/i,
  });
  await expect(readiness).toBeVisible();
  await expect(readiness.getByText("Webhook", { exact: true })).toBeVisible();
  await expect(
    readiness.getByText("Procesador programado", { exact: true }),
  ).toBeVisible();
  await expect(readiness.getByText("Host de destino", { exact: true })).toBeVisible();
  await expect(
    readiness.getByText(/captura activa|env.os habilitados|configuraci.n incompleta|automatizaci.n desactivada/i),
  ).toBeVisible();

  await expect(
    page.getByRole("region", { name: /conteos de entregas/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /filtrar por estado/i }),
  ).toBeVisible();
});

test("admin investigates activity by actor, date and contextual resource", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const summary = `Investigación operativa ${suffix}`;
  const resourceId = `project-investigation-${suffix}`;
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@arqvia.local" },
    select: { id: true },
  });
  const log = await prisma.auditLog.create({
    data: {
      action: "UPDATE",
      entity: "Project",
      entityId: resourceId,
      summary,
      userId: admin.id,
    },
  });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  try {
    await loginAdmin(page);
    await page.goto(
      `/admin/activity?q=${encodeURIComponent(resourceId)}&actor=${admin.id}&desde=${today}&hasta=${today}`,
    );

    await expect(page.getByRole("heading", { name: /actividad del panel/i })).toBeVisible();
    await expect(page.getByText(summary, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Responsable")).toHaveValue(admin.id);
    await expect(page.getByLabel("Desde")).toHaveValue(today);
    await expect(page.getByRole("link", { name: /abrir proyecto/i })).toHaveAttribute(
      "href",
      `/admin/projects/${resourceId}`,
    );
  } finally {
    await prisma.auditLog.deleteMany({ where: { id: log.id } });
  }
});

test("admin diagnoses and requeues a failed automation delivery", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const lead = await prisma.lead.create({
    data: {
      city: "Córdoba Capital",
      email: `consulta-automation-investigation-${suffix}@arqvia.test`,
      message: "Verificación de recuperación operativa",
      name: `Consulta Automation Investigation ${suffix}`,
      phone: `351${String(suffix).slice(-7)}`,
      projectType: "Remodelación",
      sourcePage: "/contacto",
    },
  });
  const delivery = await prisma.leadAutomationDelivery.create({
    data: {
      attempts: 2,
      event: "LEAD_CREATED",
      lastAttemptAt: new Date(),
      lastErrorCode: "HTTP_503",
      leadId: lead.id,
      nextAttemptAt: new Date(Date.now() - 60_000),
      payloadJson: JSON.stringify({ lead: { id: lead.id } }),
      responseStatus: 503,
      status: "FAILED",
    },
  });

  try {
    await loginAdmin(page);
    await page.goto(`/admin/automations?entrega=${delivery.id}`);

    const deliveryCard = page
      .getByRole("article")
      .filter({ hasText: lead.name });
    await expect(deliveryCard.getByText(delivery.id, { exact: true })).toBeVisible();
    await expect(
      deliveryCard.getByRole("heading", {
        name: /falla del servicio receptor \(http 503\)/i,
      }),
    ).toBeVisible();
    await expect(deliveryCard.getByLabel("Diagnóstico de la entrega")).toContainText(
      "Reintento recomendado",
    );
    await deliveryCard.getByRole("button", { name: /reencolar entrega/i }).click();
    await expect(deliveryCard.getByRole("status")).toContainText(
      "Entrega reencolada",
    );
    await expect
      .poll(async () =>
        prisma.leadAutomationDelivery.findUnique({
          where: { id: delivery.id },
          select: { attempts: true, status: true },
        }),
      )
      .toEqual({ attempts: 0, status: "PENDING" });
  } finally {
    await prisma.auditLog.deleteMany({
      where: { entity: "LeadAutomationDelivery", entityId: delivery.id },
    });
    await prisma.lead.deleteMany({ where: { id: lead.id } });
  }
});

test("viewer is denied access to lead automation monitoring", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const email = `usuario-cms-automation-viewer-${suffix}@arqvia.local`;
  const password = "UsuarioCMS123!";
  const viewer = await prisma.user.create({
    data: {
      active: true,
      email,
      name: `Usuario CMS Automation Viewer ${suffix}`,
      passwordHash: await hash(password, 10),
      role: "VIEWER",
    },
  });

  try {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#admin-password").fill(password);
    await page.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

    await expect(page.getByRole("link", { name: /automatizaciones/i })).toHaveCount(0);
    await page.goto("/admin/automations");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: /entregas de automatizaci.n/i }),
    ).toHaveCount(0);
  } finally {
    await prisma.user.deleteMany({ where: { id: viewer.id } });
  }
});

test("anonymous automation cron is rejected before queued deliveries are processed", async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const lead = await prisma.lead.create({
    data: {
      city: "Cordoba Capital",
      email: `consulta-automation-cron-${suffix}@arqvia.test`,
      message: "Consulta pendiente usada para verificar la proteccion del cron.",
      name: `Consulta Arqvia Automation Cron ${suffix}`,
      phone: "+54 351 555 1900",
      projectType: "Remodelacion integral",
      sourcePage: "/contacto",
    },
  });
  const delivery = await prisma.leadAutomationDelivery.create({
    data: {
      event: "LEAD_CREATED",
      leadId: lead.id,
      nextAttemptAt: new Date(0),
      payloadJson: "{}",
    },
  });

  try {
    const { combinedEnv } = loadEnvConfig(process.cwd(), false);
    const hasUsableCronSecret =
      (combinedEnv.AUTOMATION_CRON_SECRET?.trim().length || 0) >= 32;
    const response = await request.get("/api/cron/automations");

    expect(response.status()).toBe(hasUsableCronSecret ? 401 : 503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      message: hasUsableCronSecret
        ? "No autorizado"
        : "Automatizaci\u00f3n no configurada",
    });
    expect(response.headers()["cache-control"]).toBe("no-store");

    const untouchedDelivery = await prisma.leadAutomationDelivery.findUniqueOrThrow({
      where: { id: delivery.id },
      select: {
        attempts: true,
        lastAttemptAt: true,
        lastErrorCode: true,
        responseStatus: true,
        status: true,
        updatedAt: true,
      },
    });
    expect(untouchedDelivery).toEqual({
      attempts: 0,
      lastAttemptAt: null,
      lastErrorCode: null,
      responseStatus: null,
      status: "PENDING",
      updatedAt: delivery.updatedAt,
    });
  } finally {
    await prisma.lead.deleteMany({ where: { id: lead.id } });
  }
});
