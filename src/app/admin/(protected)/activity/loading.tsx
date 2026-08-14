export default function ActivityLoading() {
  return (
    <section aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">Cargando actividad</span>
      <div className="grid animate-pulse gap-6" aria-hidden="true">
        <div className="min-h-80 border border-ink/10 bg-paper" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="min-h-28 border border-ink/10 bg-paper" />
          ))}
        </div>
        <div className="min-h-96 border border-ink/10 bg-paper" />
      </div>
    </section>
  );
}
