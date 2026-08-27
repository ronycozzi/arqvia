import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./site-footer";

vi.mock("next/navigation", () => ({
  usePathname: () => "/blog/guia-publica",
}));

const config = {
  companyName: "Arqvia",
  logoUrl: "",
  primaryColor: "#25261f",
  secondaryColor: "#f4efe7",
  accentColor: "#8b5e2e",
  fontHeading: "Cormorant Garamond",
  fontBody: "Inter",
  whatsapp: "+54 351 555 1234",
  phone: "+54 351 555 1234",
  email: "hola@arqvia.com.ar",
  address: "Córdoba Capital, Argentina",
  businessHours: "Lunes a viernes, 9:00 a 18:00",
  instagramUrl: "",
  linkedinUrl: "",
  facebookUrl: "",
  heroTitle: "Arquitectura pensada para construirse bien.",
  heroSubtitle: "Diseño, planificación y obra.",
  heroImage: "/images/hero.webp",
  primaryCtaLabel: "Solicitar presupuesto",
  secondaryCtaLabel: "Ver proyectos",
};

function renderFooter() {
  return render(
    <SiteFooter
      analyticsEnabled={false}
      areas={[{ name: "Córdoba Capital", slug: "cordoba-capital" }]}
      config={config}
      services={[{ slug: "diseno-interior", title: "Diseño interior" }]}
    />,
  );
}

describe("SiteFooter", () => {
  it("keeps contact and content navigation public and actionable", () => {
    const { container } = renderFooter();
    const footer = screen.getByRole("contentinfo");

    expect(
      within(footer).getByRole("link", { name: config.phone }),
    ).toHaveAttribute("href", "tel:+543515551234");
    expect(
      within(footer).getByRole("link", { name: config.email }),
    ).toHaveAttribute("href", "mailto:hola@arqvia.com.ar");
    expect(
      container.querySelector(
        'a[href="/contacto?origen=%2Fblog%2Fguia-publica"]',
      ),
    ).toBeInTheDocument();
    expect(container.querySelector('a[href^="https://wa.me/"]')).toBeInTheDocument();
    expect(container.querySelector('a[href^="/admin"]')).not.toBeInTheDocument();
    expect(footer).not.toHaveTextContent(/acceso interno/i);
    expect(within(footer).getByRole("group", { name: "Idioma" })).toBeVisible();
    expect(
      within(footer).getByRole("button", { name: "Cambiar a English" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes keyboard-operable mobile disclosure groups", () => {
    const { container } = renderFooter();
    const groups = container.querySelectorAll("footer details");
    const servicesGroup = container.querySelector(
      '[data-footer-group="Servicios"] details',
    ) as HTMLDetailsElement;

    expect(groups).toHaveLength(3);
    expect(servicesGroup.open).toBe(false);
    fireEvent.click(within(servicesGroup).getByText("Servicios"));
    expect(servicesGroup.open).toBe(true);
    expect(
      within(servicesGroup).getByRole("link", { name: "Diseño interior" }),
    ).toHaveAttribute("href", "/servicios/diseno-interior");
  });
});
