import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminMobileDisclosure } from "./admin-mobile-disclosure";

describe("AdminMobileDisclosure", () => {
  it("exposes a labelled mobile toggle and preserves its content in the DOM", () => {
    render(
      <AdminMobileDisclosure
        description="Dos tareas pendientes"
        label="Checklist técnico"
      >
        <p>Contenido operativo</p>
      </AdminMobileDisclosure>,
    );

    const toggle = screen.getByRole("button", { name: /checklist técnico/i });
    const content = screen.getByText("Contenido operativo").parentElement;

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", content?.id);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(content).toHaveClass("block");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveClass("hidden");
  });
});
