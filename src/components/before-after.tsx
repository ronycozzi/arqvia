"use client";

import Image from "@/components/app-image";
import Link from "next/link";
import { ChevronsLeftRight } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from "react";
import { imageKit } from "@/lib/content";
import type { PublicBeforeAfter } from "@/types/project";
import styles from "./before-after.module.css";

const defaultComparison: PublicBeforeAfter = {
  beforeImage: imageKit.bathroomBefore,
  afterImage: imageKit.bathroomAfter,
  beforeAlt:
    "Mismo baño antes de la remodelación, con azulejos beige, bañera con cortina y mobiliario antiguo",
  afterAlt:
    "Mismo baño después de la remodelación, con ducha de vidrio, porcelanato claro y vanitory flotante de roble",
  contextNote:
    "muestra el baño desde el mismo encuadre para comparar materiales, iluminación y aprovechamiento del espacio.",
  beforeNote:
    "revestimientos pequeños y envejecidos, bañera con cortina, iluminación escasa y guardado limitado.",
  afterNote:
    "ducha de acceso bajo con mampara, porcelanato de gran formato, vanitory flotante e iluminación cálida.",
  eyebrow: "Antes y después",
  title: "Un baño más claro, cómodo y fácil de usar.",
  description:
    "La comparación mantiene el encuadre y la distribución para que se entienda con precisión el impacto de los nuevos materiales, la iluminación y el equipamiento.",
  ctaLabel: "Quiero remodelar mi baño",
  ctaHref: "/contacto?origen=%2F%23home-before-after",
};

export function BeforeAfter({
  comparison = defaultComparison,
  compact = false,
  compactDescription,
  compactTitle,
}: {
  comparison?: PublicBeforeAfter;
  compact?: boolean;
  compactDescription?: string;
  compactTitle?: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    horizontal: boolean;
    bounds: DOMRect;
  } | null>(null);

  // Only the clipping boundary changes during a gesture. Keeping pointer updates
  // outside React avoids re-rendering two large images on every movement, and a
  // separate hit area prevents native range dragging fighting our coordinates.
  function paintPosition(value: number) {
    if (!Number.isFinite(value)) return;
    const next = Math.min(100, Math.max(0, value));
    const accessibleValue = Math.round(next);
    surfaceRef.current?.style.setProperty("--comparison-position", `${next}%`);
    if (rangeRef.current) {
      rangeRef.current.value = String(accessibleValue);
      rangeRef.current.setAttribute(
        "aria-valuetext",
        `${accessibleValue}% antes / ${100 - accessibleValue}% después`,
      );
    }
  }

  function updatePositionFromPointer(clientX: number) {
    const bounds = dragRef.current?.bounds;
    if (!bounds?.width) return;
    paintPosition(((clientX - bounds.left) / bounds.width) * 100);
  }

  function capturePointer(element: HTMLDivElement, pointerId: number) {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // A browser may have canceled a touch for page scrolling already.
    }
  }

  function releasePointer(element: HTMLDivElement, pointerId: number) {
    if (element.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.isPrimary === false || dragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      horizontal: event.pointerType === "mouse",
      bounds: event.currentTarget.getBoundingClientRect(),
    };

    if (event.pointerType === "mouse") {
      event.preventDefault();
      rangeRef.current?.focus({ preventScroll: true });
      capturePointer(event.currentTarget, event.pointerId);
      event.currentTarget.dataset.dragging = "true";
      updatePositionFromPointer(event.clientX);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.horizontal) {
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Lock a vertical gesture to scrolling; do not turn it into a drag if
        // the finger drifts sideways later in the same gesture.
        dragRef.current = null;
        releasePointer(event.currentTarget, event.pointerId);
        return;
      }
      drag.horizontal = true;
      capturePointer(event.currentTarget, event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }

    updatePositionFromPointer(event.clientX);
  }

  function finishPointerInteraction(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const moved =
      Math.abs(event.clientX - drag.startX) >= 5 ||
      Math.abs(event.clientY - drag.startY) >= 5;

    if (drag.horizontal || !moved) updatePositionFromPointer(event.clientX);

    dragRef.current = null;
    event.currentTarget.dataset.dragging = "false";
    releasePointer(event.currentTarget, event.pointerId);
  }

  function cancelPointerInteraction(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.dataset.dragging = "false";
    releasePointer(event.currentTarget, event.pointerId);
  }

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const refreshBounds = () => {
      if (dragRef.current) dragRef.current.bounds = surface.getBoundingClientRect();
    };
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(refreshBounds)
      : null;
    observer?.observe(surface);
    window.addEventListener("resize", refreshBounds);
    window.addEventListener("scroll", refreshBounds, { capture: true, passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", refreshBounds);
      window.removeEventListener("scroll", refreshBounds, true);
      const pointerId = dragRef.current?.pointerId;
      dragRef.current = null;
      if (pointerId !== undefined) releasePointer(surface, pointerId);
    };
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
      <div
        ref={surfaceRef}
        className={`${styles.surface} image-sheen relative aspect-[16/10] overflow-hidden border border-ink/10 bg-stone shadow-premium`}
        data-testid="before-after-surface"
        data-dragging="false"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={cancelPointerInteraction}
        onLostPointerCapture={cancelPointerInteraction}
      >
        <Image
          src={comparison.afterImage}
          alt={comparison.afterAlt}
          fill
          sizes="(min-width: 1280px) 680px, (min-width: 1024px) 55vw, calc(100vw - 40px)"
          className="object-cover"
          draggable={false}
          data-testid="before-after-image-after"
        />
        <div
          className={`${styles.before} absolute inset-0 overflow-hidden`}
        >
          <Image
            src={comparison.beforeImage}
            alt={comparison.beforeAlt}
            fill
            sizes="(min-width: 1280px) 680px, (min-width: 1024px) 55vw, calc(100vw - 40px)"
            className="object-cover"
            draggable={false}
            data-testid="before-after-image-before"
          />
        </div>
        <div
          className={`${styles.divider} absolute inset-y-0 w-px bg-paper`}
          aria-hidden="true"
        >
          <span
            className="before-after-handle absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center border border-paper/45 bg-ink/88 text-paper backdrop-blur-sm md:size-10"
            data-testid="before-after-handle"
          >
            <ChevronsLeftRight className="size-5" />
          </span>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-4 z-10 flex items-start justify-between px-4 text-xs font-semibold uppercase tracking-[0.16em]"
          data-testid="before-after-labels"
        >
          <span
            className="bg-ink/90 px-3 py-2 text-paper shadow-premium backdrop-blur-sm"
            data-testid="before-label"
          >
            Antes
          </span>
          <span
            className="bg-paper/92 px-3 py-2 text-ink shadow-premium backdrop-blur-sm"
            data-testid="after-label"
          >
            Después
          </span>
        </div>
        <input
          ref={rangeRef}
          data-testid="before-after-range"
          aria-label="Comparar antes y después"
          aria-valuetext="52% antes / 48% después"
          type="range"
          min="0"
          max="100"
          defaultValue="52"
          onChange={(event) => paintPosition(Number(event.target.value))}
          className={`${styles.range} before-after-range absolute inset-0 z-20 h-full w-full cursor-ew-resize touch-pan-y`}
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
          {comparison.eyebrow || "Antes y después"}
        </p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-ink md:text-5xl">
          {compact
            ? compactTitle || "El mismo espacio, antes y después."
            : comparison.title || defaultComparison.title}
        </h2>
        <p className="mt-5 text-base leading-8 text-ink/75">
          {compact
            ? compactDescription ||
              "El mismo ambiente comparado desde un encuadre equivalente."
            : comparison.description || defaultComparison.description}
        </p>
        {!compact ? (
        <div className="mt-6 space-y-3 border-l-2 border-bronze pl-5 text-sm leading-7 text-ink/75">
          <p>
            <strong className="text-ink">Mismo ambiente:</strong> el comparador
            {comparison.contextNote
              ? ` ${comparison.contextNote}`
              : ` ${defaultComparison.contextNote}`}
          </p>
          <p>
            <strong className="text-ink">Antes:</strong> {comparison.beforeNote}
          </p>
          <p>
            <strong className="text-ink">Después:</strong> {comparison.afterNote}
          </p>
        </div>
        ) : null}
        <Link
          href={comparison.ctaHref || "/contacto"}
          className="mt-7 inline-flex h-12 items-center justify-center bg-graphite px-6 text-sm font-semibold text-paper transition hover:bg-bronze"
        >
          {comparison.ctaLabel || "Quiero transformar mi espacio"}
        </Link>
      </div>
    </div>
  );
}
