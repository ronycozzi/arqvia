"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronsLeftRight } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";
import { imageKit } from "@/lib/content";
import type { PublicBeforeAfter } from "@/types/project";

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
  const [position, setPosition] = useState(52);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    horizontal: boolean;
  } | null>(null);

  function updatePositionFromPointer(
    event: ReactPointerEvent<HTMLInputElement>,
  ) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;

    const nextPosition = ((event.clientX - bounds.left) / bounds.width) * 100;
    setPosition(Math.round(Math.min(85, Math.max(15, nextPosition))));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLInputElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      horizontal: event.pointerType === "mouse",
    };
    event.currentTarget.setPointerCapture(event.pointerId);

    if (event.pointerType === "mouse") {
      setIsDragging(true);
      updatePositionFromPointer(event);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLInputElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.horizontal) {
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      drag.horizontal = true;
      setIsDragging(true);
    }

    updatePositionFromPointer(event);
  }

  function finishPointerInteraction(
    event: ReactPointerEvent<HTMLInputElement>,
  ) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const moved =
      Math.abs(event.clientX - drag.startX) >= 5 ||
      Math.abs(event.clientY - drag.startY) >= 5;

    if (!moved) updatePositionFromPointer(event);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  }

  function cancelPointerInteraction(
    event: ReactPointerEvent<HTMLInputElement>,
  ) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
      <div
        className="image-sheen relative aspect-[16/10] overflow-hidden border border-ink/10 bg-stone shadow-premium"
        data-dragging={isDragging ? "true" : "false"}
      >
        <Image
          src={comparison.afterImage}
          alt={comparison.afterAlt}
          fill
          sizes="(min-width: 1280px) 680px, (min-width: 1024px) 55vw, calc(100vw - 40px)"
          className="object-cover"
          data-testid="before-after-image-after"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={comparison.beforeImage}
            alt={comparison.beforeAlt}
            fill
            sizes="(min-width: 1280px) 680px, (min-width: 1024px) 55vw, calc(100vw - 40px)"
            className="object-cover"
            data-testid="before-after-image-before"
          />
        </div>
        <div
          className="absolute inset-y-0 w-px bg-paper"
          style={{ left: `${position}%` }}
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
          data-testid="before-after-range"
          aria-label="Comparar antes y después"
          aria-valuetext={`${position}% antes / ${100 - position}% después`}
          type="range"
          min="15"
          max="85"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerInteraction}
          onPointerCancel={cancelPointerInteraction}
          className="before-after-range absolute inset-0 z-20 h-full w-full cursor-ew-resize touch-pan-y"
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
