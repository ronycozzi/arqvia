"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";

export default function ActivityError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="grid min-h-[55vh] place-items-center py-10">
      <div className="premium-card w-full max-w-3xl p-8 text-center">
        <CircleAlert className="mx-auto size-10 text-red-700" aria-hidden="true" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Trazabilidad
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          No pudimos cargar la actividad
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/65">
          El historial encontró un problema temporal. Podés reintentar sin
          perder los filtros de la URL.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink/45">
            Referencia: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-11 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reintentar carga
          </button>
          <Link
            href="/admin/activity"
            className="inline-flex h-11 items-center justify-center border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Abrir sin filtros
          </Link>
        </div>
      </div>
    </section>
  );
}
