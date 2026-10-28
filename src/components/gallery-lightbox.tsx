"use client";

import { createPortal } from "react-dom";
import Image from "@/components/app-image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { PublicProjectImage } from "@/types/project";
import styles from "./arqvia-cards.module.css";

type GalleryImage = string | PublicProjectImage;

const imageTypeLabels: Record<string, string> = {
  final: "Espacio terminado",
  before: "Antes de la intervención",
  after: "Después de la intervención",
  construction: "Durante la obra",
  process: "Proceso de obra",
  render: "Visualización arquitectónica",
  plan: "Documentación del proyecto",
};

function getImageData(
  image: GalleryImage,
  title: string,
  index: number,
): PublicProjectImage {
  if (typeof image === "string") {
    return {
      url: image,
      altText: `${title} galería ${index + 1}`,
      caption: null,
      type: "final",
    };
  }

  return image;
}

export function GalleryLightbox({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const galleryImages = images.map((image, index) =>
    getImageData(image, title, index),
  );
  const isOpen = activeIndex !== null;
  const active = activeIndex === null ? null : galleryImages[activeIndex];
  const hasMultipleImages = galleryImages.length > 1;
  const gridClass =
    galleryImages.length === 1
      ? "max-w-3xl grid-cols-1"
      : galleryImages.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3";

  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === null
        ? null
        : (current - 1 + galleryImages.length) % galleryImages.length,
    );
  }, [galleryImages.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? null : (current + 1) % galleryImages.length,
    );
  }, [galleryImages.length]);

  function handleSwipeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!hasMultipleImages || event.pointerType === "mouse" || event.isPrimary === false) return;

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSwipeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    swipeStartRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) {
      return;
    }

    if (deltaX > 0) showPrevious();
    else showNext();
  }

  function handleSwipeCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (swipeStartRef.current?.pointerId !== event.pointerId) return;
    swipeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (event.key === "ArrowLeft" && galleryImages.length > 1) {
        event.preventDefault();
        showPrevious();
        return;
      }

      if (event.key === "ArrowRight" && galleryImages.length > 1) {
        event.preventDefault();
        showNext();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = closeButtonRef.current?.closest('[role="dialog"]');
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) || [],
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [galleryImages.length, isOpen, showNext, showPrevious]);

  useEffect(() => {
    if (isOpen) return;
    lastTriggerRef.current?.focus();
  }, [isOpen]);

  return (
    <>
      <div className={cn("grid gap-4", gridClass)}>
        {galleryImages.map((item, index) => (
          <button
            key={`${item.url}-${index}`}
            type="button"
            aria-label={`Abrir imagen ${index + 1} de ${galleryImages.length}: ${item.altText}`}
            onClick={(event) => {
              lastTriggerRef.current = event.currentTarget;
              setActiveIndex(index);
            }}
            className={styles.galleryTile}
          >
            <Image
              src={item.url}
              alt={item.altText}
              fill
              quality={88}
              sizes={
                galleryImages.length === 1
                  ? "(min-width: 768px) 768px, calc(100vw - 40px)"
                  : galleryImages.length === 2
                  ? "(min-width: 1280px) 600px, (min-width: 768px) calc(50vw - 40px), calc(100vw - 40px)"
                  : "(min-width: 1280px) 400px, (min-width: 768px) calc(33vw - 32px), calc(100vw - 40px)"
              }
              className={styles.image}
            />
            <span className={styles.galleryExpand} aria-hidden="true"><Maximize2 size={14} /></span>
            {item.caption || imageTypeLabels[item.type] ? (
              <span className={styles.galleryCaption}>
                {item.caption || imageTypeLabels[item.type]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {active ? createPortal(
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink p-3 sm:p-4 md:bg-ink/96"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-lightbox-title"
          aria-describedby={active.caption ? "gallery-lightbox-caption" : undefined}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveIndex(null);
          }}
        >
          <h2 id="gallery-lightbox-title" className="sr-only">
            Galería de {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 grid size-11 place-items-center border border-paper/20 bg-paper text-ink shadow-premium transition hover:bg-bronze hover:text-paper focus:outline-none focus:ring-2 focus:ring-bronze md:right-6 md:top-6"
            aria-label="Cerrar galería"
            title="Cerrar galería"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          {hasMultipleImages ? (
            <button
              type="button"
              onClick={showPrevious}
              className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 z-10 grid size-11 place-items-center border border-paper/20 bg-ink/82 text-paper backdrop-blur transition hover:border-bronze hover:bg-bronze focus:outline-none focus:ring-2 focus:ring-bronze md:bottom-auto md:left-6 md:top-1/2 md:-translate-y-1/2"
              aria-label="Ver imagen anterior"
              title="Imagen anterior"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
          ) : null}
          <div
            className="relative h-[calc(100dvh-7rem)] w-full max-w-6xl touch-pan-y select-none bg-ink md:h-[76dvh]"
            data-testid="gallery-active-image"
            onPointerDown={handleSwipeStart}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={handleSwipeCancel}
          >
            <Image
              key={active.url}
              src={active.url}
              alt={active.altText}
              fill
              quality={88}
              sizes="(min-width: 1200px) 1152px, calc(100vw - 24px)"
              draggable={false}
              className={cn("object-contain", styles.galleryFrame)}
            />
            {active.caption ? (
              <p
                id="gallery-lightbox-caption"
                className="absolute inset-x-0 bottom-0 bg-ink/78 px-5 py-4 text-sm leading-6 text-paper backdrop-blur-sm"
              >
                {active.caption}
              </p>
            ) : null}
          </div>
          <p
            className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] border border-paper/15 bg-ink/82 px-3 py-2 text-xs font-semibold tabular-nums text-paper backdrop-blur md:left-6 md:top-6"
            aria-live="polite"
          >
            {(activeIndex ?? 0) + 1} / {galleryImages.length}
          </p>
          {hasMultipleImages ? (
            <button
              type="button"
              onClick={showNext}
              className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-10 grid size-11 place-items-center border border-paper/20 bg-ink/82 text-paper backdrop-blur transition hover:border-bronze hover:bg-bronze focus:outline-none focus:ring-2 focus:ring-bronze md:bottom-auto md:right-6 md:top-1/2 md:-translate-y-1/2"
              aria-label="Ver imagen siguiente"
              title="Imagen siguiente"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          ) : null}
        </div>, document.body
      ) : null}
    </>
  );
}
