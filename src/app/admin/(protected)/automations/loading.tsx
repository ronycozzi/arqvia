export default function AutomationsLoading() {
  return (
    <section aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">Cargando automatizaciones</span>
      <div className="grid animate-pulse gap-6" aria-hidden="true">
        <div className="min-h-48 bg-ink" />
        <div className="min-h-40 border border-ink/10 bg-paper" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="min-h-28 border border-ink/10 bg-paper" />
          ))}
        </div>
        <div className="min-h-64 border border-ink/10 bg-paper" />
      </div>
    </section>
  );
}
