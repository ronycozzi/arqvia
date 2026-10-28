import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThankYouEstimate } from "./thank-you-estimate";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

describe("ThankYouEstimate", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the confirmation usable when sessionStorage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    const { container } = render(<ThankYouEstimate companyName="Arqvia" whatsapp="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("still displays a valid saved estimate", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(JSON.stringify({
      projectTypeLabel: "Obra nueva", finishTier: "BALANCED", areaM2: 120,
      totalMinUsd: 100000, totalMaxUsd: 150000, configVersion: 1,
    }));
    render(<ThankYouEstimate companyName="Arqvia" whatsapp="" />);
    await waitFor(() => expect(screen.getByText("Rango asociado a tu consulta")).toBeVisible());
    expect(screen.getByText(/Obra nueva · 120 m²/)).toBeVisible();
  });
});
