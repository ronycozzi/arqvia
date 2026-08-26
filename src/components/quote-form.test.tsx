import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuoteForm } from "./quote-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("QuoteForm", () => {
  it("marks every essential lead field as required", () => {
    render(<QuoteForm sourcePage="/contacto" />);

    const essentialFields = [
      screen.getByRole("textbox", { name: "Nombre completo" }),
      screen.getByRole("textbox", { name: "WhatsApp" }),
      screen.getByRole("textbox", { name: "Email" }),
      screen.getByRole("textbox", { name: "Ciudad / zona" }),
      screen.getByRole("combobox", { name: "Tipo de proyecto" }),
      screen.getByRole("textbox", { name: "Mensaje" }),
    ];

    for (const field of essentialFields) {
      expect(field).toBeRequired();
      expect(field).toHaveAttribute("aria-required", "true");
    }

    expect(screen.getByRole("textbox", { name: "WhatsApp" })).toHaveAttribute(
      "type",
      "tel",
    );
    expect(screen.getByRole("link", { name: /política de privacidad/i })).toHaveAttribute(
      "href",
      "/privacidad",
    );
  });

  it("links validation errors to the corresponding controls", async () => {
    render(<QuoteForm sourcePage="/contacto" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Solicitar evaluaci.n del proyecto/,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Ingres. tu nombre completo/)).toBeVisible();
    });

    const nameField = screen.getByRole("textbox", { name: "Nombre completo" });
    const errorId = nameField.getAttribute("aria-describedby");

    expect(nameField).toHaveAttribute("aria-invalid", "true");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId || "")).toHaveTextContent(
      /Ingres. tu nombre completo/,
    );
  });
});
