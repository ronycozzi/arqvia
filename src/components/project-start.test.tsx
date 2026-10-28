import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectStart } from "./project-start";
import { readConsultationContext } from "@/lib/consultation-context";

describe("project orientation", () => {
  it("carries the visitor's actual choices to the validated contact flow", () => {
    render(<ProjectStart areas={["Villa Allende", "La Calera"]} />);
    fireEvent.change(screen.getByLabelText("Quiero hacer"), { target: { value: "Remodelación" } });
    fireEvent.change(screen.getByLabelText("Hoy estoy en esta etapa"), { target: { value: "Tengo planos" } });
    fireEvent.change(screen.getByLabelText("Ciudad o zona"), { target: { value: "La Calera" } });
    const destination = new URL(screen.getByRole("link", { name: "Continuar mi consulta" }).getAttribute("href")!, "https://example.invalid");
    expect(destination.pathname).toBe("/contacto");
    expect(readConsultationContext(Object.fromEntries(destination.searchParams))).toMatchObject({ projectType: "Remodelación", currentStatus: "Tengo planos", city: "La Calera" });
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("keeps canonical choices when the site's translator changes option labels", () => {
    render(<ProjectStart areas={[]} />);
    const option = screen.getByRole("option", { name: "Remodelación" }) as HTMLOptionElement;
    // The existing site translator changes text nodes, including option labels.
    option.textContent = "Renovation";
    fireEvent.change(screen.getByLabelText("Quiero hacer"), { target: { value: option.value } });
    const destination = new URL(screen.getByRole("link", { name: "Continuar mi consulta" }).getAttribute("href")!, "https://example.invalid");
    expect(readConsultationContext(Object.fromEntries(destination.searchParams)).projectType).toBe("Remodelación");
  });
});
