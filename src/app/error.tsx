"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";

export default function PublicError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <section className="architectural-grid bg-graphite px-5 py-24 text-paper md:px-8">
      <div className="mx-auto grid min-h-[62vh] max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-light">
            Arqvia / Recuperación
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.02] sm:text-5xl md:text-6xl lg:text-7xl lg:leading-none">
            Esta vista no pudo completarse.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-paper/76">
            Puede ser una interrupción temporal. Reintentá la carga o volvé al
            inicio para continuar recorriendo nuestros proyectos y servicios.
          </p>
          {error.digest ? (
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-paper/45">
              Referencia: {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex h-12 items-center justify-center gap-2 bg-bronze px-6 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze-light focus:outline-none focus:ring-2 focus:ring-bronze-light/45"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reintentar
            </button>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center gap-2 border border-paper/18 px-6 text-sm font-semibold text-paper transition hover:border-bronze-light hover:text-bronze-light focus:outline-none focus:ring-2 focus:ring-bronze-light/35"
            >
              Volver al inicio <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="relative min-h-[360px] border border-paper/12 bg-paper/[0.035] p-6">
          <div className="absolute left-[12%] top-[20%] h-px w-[74%] bg-paper/22" />
          <div className="absolute left-[20%] top-[34%] h-px w-[60%] bg-paper/16" />
          <div className="absolute bottom-[22%] left-[9%] h-px w-[82%] bg-bronze-light/45" />
          <div className="absolute left-[27%] top-[13%] h-[70%] w-px bg-paper/16" />
          <div className="absolute right-[26%] top-[24%] h-[55%] w-px bg-paper/18" />
          <div className="absolute bottom-[22%] left-[20%] h-32 w-32 border border-paper/20" />
          <div className="absolute bottom-[22%] left-[calc(20%+8rem)] h-44 w-40 border border-bronze-light/45" />
          <div className="absolute bottom-[22%] right-[18%] h-56 w-28 border border-paper/22" />
        </div>
      </div>
    </section>
  );
}
