import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("Admin publishes a reviewed legal document and the public route updates", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate database writes");
  test.setTimeout(60_000);

  const startedAt = new Date();
  const original = await prisma.legalPage.findUniqueOrThrow({
    where: { slug: "privacidad" },
  });
  const title = `Política de privacidad Arqvia E2E ${Date.now()}`;

  try {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill("admin@arqvia.local");
    await page.locator("#admin-password").fill("ChangeMe123!");
    await page.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

    await page.goto("/admin/legal/privacidad");
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="status"]').selectOption("PUBLISHED");
    await page
      .locator('input[name="reviewedBy"]')
      .fill("Revisión jurídica E2E");
    await page.getByRole("button", { name: /guardar documento/i }).click();
    await expect(page.getByRole("status")).toContainText(/documento publicado/i);

    await page.goto("/privacidad");
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/privacidad$/,
    );
  } finally {
    await prisma.$transaction([
      prisma.legalPage.update({
        where: { id: original.id },
        data: {
          content: original.content,
          reviewedAt: original.reviewedAt,
          reviewedBy: original.reviewedBy,
          seoDescription: original.seoDescription,
          seoTitle: original.seoTitle,
          status: original.status,
          summary: original.summary,
          title: original.title,
          updatedAt: original.updatedAt,
        },
      }),
      prisma.auditLog.deleteMany({
        where: {
          createdAt: { gte: startedAt },
          entity: "LegalPage",
          entityId: original.id,
        },
      }),
    ]);
  }
});
