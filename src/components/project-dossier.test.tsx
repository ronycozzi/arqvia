import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectDossier } from "./project-dossier";

const sections = [{ title: "El desafío", text: "Resolver una casa angosta." }, { title: "La ejecución", text: "Coordinación de obra." }, { title: "Vacío", text: "" }];
describe("ProjectDossier", () => {
  it("shows one complete narrative without repeating empty sections", () => {
    render(<ProjectDossier sections={sections} />);
    expect(screen.queryByRole("tab", { name: "Vacío" })).toBeNull();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("El desafío");
    fireEvent.click(screen.getByRole("tab", { name: "La ejecución" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Coordinación de obra.");
    expect(screen.getByRole("tab", { name: "La ejecución" })).toHaveAttribute("aria-selected", "true");
  });
  it("moves focus and selected content with arrow, home and end keys", () => {
    render(<ProjectDossier sections={sections} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "El desafío" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "La ejecución" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("La ejecución");
    fireEvent.keyDown(screen.getByRole("tab", { name: "La ejecución" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "El desafío" })).toHaveFocus();
  });
});
