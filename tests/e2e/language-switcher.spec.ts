import { expect, test } from "@playwright/test";

test("keeps the selected language across the public site and admin access", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  await expect(page.locator("h1")).toContainText(
    "Casas y espacios que parten de cómo los usás.",
  );

  const footerSelector = page.getByRole("group", { name: "Idioma" });
  await footerSelector.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    footerSelector.getByRole("button", { name: "Cambiar a English" }).click(),
  ]);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText(
    "Homes and spaces shaped around how you use them.",
  );
  await expect(page.getByRole("group", { name: "Language" })).toBeVisible();

  await page.goto("/servicios");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText(
    "Design, site supervision and construction.",
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
