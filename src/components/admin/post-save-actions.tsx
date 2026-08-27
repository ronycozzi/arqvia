import Link from "next/link";
import { ArrowUpRight, FilePlus2, PencilLine } from "lucide-react";

type PostSaveActionsProps = {
  createHref?: string;
  createLabel?: string;
  editHref: string;
  publicHref?: string;
  publicLabel?: string;
  resourceLabel: string;
  resourceName?: string;
};

export function PostSaveActions({
  createHref,
  createLabel = "Crear otro",
  editHref,
  publicHref,
  publicLabel = "Ver en el sitio",
  resourceLabel,
  resourceName,
}: PostSaveActionsProps) {
  return (
    <section
      aria-label={`Acciones para ${resourceLabel}`}
      className="relative overflow-hidden border border-olive/25 bg-ink p-5 text-paper shadow-premium md:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(211,151,79,0.22),transparent_42%)]"
      />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Guardado correctamente
          </p>
          <h2 className="mt-2 font-serif text-2xl text-paper md:text-3xl">
            {resourceName
              ? `${resourceName} ya quedó cargado.`
              : `${resourceLabel} ya quedó cargado.`}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-paper/72">
            {publicHref
              ? "Podés revisar la ficha, abrir la página publicada o cargar otro contenido sin volver al listado."
              : "El contenido quedó en borrador. Podés completar la ficha o cargar otro contenido sin publicarlo por accidente."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={editHref}
            className="inline-flex h-11 items-center justify-center gap-2 border border-paper/20 px-4 text-sm font-semibold text-paper transition hover:border-bronze hover:bg-bronze hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
          >
            <PencilLine className="size-4" />
            Editar {resourceLabel}
          </Link>
          {publicHref ? (
            <Link
              href={publicHref}
              className="inline-flex h-11 items-center justify-center gap-2 bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
            >
              <ArrowUpRight className="size-4" />
              {publicLabel}
            </Link>
          ) : null}
          {createHref ? (
            <Link
              href={createHref}
              className="inline-flex h-11 items-center justify-center gap-2 border border-paper/20 px-4 text-sm font-semibold text-paper transition hover:border-paper hover:bg-paper/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
            >
              <FilePlus2 className="size-4" />
              {createLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
