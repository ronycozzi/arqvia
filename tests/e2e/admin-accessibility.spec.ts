import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient, type UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";

test.setTimeout(120_000);

const prisma = new PrismaClient();
const password = "A11yCoverage123!";
const runId = randomUUID().slice(0, 8);

type CoveredRole = Extract<UserRole, "ADMIN" | "EDITOR" | "VIEWER">;

type Credentials = {
  email: string;
  password: string;
};

type RouteCoverage = {
  heading: RegExp;
  manageAction?: RegExp;
  path: string;
};

const credentials = {} as Record<CoveredRole, Credentials>;
const fixtureUserIds: string[] = [];

const contentRoutes: RouteCoverage[] = [
  {
    path: "/admin/home",
    heading: /contenido comercial de la home/i,
  },
  {
    path: "/admin/pages",
    heading: /p.ginas de confianza y metodolog.a/i,
  },
  {
    path: "/admin/projects",
    heading: /proyectos y casos de estudio/i,
    manageAction: /nuevo proyecto/i,
  },
  {
    path: "/admin/services",
    heading: /servicios y p.ginas seo/i,
    manageAction: /nuevo servicio/i,
  },
  {
    path: "/admin/media",
    heading: /im.genes para proyectos/i,
  },
  {
    path: "/admin/areas",
    heading: /zonas de trabajo y seo local/i,
    manageAction: /nueva .rea/i,
  },
  {
    path: "/admin/faq",
    heading: /preguntas frecuentes y objeciones comerciales/i,
    manageAction: /nueva pregunta/i,
  },
  {
    path: "/admin/blog",
    heading: /gu.as y publicaciones/i,
    manageAction: /nueva publicaci.n/i,
  },
  {
    path: "/admin/categories",
    heading: /organizaci.n de proyectos y servicios/i,
    manageAction: /categor.a proyecto/i,
  },
  {
    path: "/admin/team",
    heading: /responsables visibles y credenciales/i,
    manageAction: /nuevo integrante/i,
  },
  {
    path: "/admin/testimonials",
    heading: /experiencias de clientes y prueba social/i,
    manageAction: /nuevo testimonio/i,
  },
];

const adminOnlyRoutes: RouteCoverage[] = [
  { path: "/admin/users", heading: /usuarios del panel/i },
  {
    path: "/admin/automations",
    heading: /entregas de automatizaci.n/i,
  },
  {
    path: "/admin/settings",
    heading: /marca, contacto y primera pantalla/i,
  },
  {
    path: "/admin/legal",
    heading: /documentos legales del sitio/i,
  },
  { path: "/admin/activity", heading: /actividad del panel/i },
  { path: "/admin/system", heading: /estado del sistema/i },
];

const contentNavigation = [
  /^home(?:\s|$)/i,
  /^p.ginas(?:\s|$)/i,
  /^proyectos(?:\s|$)/i,
  /^servicios(?:\s|$)/i,
  /^im.genes(?:\s|$)/i,
  /^.reas(?:\s|$)/i,
  /^faq(?:\s|$)/i,
  /^blog(?:\s|$)/i,
  /^categor.as(?:\s|$)/i,
  /^equipo(?:\s|$)/i,
  /^testimonios(?:\s|$)/i,
];

const adminOnlyNavigation = [
  /^usuarios(?:\s|$)/i,
  /^automatizaciones(?:\s|$)/i,
  /^configuraci.n(?:\s|$)/i,
  /^legales(?:\s|$)/i,
  /^actividad(?:\s|$)/i,
  /^estado(?:\s|$)/i,
];

test.beforeAll(async () => {
  const staleFixtures = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "a11y-e2e-",
        endsWith: "@arqvia.local",
      },
    },
    select: { id: true },
  });
  const staleFixtureIds = staleFixtures.map(({ id }) => id);

  if (staleFixtureIds.length) {
    await prisma.$transaction([
      prisma.auditLog.deleteMany({
        where: { userId: { in: staleFixtureIds } },
      }),
      prisma.user.deleteMany({
        where: { id: { in: staleFixtureIds } },
      }),
    ]);
  }

  const passwordHash = await hash(password, 10);
  const roles: CoveredRole[] = ["ADMIN", "EDITOR", "VIEWER"];

  await prisma.user.createMany({
    data: roles.map((role) => {
      const email = `a11y-e2e-${role.toLowerCase()}-${runId}@arqvia.local`;
      credentials[role] = { email, password };

      return {
        active: true,
        email,
        name: `A11y ${role} ${runId}`,
        passwordHash,
        role,
      };
    }),
  });

  const users = await prisma.user.findMany({
    where: {
      email: { in: Object.values(credentials).map(({ email }) => email) },
    },
    select: { id: true },
  });
  fixtureUserIds.push(...users.map(({ id }) => id));
});

test.afterAll(async () => {
  if (fixtureUserIds.length) {
    await prisma.auditLog.deleteMany({
      where: { userId: { in: fixtureUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: fixtureUserIds } },
    });
  }
  await prisma.$disconnect();
});

async function loginAs(page: Page, role: CoveredRole) {
  await page.goto("/admin/login?switch=1");
  await expect(page.getByRole("heading", { name: /ingresar al admin/i })).toBeVisible();

  await page.locator("#admin-email").fill(credentials[role].email);
  await page.locator("#admin-password").fill(credentials[role].password);
  await page.getByRole("button", { name: /entrar al panel/i }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();
}

function axeFailureMessage(path: string, violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  const summary = violations
    .map((violation) => {
      const targets = violation.nodes
        .flatMap((node) => node.target)
        .slice(0, 4)
        .join(", ");
      return `${violation.id}: ${violation.help} [${targets}]`;
    })
    .join("\n");

  return `Accessibility violations on ${path}${summary ? `\n${summary}` : ""}`;
}

async function expectAccessiblePage(page: Page, route: RouteCoverage, role: CoveredRole) {
  await page.goto(route.path);
  await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll("/", "\\/")}(?:\\?.*)?$`));

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 2, name: route.heading })).toBeVisible();

  if (route.manageAction) {
    const action = main.getByRole("link", { name: route.manageAction });
    if (role === "VIEWER") {
      await expect(action).toHaveCount(0);
    } else {
      await expect(action).toBeVisible();
    }
  }

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(
    horizontalOverflow,
    `Unexpected document-level horizontal overflow on ${route.path}`,
  ).toBeLessThanOrEqual(1);

  const scan = await new AxeBuilder({ page }).analyze();
  expect
    .soft(scan.violations, axeFailureMessage(route.path, scan.violations))
    .toEqual([]);
}

async function expectResponsiveNavigation(
  page: Page,
  role: CoveredRole,
  projectName: string,
) {
  const isMobile = projectName === "mobile";
  const desktopNavigation = page.getByRole("navigation", {
    name: /^administraci.n$/i,
  });
  const mobileNavigation = page.getByRole("navigation", {
    name: /administraci.n mobile/i,
  });

  if (isMobile) {
    await expect(desktopNavigation).toBeHidden();
    const menu = page.locator("details").filter({
      hasText: /abrir m.dulos del panel/i,
    });
    await expect(menu).toBeVisible();
    await menu.locator("summary").click();
    await expect(menu).toHaveAttribute("open", "");
    await expect(mobileNavigation).toBeVisible();
  } else {
    await expect(desktopNavigation).toBeVisible();
    await expect(mobileNavigation).toBeHidden();
  }

  const navigation = isMobile ? mobileNavigation : desktopNavigation;
  for (const linkName of contentNavigation) {
    await expect(navigation.getByRole("link", { name: linkName })).toBeVisible();
  }

  for (const linkName of adminOnlyNavigation) {
    const link = navigation.getByRole("link", { name: linkName });
    if (role === "ADMIN") {
      await expect(link).toBeVisible();
    } else {
      await expect(link).toHaveCount(0);
    }
  }
}

for (const role of ["ADMIN", "EDITOR", "VIEWER"] as const) {
  test(`${role} has accessible responsive coverage for its admin routes`, async ({
    page,
  }, testInfo) => {
    await loginAs(page, role);
    await expectResponsiveNavigation(page, role, testInfo.project.name);

    for (const route of contentRoutes) {
      await expectAccessiblePage(page, route, role);
    }

    if (role === "ADMIN") {
      for (const route of adminOnlyRoutes) {
        await expectAccessiblePage(page, route, role);
      }
      return;
    }

    for (const route of adminOnlyRoutes) {
      await page.goto(route.path);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(
        page.getByRole("heading", { name: /panel arqvia/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: route.heading }),
      ).toHaveCount(0);
    }
  });
}

test("validation feedback and the revocation dialog stay accessible and non-destructive", async ({
  page,
}) => {
  await loginAs(page, "ADMIN");

  const invalidEmail = `invalid-user-${runId}@arqvia.local`;
  await page.goto("/admin/users/new");
  const userNameField = page.locator('input[name="name"]');
  const userEmailField = page.locator('input[name="email"]');
  await userNameField.fill("A");
  await userEmailField.fill(invalidEmail);
  const passwordField = page.locator('input[name="password"]');
  await passwordField.fill("short");
  await page.getByRole("button", { name: /guardar usuario/i }).click();

  await expect(page.getByRole("status")).toContainText(/revis. los campos marcados/i);
  await expect(userNameField).toHaveAttribute("aria-invalid", "true");
  await expect(passwordField).toHaveAttribute("aria-invalid", "true");
  await expect
    .poll(() => prisma.user.count({ where: { email: invalidEmail } }))
    .toBe(0);

  let scan = await new AxeBuilder({ page }).analyze();
  expect.soft(
    scan.violations,
    axeFailureMessage("/admin/users/new validation", scan.violations),
  ).toEqual([]);

  await page.goto("/admin/categories/new?type=project");
  const categoryNameField = page.locator('input[name="name"]');
  const categorySlugField = page.locator('input[name="slug"]');
  await categoryNameField.fill("A");
  await categorySlugField.fill("Invalid slug");
  await page.getByRole("button", { name: /guardar categor.a/i }).click();

  await expect(page.getByRole("status")).toContainText(/revis. los campos marcados/i);
  await expect(categoryNameField).toHaveAttribute("aria-invalid", "true");
  await expect(categorySlugField).toHaveAttribute("aria-invalid", "true");

  scan = await new AxeBuilder({ page }).analyze();
  expect.soft(
    scan.violations,
    axeFailureMessage("/admin/categories/new validation", scan.violations),
  ).toEqual([]);

  const editorEmail = credentials.EDITOR.email;
  await page.goto(`/admin/users?q=${encodeURIComponent(editorEmail)}`);
  const editorCard = page
    .getByRole("main")
    .getByRole("article")
    .filter({ hasText: editorEmail });
  await expect(editorCard).toBeVisible();

  const revokeTrigger = editorCard.getByRole("button", { name: /revocar/i });
  await revokeTrigger.click();

  const dialog = page.getByRole("dialog", { name: /revocar acceso/i });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByRole("button", { name: /cancelar/i })).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: /confirmar revocaci.n/i }),
  ).toBeEnabled();

  scan = await new AxeBuilder({ page }).analyze();
  expect.soft(
    scan.violations,
    axeFailureMessage("/admin/users revocation dialog", scan.violations),
  ).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(revokeTrigger).toBeFocused();

  const editor = await prisma.user.findUniqueOrThrow({
    where: { email: editorEmail },
    select: { active: true },
  });
  expect(editor.active).toBe(true);
});
