import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadListActions } from "./lead-list-actions";

describe("LeadListActions", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("groups detail and contact actions behind a three-dot disclosure", () => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", request);

    render(
      <LeadListActions
        emailHref="mailto:marina@example.com"
        leadId="lead-1"
        leadLabel="Marina Suárez"
        whatsappHref="https://wa.me/5493515550000"
      />,
    );

    fireEvent.click(
      screen.getByLabelText("Más acciones para Marina Suárez"),
    );

    expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
      "href",
      "/admin/leads/lead-1",
    );
    expect(screen.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/5493515550000",
    );
    expect(screen.getByRole("link", { name: "Enviar email" })).toHaveAttribute(
      "href",
      "mailto:marina@example.com",
    );

    fireEvent.click(screen.getByRole("link", { name: "Abrir WhatsApp" }));
    expect(request).toHaveBeenCalledWith("/api/admin/leads/lead-1/contact", {
      body: JSON.stringify({ channel: "WHATSAPP" }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    });
  });

  it("shows only the detail action when contact data is restricted", () => {
    render(<LeadListActions leadId="lead-2" leadLabel="Consulta 000002" />);

    fireEvent.click(
      screen.getByLabelText("Más acciones para Consulta 000002"),
    );

    expect(screen.getByRole("link", { name: "Abrir ficha" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Abrir WhatsApp" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Enviar email" })).not.toBeInTheDocument();
  });
});
