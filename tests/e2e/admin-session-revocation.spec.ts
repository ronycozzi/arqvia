import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("revoked admin session redirects during client navigation", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const email = `admin-client-revocation-${suffix}@arqvia.local`;
  const password = "AdminClient123!";
  const user = await prisma.user.create({
    data: {
      name: `Admin Client Revocation ${suffix}`,
      email,
      passwordHash: await hash(password, 10),
      role: "EDITOR",
      active: true,
    },
  });

  try {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#admin-password").fill(password);
    await page.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

    await prisma.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });

    await page.getByRole("link", { name: /proyectos/i }).first().click();

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
      page.getByRole("heading", { name: /ingresar al admin/i }),
    ).toBeVisible();
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});

test("Admin can close another employee sessions without disabling the account", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const email = `editor-session-revocation-${suffix}@arqvia.local`;
  const password = "EditorSession123!";
  const user = await prisma.user.create({
    data: {
      name: `Editor Session Revocation ${suffix}`,
      email,
      passwordHash: await hash(password, 10),
      role: "EDITOR",
      active: true,
    },
  });
  const employeeContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const employeePage = await employeeContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    await employeePage.goto("/admin/login");
    await employeePage.getByLabel(/email/i).fill(email);
    await employeePage.locator("#admin-password").fill(password);
    await employeePage.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(employeePage.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

    await adminPage.goto("/admin/login");
    await adminPage.getByLabel(/email/i).fill(
      process.env.ADMIN_EMAIL || "admin@arqvia.local",
    );
    await adminPage.locator("#admin-password").fill(
      process.env.ADMIN_PASSWORD || "ChangeMe123!",
    );
    await adminPage.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(adminPage.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

    await adminPage.goto(`/admin/users/${user.id}`);
    await adminPage.getByRole("button", { name: /cerrar sesiones/i }).click();
    const dialog = adminPage.getByRole("dialog", { name: /cerrar sesiones activas/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /confirmar cierre/i }).click();
    await expect(adminPage).toHaveURL(/sessions=revoked/);
    await expect(adminPage.getByRole("status")).toContainText(
      /sesiones activas se cerraron correctamente/i,
    );

    await employeePage.getByRole("link", { name: /proyectos/i }).first().click();
    await expect(employeePage).toHaveURL(/\/admin\/login$/);

    const preservedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { active: true, sessionVersion: true },
    });
    expect(preservedUser.active).toBe(true);
    expect(preservedUser.sessionVersion).toBeGreaterThan(0);
  } finally {
    await employeeContext.close();
    await adminContext.close();
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});
