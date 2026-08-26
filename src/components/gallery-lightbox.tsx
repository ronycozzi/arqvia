"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PublicProjectImage } from "@/types/project";

type GalleryImage = string | PublicProjectImage;

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
            className="group relative aspect-[4/3] overflow-hidden bg-stone text-left focus:outline-none focus:ring-2 focus:ring-bronze focus:ring-offset-2"
          >
            <Image
              src={item.url}
              alt={item.altText}
              fill
              sizes={
                galleryImages.length === 2
                  ? "(min-width: 1280px) 600px, (min-width: 768px) calc(50vw - 40px), calc(100vw - 40px)"
                  : "(min-width: 1280px) 400px, (min-width: 768px) calc(33vw - 32px), calc(100vw - 40px)"
              }
              className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
            />
            {item.caption || item.type ? (
              <span className="absolute inset-x-0 bottom-0 bg-ink/72 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-paper opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                {item.caption || item.type}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/90 p-4"
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
            className="absolute right-4 top-4 z-10 grid size-11 place-items-center border border-paper/20 bg-paper text-ink shadow-premium transition hover:bg-bronze hover:text-paper focus:outline-none focus:ring-2 focus:ring-bronze md:right-6 md:top-6"
            aria-label="Cerrar galería"
            title="Cerrar galería"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          {hasMultipleImages ? (
            <button
              type="button"
              onClick={showPrevious}
              className="absolute bottom-5 left-4 z-10 grid size-11 place-items-center border border-paper/20 bg-ink/70 text-paper backdrop-blur transition hover:border-bronze hover:bg-bronze focus:outline-none focus:ring-2 focus:ring-bronze md:bottom-auto md:left-6 md:top-1/2 md:-translate-y-1/2"
              aria-label="Ver imagen anterior"
              title="Imagen anterior"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
          ) : null}
          <div className="relative h-[76vh] w-full max-w-6xl">
            <Image
              src={active.url}
              alt={active.altText}
              fill
              sizes="100vw"
              className="object-contain"
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
            className="absolute left-4 top-4 border border-paper/15 bg-ink/70 px-3 py-2 text-xs font-semibold tabular-nums text-paper backdrop-blur md:left-6 md:top-6"
            aria-live="polite"
          >
            {(activeIndex ?? 0) + 1} / {galleryImages.length}
          </p>
          {hasMultipleImages ? (
            <button
              type="button"
              onClick={showNext}
              className="absolute bottom-5 right-4 z-10 grid size-11 place-items-center border border-paper/20 bg-ink/70 text-paper backdrop-blur transition hover:border-bronze hover:bg-bronze focus:outline-none focus:ring-2 focus:ring-bronze md:bottom-auto md:right-6 md:top-1/2 md:-translate-y-1/2"
              aria-label="Ver imagen siguiente"
              title="Imagen siguiente"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
