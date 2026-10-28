import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteForm } from "./quote-form";

const mocks = vi.hoisted(() => ({ push: vi.fn(), trackEvent: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.trackEvent }));

function completeRequiredFields() {
  for (const [label, value] of [
    ["Nombre completo", "Cliente Prueba"],
    ["WhatsApp", "+54 351 555 1212"],
    ["Email", "cliente@example.com"],
    ["Ciudad / zona", "Córdoba"],
    ["Mensaje", "Quiero construir una vivienda y conocer el proceso."],
  ]) {
    fireEvent.change(screen.getByRole("textbox", { name: label }), {
      target: { value },
    });
  }
  fireEvent.change(screen.getByRole("combobox", { name: "Tipo de proyecto" }), {
    target: { value: "Obra nueva" },
  });
}

function submitConsultation() {
  fireEvent.click(screen.getByRole("button", { name: /Solicitar evaluaci.n del proyecto/ }));
}

describe("QuoteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  it("confirms a persisted consultation even when browser storage is blocked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true, estimate: { areaM2: 120 } }), { status: 201 },
    )));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked by privacy settings", "SecurityError");
    });
    render(<QuoteForm sourcePage="/contacto" />);
    completeRequiredFields();
    submitConsultation();

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/gracias"));
    expect(mocks.trackEvent).toHaveBeenCalledWith("generate_lead", expect.any(Object));
  });

  it("does not report success when an HTTP success response lacks a save confirmation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "Unexpected intermediary response" }), { status: 200 },
    )));
    render(<QuoteForm sourcePage="/contacto" />);
    completeRequiredFields();
    submitConsultation();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No recibimos la confirmación"));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Nombre completo" })).toHaveValue("Cliente Prueba");
    expect(mocks.trackEvent).not.toHaveBeenCalledWith("generate_lead", expect.any(Object));
  });

  it("removes hidden visit preferences when the visitor no longer requests a visit", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    render(<QuoteForm sourcePage="/contacto" compact />);
    completeRequiredFields();
    fireEvent.click(screen.getByRole("checkbox", { name: "Necesito visita técnica" }));
    fireEvent.change(screen.getByLabelText("Fecha preferida"), { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByLabelText("Dirección o referencia del espacio"), { target: { value: "Referencia privada que ya no desea enviar" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Necesito visita técnica" }));
    submitConsultation();

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const data = fetch.mock.calls[0][1].body as FormData;
    const payload = JSON.parse(data.get("payload") as string);
    expect(payload.needsVisit).toBe(false);
    expect(payload.visitPreferredDate).toBeUndefined();
    expect(payload.visitAddress).toBeUndefined();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/gracias"));
  });

  it("prefills orientation choices without overwriting a visitor's edits", () => {
    const { rerender } = render(<QuoteForm sourcePage="/" initialDetails={{
      projectType: "Obra nueva", city: "Villa Allende", currentStatus: "Tengo terreno",
      message: "Mi punto de partida: tengo terreno.",
    }} />);
    expect(screen.getByRole("combobox", { name: "Tipo de proyecto" })).toHaveValue("Obra nueva");
    expect(screen.getByRole("textbox", { name: "Ciudad / zona" })).toHaveValue("Villa Allende");
    fireEvent.change(screen.getByRole("textbox", { name: "Mensaje" }), {
      target: { value: "Mi borrador detallado sobre la vivienda que quiero construir." },
    });
    rerender(<QuoteForm sourcePage="/" initialDetails={{ projectType: "Remodelación", city: "Córdoba", message: "Nuevo contexto" }} />);
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toHaveValue("Mi borrador detallado sobre la vivienda que quiero construir.");
    expect(screen.getByRole("combobox", { name: "Tipo de proyecto" })).toHaveValue("Obra nueva");
  });
});
