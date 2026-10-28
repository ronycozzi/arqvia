import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicClientConfig } from "@/lib/client-config";
import type { PublicProject } from "@/types/project";
import { ArqviaArchitecturalHero } from "./arqvia-architectural-hero";

describe("built work disclosure", () => {
  it("keeps closing panels mounted for animation but inert for keyboard and focus", () => {
    const projects = ["Patio", "Oficina"].map((title,index) => ({id:title,title,slug:title,areaM2:200-index,year:"2026",location:"Córdoba",category:"Proyecto",coverImage:"/images/example.webp",imageAlt:title,summary:title} as PublicProject));
    const {container} = render(<ArqviaArchitecturalHero config={{heroTitle:"Arquitectura",heroSubtitle:"Proyectos",primaryCtaLabel:"Consultar",secondaryCtaLabel:"Proyectos"} as PublicClientConfig} eyebrow="Estudio" imageAlt="Proyecto" trustItems={[]} projects={projects} />);
    fireEvent.click(screen.getByRole("button", {name:/Oficina/}));
    expect(screen.getByRole("button", {name:/Oficina/})).toHaveAttribute("aria-expanded","true");
    expect(screen.getByRole("button", {name:/Patio/})).toHaveAttribute("aria-expanded","false");
    expect(container.querySelector('#obra-panel-Patio')).toHaveAttribute("inert");
    expect(container.querySelector('#obra-panel-Oficina')).not.toHaveAttribute("inert");
    expect(container.querySelector('.obra-index__order')).toBeNull();
  });
});
