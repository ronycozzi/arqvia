import { expect, test } from "@playwright/test";

test("keeps the selected language across the public site and admin access", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  await expect(page.locator("h1")).toContainText(
    "Arquitectura pensada para construirse bien.",
  );

  const footerSelector = page.getByRole("group", { name: "Idioma" });
  await footerSelector.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    footerSelector.getByRole("button", { name: "Cambiar a English" }).click(),
  ]);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText(
    "Architecture designed to be built well.",
  );
  await expect(page.getByRole("group", { name: "Language" })).toBeVisible();

  await page.goto("/servicios");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText(
    "Design, work and interiors with a clear scope.",
  );

  await page.goto("/admin/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText("Private Arqvia management.");

  const adminSelector = page.getByRole("group", { name: "Language" });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    adminSelector.getByRole("button", { name: "Switch to Español" }).click(),
  ]);

  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  await expect(page.locator("h1")).toContainText("Gestión privada de Arqvia.");
});
