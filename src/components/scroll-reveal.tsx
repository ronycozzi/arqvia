"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "rise" | "media" | "left" | "right" | "scale";

const observedElements = new Set<HTMLElement>();
let sharedObserver: IntersectionObserver | null = null;

function revealElement(element: HTMLElement) {
  element.classList.remove("is-pending");
  element.classList.add("is-visible");
}

function releaseObserverIfIdle() {
  if (observedElements.size || !sharedObserver) return;
  sharedObserver.disconnect();
  sharedObserver = null;
}

function observeReveal(element: HTMLElement) {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const target = entry.target as HTMLElement;
          revealElement(target);
          observedElements.delete(target);
          observer.unobserve(target);
        }

        releaseObserverIfIdle();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
  }

  observedElements.add(element);
  sharedObserver.observe(element);

  return () => {
    observedElements.delete(element);
    sharedObserver?.unobserve(element);
    releaseObserverIfIdle();
  };
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = "rise",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealElement(element);
      return;
    }

    element.classList.add("is-pending");
    let stopObserving: (() => void) | undefined;
    const frame = window.requestAnimationFrame(() => {
      stopObserving = observeReveal(element);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      stopObserving?.();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("scroll-reveal", className)}
      data-reveal={variant}
      style={{ transitionDelay: `${Math.min(Math.max(delay, 0), 240)}ms` }}
    >
      {children}
    </div>
  );
}
