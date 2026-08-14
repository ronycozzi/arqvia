import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("Admin updates Nosotros, publishes it and leaves the database clean", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate database writes");
  test.setTimeout(60_000);

  const startedAt = new Date();
  const original = await prisma.institutionalPage.findUniqueOrThrow({
    where: { slug: "nosotros" },
  });
  const title = `Arqvia Nosotros E2E ${Date.now()}`;

  try {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill("admin@arqvia.local");
    await page.locator("#admin-password").fill("ChangeMe123!");
    await page.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(page.getByRole("heading", { name: /panel arqvia/i })).toBeVisible();

    await page.goto("/admin/pages/nosotros");
    await expect(
      page.getByRole("heading", { level: 2, name: /confianza y filosof.a/i }),
    ).toBeVisible();
    await page.locator('textarea[name="title"]').fill(title);
    await page.getByRole("button", { name: /guardar p.gina/i }).click();
    await expect(page.getByRole("status")).toContainText(
      /p.gina actualizada y publicada/i,
    );

    await page.goto("/nosotros");
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      original.seoDescription,
    );
  } finally {
    await prisma.$transaction([
      prisma.institutionalPage.update({
        where: { id: original.id },
        data: {
          slug: original.slug,
          eyebrow: original.eyebrow,
          title: original.title,
          introduction: original.introduction,
          payloadJson: original.payloadJson,
          finalCtaTitle: original.finalCtaTitle,
          finalCtaDescription: original.finalCtaDescription,
          primaryCtaLabel: original.primaryCtaLabel,
          secondaryCtaLabel: original.secondaryCtaLabel,
          whatsappMessage: original.whatsappMessage,
          seoTitle: original.seoTitle,
          seoDescription: original.seoDescription,
          updatedAt: original.updatedAt,
        },
      }),
      prisma.auditLog.deleteMany({
        where: {
          createdAt: { gte: startedAt },
          entity: "InstitutionalPage",
          entityId: original.id,
        },
      }),
    ]);
  }
});
