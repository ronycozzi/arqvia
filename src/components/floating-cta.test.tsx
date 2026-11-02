import { act, fireEvent, render, screen } from "@testing-library/react";
import { flushSync } from "react-dom";
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

  it("keeps the mobile action bar out of the way while editing a field", () => {
    render(<><label>Ciudad<input /></label><FloatingCta config={fallbackClientConfig} /></>);
    act(() => setScrollY(500));
    expect(screen.getByRole("navigation", { name: "Acciones rápidas" })).toBeVisible();
    act(() => screen.getByRole("textbox", { name: "Ciudad" }).focus());
    expect(screen.queryByRole("navigation", { name: "Acciones rápidas" })).not.toBeInTheDocument();
    act(() => screen.getByRole("textbox", { name: "Ciudad" }).blur());
    expect(screen.getByRole("navigation", { name: "Acciones rápidas" })).toBeVisible();
  });

  it.each(["summary", "submit"] as const)(
    "does not interrupt a field-to-%s click inside a form",
    (target) => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <>
          <form onSubmit={onSubmit}>
            <label>Ciudad<input /></label>
            <label>Mensaje<textarea /></label>
            <details>
              <summary>Agregar detalles</summary>
              <p>Datos del proyecto</p>
            </details>
            <button type="submit">Enviar consulta</button>
          </form>
          <button type="button">Fuera del formulario</button>
          <FloatingCta config={fallbackClientConfig} />
        </>,
      );
      act(() => setScrollY(500));
      const field = screen.getByRole("textbox", {
        name: target === "summary" ? "Ciudad" : "Mensaje",
      });
      const control = target === "summary"
        ? screen.getByText("Agregar detalles")
        : screen.getByRole("button", { name: "Enviar consulta" });
      act(() => field.focus());

      const barVisibleDuringBlur: boolean[] = [];
      const recordBlur = () => {
        // A native blur temporarily makes activeElement the body. Flush here
        // to catch a bar mounted between pointerdown and the destination focus.
        flushSync(() => {});
        barVisibleDuringBlur.push(Boolean(
          screen.queryByRole("navigation", { name: "Acciones rápidas" }),
        ));
      };
      document.addEventListener("focusout", recordBlur);
      try {
        fireEvent.pointerDown(control);
        act(() => control.focus());
        expect(barVisibleDuringBlur).toEqual([false]);
        expect(screen.queryByRole("navigation", { name: "Acciones rápidas" }))
          .not.toBeInTheDocument();
        fireEvent.pointerUp(control);
        fireEvent.click(control);
      } finally {
        document.removeEventListener("focusout", recordBlur);
      }

      if (target === "summary") {
        expect(control.closest("details")).toHaveAttribute("open");
      } else {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      }
      act(() => screen.getByRole("button", { name: "Fuera del formulario" }).focus());
      expect(screen.getByRole("navigation", { name: "Acciones rápidas" })).toBeVisible();
    },
  );
});
