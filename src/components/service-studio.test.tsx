import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicService } from "@/types/service";
import { ServiceStudio } from "./service-studio";

const services = ["Interior", "Remodelación", "Construcción"].map((title, index) => ({
  id: `${index}`, title, slug: `servicio-${index}`, categoryName: "Arquitectura", coverImage: `/images/service-${index}.webp`, shortDescription: `Alcance ${title}`, included: [`Entrega ${title}`],
} as PublicService));

describe("service scope selection", () => {
  it("updates the description, deliverables and destination together", () => {
    render(<ServiceStudio services={services} title="Servicios" description="Elegí un alcance" />);
    fireEvent.click(screen.getByRole("tab", { name: /Remodelación/ }));
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Arquitectura Remodelación");
    expect(screen.getByText("Alcance Remodelación")).toBeVisible();
    expect(screen.getByText("Entrega Remodelación")).toBeVisible();
    expect(screen.queryByText("Entrega Interior")).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: /Ver alcance/})).toHaveAttribute("href", "/servicios/servicio-1");
  });
  it("supports keyboard navigation and wraps focus without requiring hover", () => {
    render(<ServiceStudio services={services} title="Servicios" description="Elegí un alcance" />);
    fireEvent.keyDown(screen.getByRole("tab", { name: /Interior/ }), { key: "End" });
    expect(screen.getByRole("tab", { name: /Construcción/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: /Construcción/ }), { key: "ArrowDown" });
    expect(screen.getByRole("tab", { name: /Interior/ })).toHaveFocus();
    expect(screen.getByRole("tab", { name: /Interior/ })).toHaveAttribute("aria-selected", "true");
  });
});
