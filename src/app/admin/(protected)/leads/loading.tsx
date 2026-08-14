function Skeleton({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer border border-ink/8 bg-ink/[0.055] ${className}`}
    />
  );
}

export default function LeadsLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="grid gap-6">
      <p className="sr-only">Cargando consultas y seguimiento comercial.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="premium-card p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-10 w-80 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[34rem] max-w-full" />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
        <div className="mt-6 grid gap-3 lg:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72" />
          ))}
        </div>
        <div className="mt-6 hidden space-y-3 lg:block">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    </section>
  );
}
