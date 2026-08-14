import Link from "next/link";

export function AdminPaginationControls({
  currentPage,
  itemLabel,
  pageHref,
  totalPages,
  totalResults,
}: {
  currentPage: number;
  itemLabel: string;
  pageHref: (page: number) => string;
  totalPages: number;
  totalResults: number;
}) {
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-ink/65">
        Mostrando {totalResults} {itemLabel}.
      </p>
    );
  }

  return (
    <nav
      className="flex flex-col justify-between gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center"
      aria-label={`Paginación de ${itemLabel}`}
    >
      <p className="text-sm text-ink/65">
        Página {currentPage} de {totalPages} · {totalResults} {itemLabel}
      </p>
      <div className="flex gap-2">
        <Link
          href={pageHref(Math.max(currentPage - 1, 1))}
          aria-disabled={currentPage <= 1}
          className={`inline-flex h-10 items-center justify-center border px-4 text-sm font-semibold transition ${
            currentPage <= 1
              ? "pointer-events-none border-ink/8 text-ink/35"
              : "border-ink/15 text-ink hover:border-bronze hover:text-bronze"
          }`}
        >
          Anterior
        </Link>
        <Link
          href={pageHref(Math.min(currentPage + 1, totalPages))}
          aria-disabled={currentPage >= totalPages}
          className={`inline-flex h-10 items-center justify-center border px-4 text-sm font-semibold transition ${
            currentPage >= totalPages
              ? "pointer-events-none border-ink/8 text-ink/35"
              : "border-ink/15 text-ink hover:border-bronze hover:text-bronze"
          }`}
        >
          Siguiente
        </Link>
      </div>
    </nav>
  );
}
