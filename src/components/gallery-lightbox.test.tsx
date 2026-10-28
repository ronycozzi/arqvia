import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GalleryLightbox } from "./gallery-lightbox";

const images = [
  {
    url: "/images/casa-1.webp",
    altText: "Fachada de la casa hacia el patio",
    caption: "Fachada principal",
    type: "final",
  },
  {
    url: "/images/casa-2.webp",
    altText: "Galería conectada con la piscina",
    caption: "Relación interior exterior",
    type: "final",
  },
];

describe("GalleryLightbox", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("opens a labeled dialog and moves between images with keyboard arrows", () => {
    render(<GalleryLightbox images={images} title="Casa Patio Norte" />);

    const firstTrigger = screen.getByRole("button", {
      name: /abrir imagen 1 de 2/i,
    });
    fireEvent.click(firstTrigger);

    const dialog = screen.getByRole("dialog", {
      name: "Galería de Casa Patio Norte",
    });
    expect(within(dialog).getByText("Fachada principal")).toBeVisible();
    expect(within(dialog).getByText("1 / 2")).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(within(dialog).getByText("Relación interior exterior")).toBeVisible();
    expect(within(dialog).getByText("2 / 2")).toBeVisible();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(within(dialog).getByText("Fachada principal")).toBeVisible();
  });

  it("closes with Escape and returns focus to the opening image", () => {
    render(<GalleryLightbox images={images} title="Casa Patio Norte" />);
    const secondTrigger = screen.getByRole("button", {
      name: /abrir imagen 2 de 2/i,
    });

    fireEvent.click(secondTrigger);
    expect(screen.getByRole("button", { name: "Cerrar galería" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(secondTrigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("does not render navigation controls for a single image", () => {
    render(<GalleryLightbox images={[images[0]]} title="Casa Patio Norte" />);
    fireEvent.click(screen.getByRole("button", { name: /abrir imagen 1 de 1/i }));

    expect(screen.queryByRole("button", { name: /imagen anterior/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /imagen siguiente/i })).not.toBeInTheDocument();
  });

  it("navigates a horizontal touch gesture but preserves vertical gestures", () => {
    render(<GalleryLightbox images={images} title="Casa Patio Norte" />);
    fireEvent.click(screen.getByRole("button", { name: /abrir imagen 1 de 2/i }));
    const surface = screen.getByTestId("gallery-active-image");
    surface.setPointerCapture = vi.fn();
    surface.hasPointerCapture = vi.fn(() => true);
    surface.releasePointerCapture = vi.fn();
    const pointer = (name: string, x: number, y: number) => {
      const event = new Event(name, { bubbles: true });
      Object.assign(event, { pointerId: 9, pointerType: "touch", clientX: x, clientY: y, isPrimary: true });
      fireEvent(surface, event);
    };

    pointer("pointerdown", 200, 200);
    pointer("pointerup", 190, 350);
    expect(within(screen.getByRole("dialog")).getByText("1 / 2")).toBeVisible();
    pointer("pointerdown", 250, 200);
    pointer("pointerup", 150, 205);
    expect(within(screen.getByRole("dialog")).getByText("2 / 2")).toBeVisible();
    expect(surface.releasePointerCapture).toHaveBeenCalledWith(9);
  });

  it("releases a canceled touch and does not navigate from its stale pointerup", () => {
    render(<GalleryLightbox images={images} title="Casa Patio Norte" />);
    fireEvent.click(screen.getByRole("button", { name: /abrir imagen 1 de 2/i }));
    const surface = screen.getByTestId("gallery-active-image");
    surface.setPointerCapture = vi.fn();
    surface.hasPointerCapture = vi.fn(() => true);
    surface.releasePointerCapture = vi.fn();
    for (const [name, x] of [["pointerdown", 250], ["pointercancel", 200], ["pointerup", 100]] as const) {
      const event = new Event(name, { bubbles: true });
      Object.assign(event, { pointerId: 9, pointerType: "touch", clientX: x, clientY: 200, isPrimary: true });
      fireEvent(surface, event);
    }
    expect(surface.releasePointerCapture).toHaveBeenCalledWith(9);
    expect(within(screen.getByRole("dialog")).getByText("1 / 2")).toBeVisible();
  });
});
