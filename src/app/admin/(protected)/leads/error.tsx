"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";

export default function LeadsError({
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
    <section className="mx-auto grid min-h-[56vh] max-w-3xl place-items-center py-10">
      <div className="premium-card w-full p-7 text-center md:p-9">
        <span className="mx-auto grid size-12 place-items-center border border-bronze/30 bg-bronze-light/25 text-bronze">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Bandeja comercial
        </p>
        <h2 className="mt-2 font-serif text-4xl leading-tight text-ink">
          No pudimos cargar las consultas.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/70">
          Reintentá la consulta. Los filtros y los estados guardados no se
          modifican por este error.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs font-medium text-ink/45">
            Referencia: {error.digest}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
          >
            <RefreshCcw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
          <Link
            href="/admin"
            className="inline-flex min-h-12 items-center justify-center border border-ink/15 px-6 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
