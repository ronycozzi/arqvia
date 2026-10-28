import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectJourney } from "./project-journey";

describe("project journey", () => {
  it("presents the requested exploration order and an explicitly conceptual detailed plan", () => {
    render(<ProjectJourney />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["La idea", "La obra", "El proyecto", "La entrega"]);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/arqvia-distribution-study.svg");
    expect(screen.getByText("Estudio de distribución · ilustración conceptual")).toBeVisible();
  });
  it("changes image, content and selected tab together", () => {
    render(<ProjectJourney />);
    fireEvent.click(screen.getByRole("tab", { name: "La obra" }));
    expect(screen.getByRole("tab", { name: "La obra" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("La obra");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Trabajo técnico y seguimiento de una obra en construcción");
    expect(screen.getByRole("heading", { name: "Las decisiones del plano llegan al lugar." })).toBeVisible();
  });
  it("supports keyboard focus and wraps through all stages", () => {
    render(<ProjectJourney />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "La idea" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "La entrega" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Etapa siguiente" }));
    expect(screen.getByRole("tab", { name: "La idea" })).toHaveAttribute("aria-selected", "true");
  });
  it("shows the completed house at handover, hiding inactive images from assistive technology", () => {
    render(<ProjectJourney />);
    fireEvent.click(screen.getByRole("tab", { name: "La entrega" }));
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Vista exterior completa de Casa Patio Norte terminada, con fachada, galería y jardín");
    expect(screen.getByText("Casa Patio Norte · vista del conjunto")).toBeVisible();
    fireEvent.keyDown(screen.getByRole("tab", { name: "La entrega" }), { key: "Home" });
    fireEvent.keyDown(screen.getByRole("tab", { name: "La idea" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "La obra" })).toHaveFocus();
  });
});
