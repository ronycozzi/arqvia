import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackClientConfig } from "@/lib/client-config";
import { FloatingCta } from "./floating-cta";

let pathname = "/proyectos";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

class MockIntersectionObserver {
  static instance: MockIntersectionObserver | null = null;

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instance = this;
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  setIntersecting(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
  });
  fireEvent.scroll(window);
}

describe("FloatingCta", () => {
  beforeEach(() => {
    pathname = "/proyectos";
    MockIntersectionObserver.instance = null;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    setScrollY(0);
  });

  it("appears after the opening content and hides while the footer is visible", () => {
    render(
      <>
        <footer>Pie</footer>
        <FloatingCta config={fallbackClientConfig} />
      </>,
    );

    expect(
      screen.queryByRole("navigation", { name: "Acciones rápidas" }),
    ).not.toBeInTheDocument();

    act(() => setScrollY(500));
    expect(
      screen.getByRole("navigation", { name: "Acciones rápidas" }),
    ).toBeVisible();

    act(() => MockIntersectionObserver.instance?.setIntersecting(true));
    expect(
      screen.queryByRole("navigation", { name: "Acciones rápidas" }),
    ).not.toBeInTheDocument();

    act(() => MockIntersectionObserver.instance?.setIntersecting(false));
    expect(
      screen.getByRole("navigation", { name: "Acciones rápidas" }),
    ).toBeVisible();
  });

  it("never renders on contact, thank-you or admin routes", () => {
    for (const route of ["/contacto", "/gracias", "/admin/leads"]) {
      pathname = route;
      const { unmount } = render(
        <>
          <footer>Pie</footer>
          <FloatingCta config={fallbackClientConfig} />
        </>,
      );

      act(() => setScrollY(500));
      expect(
        screen.queryByRole("navigation", { name: "Acciones rápidas" }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });
});
