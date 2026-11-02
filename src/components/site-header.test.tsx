import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackClientConfig } from "@/lib/client-config";
import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

describe("SiteHeader mobile navigation", () => {
  let onBreakpointChange: (() => void) | undefined;
  let desktop: boolean;
  beforeEach(() => {
    desktop = false;
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      get matches() { return desktop; },
      addEventListener: (_event: string, callback: () => void) => { onBreakpointChange = callback; },
      removeEventListener: vi.fn(),
    })));
  });
  afterEach(() => { vi.unstubAllGlobals(); document.body.style.overflow = ""; });

  it("releases page scroll when an open mobile menu switches to desktop", async () => {
    render(<SiteHeader config={fallbackClientConfig} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(document.body.style.overflow).toBe("hidden");
    act(() => { desktop = true; onBreakpointChange?.(); });
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with Escape and returns focus to the menu button", async () => {
    render(<SiteHeader config={fallbackClientConfig} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveFocus());
    expect(document.body.style.overflow).toBe("");
  });
});
