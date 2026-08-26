import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SkeletonBlockProps = {
  className?: string;
};

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer border border-ink/8 bg-ink/[0.055]",
        className,
      )}
    />
  );
}

export function PublicPageLoading({
  eyebrow = "Arqvia",
  title = "Preparando la informacion del proyecto.",
}: {
  eyebrow?: string;
  title?: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite" role="status">
      <section className="mx-auto grid min-h-[72vh] max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
        <div className="pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
            {eyebrow}
          </p>
          <p className="mt-5 max-w-3xl font-serif text-5xl leading-none text-ink md:text-7xl">
            {title}
          </p>
          <div className="mt-8 max-w-2xl space-y-3">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-10/12" />
            <SkeletonBlock className="h-4 w-8/12" />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-12 w-48" />
            <SkeletonBlock className="h-12 w-40" />
          </div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden bg-stone lg:min-h-[560px]">
          <SkeletonBlock className="absolute inset-5" />
          <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function ListingLoading({
  eyebrow,
  filterCount = 0,
  grouped = false,
  title,
}: {
  eyebrow: string;
  filterCount?: number;
  grouped?: boolean;
  title: string;
}) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="mx-auto max-w-7xl px-5 py-16 md:px-8"
      role="status"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
        {eyebrow}
      </p>
      <p className="mt-4 max-w-4xl font-serif text-5xl leading-tight text-ink md:text-7xl">
        {title}
      </p>
      {filterCount > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {Array.from({ length: filterCount }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 w-28" />
          ))}
        </div>
      ) : null}
      {grouped ? (
        <div className="mt-10 space-y-12">
          {Array.from({ length: 2 }).map((_, groupIndex) => (
            <section key={groupIndex}>
              <SkeletonBlock className="mb-4 h-8 w-64 max-w-full" />
              <LoadingCardGrid count={3} />
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-10">
          <LoadingCardGrid count={6} />
        </div>
      )}
    </section>
  );
}

function LoadingCardGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="premium-panel p-4">
          <SkeletonBlock className="h-56 w-full" />
          <SkeletonBlock className="mt-5 h-4 w-24" />
          <SkeletonBlock className="mt-4 h-8 w-10/12" />
          <SkeletonBlock className="mt-4 h-4 w-full" />
          <SkeletonBlock className="mt-3 h-4 w-8/12" />
        </article>
      ))}
    </div>
  );
}

export function AdminLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="space-y-6">
      <div className="premium-panel p-6">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-4 h-10 w-72 max-w-full" />
        <SkeletonBlock className="mt-4 h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-28" />
        ))}
      </div>
      <div className="premium-panel p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-16" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function NotFoundScreen() {
  return (
    <section className="architectural-grid bg-graphite px-5 py-24 text-paper md:px-8">
      <section className="mx-auto grid min-h-[62vh] max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-light">
            Arqvia / 404
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-6xl leading-none md:text-8xl">
            Esta pagina no esta en el plano.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-paper/76">
            La direccion puede haber cambiado o el contenido ya no estar
            disponible. Podemos llevarte de nuevo a los proyectos, servicios o
            al formulario de evaluacion.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center bg-bronze px-6 text-sm font-semibold text-paper"
            >
              Volver al inicio
            </Link>
            <Link
              href="/contacto"
              className="inline-flex h-12 items-center justify-center gap-2 border border-paper/18 px-6 text-sm font-semibold text-paper transition hover:border-bronze-light hover:text-bronze-light"
            >
              Solicitar presupuesto <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="relative min-h-[360px] border border-paper/12 bg-paper/[0.035] p-6">
          <div className="absolute left-[14%] top-[18%] h-px w-[72%] bg-paper/22" />
          <div className="absolute left-[18%] top-[28%] h-px w-[58%] bg-paper/18" />
          <div className="absolute bottom-[22%] left-[10%] h-px w-[78%] bg-bronze-light/45" />
          <div className="absolute left-[24%] top-[12%] h-[72%] w-px bg-paper/16" />
          <div className="absolute right-[28%] top-[22%] h-[56%] w-px bg-paper/18" />
          <div className="absolute bottom-[26%] left-[22%] h-24 w-24 border border-paper/20" />
          <div className="absolute bottom-[26%] left-[calc(22%+6rem)] h-36 w-32 border border-bronze-light/45" />
          <div className="absolute bottom-[26%] right-[22%] h-48 w-28 border border-paper/22" />
          <p className="absolute bottom-6 left-6 text-xs font-semibold uppercase tracking-[0.22em] text-paper/55">
            Ruta no encontrada
          </p>
        </div>
      </section>
    </section>
  );
}
