"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function ProjectFilters({
  active,
  categories,
}: {
  active: string;
  categories: string[];
}) {
  const activeFilterRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeFilterRef.current?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  return (
    <nav
      aria-label="Filtros de proyectos"
      data-horizontal-scroll="true"
      data-testid="project-filters"
      className="touch-scroll-row mt-7 flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] md:flex-wrap md:overflow-visible"
    >
      {categories.map((category) => {
        const isActive = active === category;

        return (
          <Link
            key={category}
            ref={isActive ? activeFilterRef : undefined}
            href={
              category === "Todos"
                ? "/proyectos"
                : `/proyectos?${new URLSearchParams({ categoria: category }).toString()}`
            }
            className={cn(
              "inline-flex min-h-11 shrink-0 snap-start items-center border px-4 py-2.5 text-sm font-semibold transition duration-300 motion-reduce:transition-none",
              isActive
                ? "border-ink bg-ink text-paper shadow-premium"
                : "border-ink/12 bg-paper text-ink hover:-translate-y-0.5 hover:border-bronze hover:bg-white motion-reduce:transform-none",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {category}
          </Link>
        );
      })}
    </nav>
  );
}
