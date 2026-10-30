import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeforeAfter } from "./before-after";

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? "mouse";
    this.isPrimary = init.isPrimary ?? true;
  }
}

function comparison() {
  render(<BeforeAfter />);
  const surface = screen.getByTestId("before-after-surface");
  const range = screen.getByRole("slider", { name: "Comparar antes y después" });
  const rect = { left: 100, top: 0, width: 500, height: 300 };
  const captures = new Set<number>();
  const capture = vi.fn((id: number) => captures.add(id));
  const release = vi.fn((id: number) => captures.delete(id));
  Object.assign(surface, {
    getBoundingClientRect: () => rect,
    setPointerCapture: capture,
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: release,
  });
  return { surface, range, rect, capture, release };
}

describe("BeforeAfter interaction", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", TestPointerEvent);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("tracks the pointer directly across the full image and clamps both edges", () => {
    const { surface, range } = comparison();
    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 200, button: 0 });
    expect(range).toHaveValue("20");
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 481.25 });
    expect(surface.style.getPropertyValue("--comparison-position")).toBe("76.25%");
    expect(range).toHaveAttribute("aria-valuetext", "76% antes / 24% después");
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: -30 });
    expect(range).toHaveValue("0");
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 900 });
    expect(range).toHaveValue("100");
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 500 });
    expect(range).toHaveValue("80");
    expect(surface).toHaveAttribute("data-dragging", "false");
  });

  it("keeps a native keyboard-accessible range synchronized with the boundary", () => {
    const { surface, range } = comparison();
    expect(range).toHaveAttribute("min", "0");
    expect(range).toHaveAttribute("max", "100");
    fireEvent.change(range, { target: { value: "63" } });
    expect(surface.style.getPropertyValue("--comparison-position")).toBe("63%");
    expect(range).toHaveAttribute("aria-valuetext", "63% antes / 37% después");
    fireEvent.change(range, { target: { value: "0" } });
    expect(surface.style.getPropertyValue("--comparison-position")).toBe("0%");
  });

  it("lets a vertical touch scroll without moving the comparison or recapturing it", () => {
    const { surface, range, capture } = comparison();
    fireEvent.pointerDown(surface, { pointerId: 2, pointerType: "touch", clientX: 360, clientY: 100 });
    expect(capture).not.toHaveBeenCalled();
    fireEvent.pointerMove(surface, { pointerId: 2, pointerType: "touch", clientX: 365, clientY: 125 });
    fireEvent.pointerMove(surface, { pointerId: 2, pointerType: "touch", clientX: 500, clientY: 140 });
    fireEvent.pointerUp(surface, { pointerId: 2, pointerType: "touch", clientX: 500, clientY: 140 });
    expect(range).toHaveValue("52");
    expect(capture).not.toHaveBeenCalled();
  });

  it("starts a horizontal touch promptly, supports a tap, and releases capture", () => {
    const { surface, range, capture, release } = comparison();
    fireEvent.pointerDown(surface, { pointerId: 2, pointerType: "touch", clientX: 360, clientY: 100 });
    fireEvent.pointerMove(surface, { pointerId: 2, pointerType: "touch", clientX: 390, clientY: 102 });
    expect(range).toHaveValue("58");
    expect(capture).toHaveBeenCalledWith(2);
    fireEvent.pointerUp(surface, { pointerId: 2, pointerType: "touch", clientX: 500, clientY: 103 });
    expect(range).toHaveValue("80");
    expect(release).toHaveBeenCalledWith(2);
    fireEvent.pointerDown(surface, { pointerId: 3, pointerType: "touch", clientX: 250, clientY: 100 });
    fireEvent.pointerUp(surface, { pointerId: 3, pointerType: "touch", clientX: 250, clientY: 100 });
    expect(range).toHaveValue("30");
  });

  it("keeps dragging when implicit capture transfers from an image to the surface", () => {
    const { surface, range } = comparison();
    const image = screen.getByTestId("before-after-image-after");
    fireEvent.pointerDown(image, { pointerId: 2, pointerType: "touch", clientX: 360, clientY: 100 });
    fireEvent.pointerMove(image, { pointerId: 2, pointerType: "touch", clientX: 390, clientY: 100 });
    fireEvent.lostPointerCapture(image, { pointerId: 2, pointerType: "touch" });
    fireEvent.pointerMove(surface, { pointerId: 2, pointerType: "touch", clientX: 490, clientY: 100 });
    expect(range).toHaveValue("78");
    expect(surface).toHaveAttribute("data-dragging", "true");
  });

  it("ignores additional pointers, canceled gestures, and right clicks", () => {
    const { surface, range } = comparison();
    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 200, button: 2 });
    expect(range).toHaveValue("52");
    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 200, button: 0 });
    fireEvent.pointerDown(surface, { pointerId: 2, clientX: 500, button: 0, isPrimary: false });
    fireEvent.pointerMove(surface, { pointerId: 2, clientX: 600 });
    expect(range).toHaveValue("20");
    fireEvent.pointerCancel(surface, { pointerId: 1 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 600 });
    expect(range).toHaveValue("20");
    expect(surface).toHaveAttribute("data-dragging", "false");
    fireEvent.pointerDown(surface, { pointerId: 3, clientX: 400, button: 0 });
    expect(range).toHaveValue("60");
  });

  it("refreshes geometry during a resize and clears a lost pointer capture", () => {
    const { surface, range, rect } = comparison();
    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 200, button: 0 });
    rect.width = 1000;
    fireEvent.resize(window);
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 500 });
    expect(range).toHaveValue("40");
    fireEvent.lostPointerCapture(surface, { pointerId: 1 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 800 });
    expect(range).toHaveValue("40");
    expect(surface).toHaveAttribute("data-dragging", "false");
  });
});
