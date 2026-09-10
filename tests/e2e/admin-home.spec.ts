import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("Editor updates governed home content and the public page reflects it", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate database writes");
  test.setTimeout(60_000);

  const startedAt = new Date();
  const original = await prisma.homeContent.findUniqueOrThrow({
    where: { id: "arqvia-home" },
  });
  // La sección Proyectos salió de la home (la portada ya es el índice de
  // obra); el campo editable que sigue viéndose en la home es el de servicios.
  const servicesTitle = `Servicios Arqvia E2E ${Date.now()}`;

  try {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill("admin@arqvia.local");
    await page.locator("#admin-password").fill("ChangeMe123!");
    await page.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

    await page.goto("/admin/home");
    await expect(
      page.getByRole("heading", { level: 2, name: /contenido comercial de la home/i }),
    ).toBeVisible();
    await page.locator('textarea[name="servicesTitle"]').fill(servicesTitle);
    await page.getByRole("button", { name: /guardar contenido/i }).click();
    await expect(page.getByRole("status")).toContainText(/home actualizada/i);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 2, name: servicesTitle }),
    ).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      original.seoDescription,
    );
  } finally {
    await prisma.$transaction([
      prisma.homeContent.update({
        where: { id: original.id },
        data: {
          heroEyebrow: original.heroEyebrow,
          heroImageAlt: original.heroImageAlt,
          heroTrustItemsJson: original.heroTrustItemsJson,
          trustMetricsJson: original.trustMetricsJson,
          projectsTitle: original.projectsTitle,
          servicesTitle: original.servicesTitle,
          servicesDescription: original.servicesDescription,
          beforeAfterTitle: original.beforeAfterTitle,
          beforeAfterDescription: original.beforeAfterDescription,
          processTitle: original.processTitle,
          processReasonsJson: original.processReasonsJson,
          processStepsJson: original.processStepsJson,
          finalCtaTitle: original.finalCtaTitle,
          finalCtaDescription: original.finalCtaDescription,
          seoTitle: original.seoTitle,
          seoDescription: original.seoDescription,
          updatedAt: original.updatedAt,
        },
      }),
      prisma.auditLog.deleteMany({
        where: {
          createdAt: { gte: startedAt },
          entity: "HomeContent",
          entityId: original.id,
        },
      }),
    ]);
  }
});
