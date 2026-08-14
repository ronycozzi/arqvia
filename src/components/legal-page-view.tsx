import type { PublicLegalPage } from "@/lib/legal-data";

export function LegalPageView({ page }: { page: PublicLegalPage }) {
  const paragraphs = page.content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div>
      <header className="border-b border-ink/10 bg-ink text-paper">
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze-light">
            Información legal
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.04] md:text-7xl">
            {page.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-paper/72 md:text-lg">
            {page.summary}
          </p>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-14 md:grid-cols-[180px_1fr] md:px-8 md:py-20">
        <div className="border-t border-bronze pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
            Arqvia
          </p>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Documento informativo
          </p>
        </div>
        <div className="grid gap-6">
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${page.slug}-${index}`}
              className="text-base leading-8 text-ink/76 md:text-lg md:leading-9"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
