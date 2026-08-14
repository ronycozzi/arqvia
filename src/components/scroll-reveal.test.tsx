import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollReveal } from "./scroll-reveal";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly targets = new Set<Element>();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn((target: Element) => {
    this.targets.add(target);
  });

  unobserve = vi.fn((target: Element) => {
    this.targets.delete(target);
  });

  disconnect = vi.fn(() => {
    this.targets.clear();
  });

  takeRecords = vi.fn(() => []);

  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0.12];

  revealAll() {
    const entries = Array.from(this.targets, (target) => ({
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRatio: 1,
      intersectionRect: target.getBoundingClientRect(),
      isIntersecting: true,
      rootBounds: null,
      target,
      time: 0,
    })) as IntersectionObserverEntry[];

    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("ScrollReveal", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    mockReducedMotion(false);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses one observer and reveals all registered sections", () => {
    const { container, unmount } = render(
      <>
        <ScrollReveal variant="left">Primera seccion</ScrollReveal>
        <ScrollReveal variant="media">Segunda seccion</ScrollReveal>
      </>,
    );

    const sections = container.querySelectorAll<HTMLElement>(".scroll-reveal");
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(sections[0]).toHaveClass("is-pending");
    expect(sections[1]).toHaveAttribute("data-reveal", "media");

    act(() => MockIntersectionObserver.instances[0].revealAll());

    expect(sections[0]).toHaveClass("is-visible");
    expect(sections[1]).toHaveClass("is-visible");
    expect(MockIntersectionObserver.instances[0].disconnect).toHaveBeenCalledOnce();
    unmount();
  });

  it("renders final content immediately when reduced motion is requested", () => {
    mockReducedMotion(true);
    const { container } = render(
      <ScrollReveal delay={900}>Contenido accesible</ScrollReveal>,
    );
    const section = container.querySelector<HTMLElement>(".scroll-reveal");

    expect(section).toHaveClass("is-visible");
    expect(section).not.toHaveClass("is-pending");
    expect(section).toHaveStyle({ transitionDelay: "240ms" });
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
