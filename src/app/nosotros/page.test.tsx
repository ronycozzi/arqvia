import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackInstitutionalPages } from "@/lib/institutional-content";
import { getInstitutionalPage } from "@/lib/institutional-data";
import AboutPage from "./page";

vi.mock("@/lib/institutional-data", () => ({ getInstitutionalPage: vi.fn() }));
vi.mock("@/lib/client-config", () => ({ getClientConfig: async () => ({ whatsapp: "" }) }));
vi.mock("@/lib/team-data", () => ({ getPublicTeamMembers: async () => [] }));
vi.mock("@/lib/seo", () => ({ buildPageMetadata: vi.fn() }));
vi.mock("@/components/app-image", () => ({ default: () => null }));
vi.mock("@/components/tracked-anchor", () => ({
  TrackedAnchor: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe("published about-page content", () => {
  beforeEach(() => {
    vi.mocked(getInstitutionalPage).mockResolvedValue(structuredClone(fallbackInstitutionalPages.nosotros));
  });

  it("preserves the current editorial defaults for the seed content", async () => {
    render(await AboutPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("El espacio se dibuja.La forma de vivirlo se conversa.");
    expect(screen.getByRole("link", { name: "Conversar mi proyecto" })).toHaveAttribute("href", "/contacto?origen=%2Fnosotros");
  });

  it("renders published CMS changes instead of silently replacing them with fixed copy", async () => {
    const page = structuredClone(fallbackInstitutionalPages.nosotros);
    Object.assign(page, {
      title: "Estudio publicado desde el CMS",
      eyebrow: "Nuestro estudio",
      introduction: "Descripción publicada por la persona responsable.",
      finalCtaTitle: "Evaluemos tu próximo proyecto",
      finalCtaDescription: "Descripción de la consulta publicada.",
      primaryCtaLabel: "Solicitar una conversación",
      secondaryCtaLabel: "Consultar por mensaje",
    });
    page.payload.decision.title = "Criterios publicados";
    page.payload.decision.description = "Decisiones y alcance actualizados.";
    vi.mocked(getInstitutionalPage).mockResolvedValue(page);
    render(await AboutPage());
    expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeVisible();
    expect(screen.getByText(page.eyebrow)).toBeVisible();
    expect(screen.getByText(page.introduction)).toBeVisible();
    expect(screen.getByRole("heading", { name: page.payload.decision.title })).toBeVisible();
    expect(screen.getByText(page.payload.decision.description)).toBeVisible();
    expect(screen.getByRole("heading", { name: page.finalCtaTitle })).toBeVisible();
    expect(screen.getByText(page.finalCtaDescription)).toBeVisible();
    expect(screen.getByRole("link", { name: page.primaryCtaLabel })).toHaveAttribute("href", "/contacto?origen=%2Fnosotros");
    expect(screen.getByRole("link", { name: page.secondaryCtaLabel })).toBeVisible();
  });
});
