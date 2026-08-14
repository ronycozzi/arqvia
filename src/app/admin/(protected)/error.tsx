"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
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
    <section className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-6 py-16">
      <div className="premium-card w-full p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-bronze">
          Panel Arqvia
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink">
          No pudimos cargar esta vista.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/70">
          Puede ser un problema temporal de datos o conexión. Probá recargar la
          sección; si continúa, revisá la configuración del servidor.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs font-semibold text-ink/45">
            Código de referencia: {error.digest}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-12 items-center justify-center bg-ink px-6 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze focus:outline-none focus:ring-2 focus:ring-bronze/35"
          >
            Reintentar
          </button>
          <Link
            href="/admin"
            className="inline-flex h-12 items-center justify-center border border-ink/15 px-6 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze focus:outline-none focus:ring-2 focus:ring-bronze/25"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    </section>
  );
}
