import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("an editorial form rejects a version superseded by another editor", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Avoid duplicate DB writes");

  const suffix = Date.now();
  const concurrentLocation = `Villa Allende ${suffix}`;
  const testimonial = await prisma.testimonial.create({
    data: {
      name: `Cliente concurrencia ${suffix}`,
      projectType: "Remodelación integral",
      location: "Córdoba Capital",
      quote:
        "La coordinación fue clara y cada decisión quedó documentada antes de avanzar.",
      featured: false,
    },
  });

  try {
    await page.goto("/admin/login");
    await page.locator("#admin-email").fill("admin@arqvia.local");
    await page.locator("#admin-password").fill("ChangeMe123!");
    await page.getByRole("button", { name: /entrar al panel/i }).click();
    await expect(
      page.getByRole("heading", { name: /panel arqvia/i }),
    ).toBeVisible();

    await page.goto(`/admin/testimonials/${testimonial.id}`);
    const versionInput = page.locator('input[name="expectedUpdatedAt"]');
    const openedVersion = await versionInput.inputValue();
    expect(openedVersion).not.toBe("");

    await prisma.testimonial.update({
      where: { id: testimonial.id },
      data: { location: concurrentLocation },
    });
    await page.getByLabel(/^ubicación$/i).fill(`Mendiolaza ${suffix}`);
    await page.getByRole("button", { name: /guardar testimonio/i }).click();

    await expect(
      page.getByText(/otra persona guardó cambios antes que vos/i),
    ).toBeVisible({ timeout: 45_000 });
    await expect(versionInput).toHaveValue(openedVersion);
    await expect
      .poll(async () =>
        (
          await prisma.testimonial.findUnique({
            where: { id: testimonial.id },
            select: { location: true },
          })
        )?.location,
      )
      .toBe(concurrentLocation);
    await expect
      .poll(() =>
        prisma.auditLog.count({ where: { entityId: testimonial.id } }),
      )
      .toBe(0);
  } finally {
    await prisma.auditLog.deleteMany({
      where: { entityId: testimonial.id },
    });
    await prisma.testimonial.deleteMany({
      where: { id: testimonial.id },
    });
  }
});
