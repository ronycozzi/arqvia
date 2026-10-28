import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicProject } from "@/types/project";
import { ProjectSelection } from "./project-selection";

const projects = ["Patio", "Umbral"].map((title) => ({ id:title, title, slug:title.toLowerCase(), category:"Casa", location:"Córdoba", coverImage:"/images/example.webp", imageAlt:`Vista de ${title}`, summary:`Proyecto ${title}` } as PublicProject));
describe("project selection", () => {
  it("keeps the chosen image, description and destination together", () => {
    render(<ProjectSelection projects={projects} />);
    fireEvent.click(screen.getByRole("tab", { name:"Casa: Umbral" }));
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Casa: Umbral");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Vista de Umbral");
    expect(screen.getByRole("link", { name:"Ver ficha" })).toHaveAttribute("href", "/proyectos/umbral");
  });
  it("provides keyboard selection and focus without requiring hover", () => {
    render(<ProjectSelection projects={projects} />);
    fireEvent.keyDown(screen.getByRole("tab", { name:"Casa: Patio" }), { key:"ArrowDown" });
    expect(screen.getByRole("tab", { name:"Casa: Umbral" })).toHaveFocus();
    expect(screen.getByRole("tab", { name:"Casa: Umbral" })).toHaveAttribute("aria-selected", "true");
  });
});
