import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadPrivacyEraser } from "./lead-privacy-eraser";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}));

describe("LeadPrivacyEraser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("requires both confirmations and completes the request before navigating", async () => {
    const readPayload = vi.fn().mockResolvedValue({ ok: true });
    const request = vi.fn().mockResolvedValue({
      json: readPayload,
      ok: true,
    });
    vi.stubGlobal("fetch", request);

    render(<LeadPrivacyEraser attachmentCount={2} leadId="lead-privacy-1" />);

    fireEvent.click(
      screen.getByRole("button", { name: /eliminar por privacidad/i }),
    );
    const dialog = screen.getByRole("dialog", {
      name: /eliminar definitivamente la consulta/i,
    });
    const confirmButton = within(dialog).getByRole("button", {
      name: /eliminar definitivamente/i,
    });

    expect(confirmButton).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.change(
      within(dialog).getByLabelText(/para confirmar, escribí eliminar/i),
      { target: { value: "ELIMINAR" } },
    );
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        "/api/admin/leads/lead-privacy-1/privacy",
        {
          body: JSON.stringify({ confirmation: "ELIMINAR" }),
          headers: { "Content-Type": "application/json" },
          method: "DELETE",
        },
      );
      expect(readPayload).toHaveBeenCalledOnce();
      expect(replace).toHaveBeenCalledWith("/admin/leads");
      expect(refresh).toHaveBeenCalledOnce();
    });
  });
});
