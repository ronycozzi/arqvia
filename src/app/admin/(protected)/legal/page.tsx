import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, ShieldAlert } from "lucide-react";
import { adminOnlyRoles, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminLegalPages } from "@/lib/legal-data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Documentos legales | Admin",
  robots: { follow: false, index: false },
};

export default async function AdminLegalPage() {
  await requireVerifiedAdminSession(adminOnlyRoles);
  const pages = await getAdminLegalPages();
  const publishedCount = pages.filter(
    (page) => page.status === "PUBLISHED",
  ).length;

  return (
    <section className="grid gap-6">
      <header className="premium-card p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Gobierno de contenido
            </p>
            <h2 className="mt-3 font-serif text-4xl text-ink md:text-5xl">
              Documentos legales del sitio
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">
              Administrá privacidad, términos, cookies y el alcance de los
              presupuestos. Solo estas cuatro rutas institucionales pueden
              modificarse desde el panel.
            </p>
          </div>
          <div className="border-l-2 border-bronze pl-5">
            <p className="font-sans text-4xl font-semibold tabular-nums text-ink">
              {publishedCount}/4
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/68">
              Publicados desde el CMS
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {pages.map((page) => (
          <article
            className="premium-card flex min-h-72 flex-col p-6 transition hover:-translate-y-0.5 hover:border-bronze/45"
            key={page.slug}
          >
            <div className="flex items-start justify-between gap-4">
              <FileCheck2 className="size-6 text-bronze" aria-hidden="true" />
              <span
                className={`px-3 py-1 text-xs font-semibold ${
                  page.status === "PUBLISHED"
                    ? "bg-olive text-paper"
                    : "bg-ink/8 text-ink/65"
                }`}
              >
                {page.status === "PUBLISHED" ? "Publicado" : "Borrador"}
              </span>
            </div>
            <h2 className="mt-5 font-serif text-3xl text-ink">{page.title}</h2>
            <p className="mt-3 text-sm leading-7 text-ink/72">{page.summary}</p>
            <div className="mt-auto pt-6">
              <p className="mb-4 text-xs text-ink/55">
                {page.updatedAt
                  ? `Actualizado ${formatDate(page.updatedAt)}`
                  : "Contenido base activo"}
              </p>
              <Link
                className="inline-flex min-h-11 items-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze"
                href={`/admin/legal/${page.slug}`}
              >
                Revisar documento
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <aside className="flex gap-4 border border-bronze/25 bg-bronze-light/18 p-5 text-sm leading-7 text-ink/75">
        <ShieldAlert className="mt-1 size-5 shrink-0 text-bronze" aria-hidden="true" />
        <p>
          La revisión registrada en el panel aporta trazabilidad editorial. La
          validación jurídica y los datos reales de responsable, proveedores y
          plazos deben confirmarse antes del lanzamiento comercial.
        </p>
      </aside>
    </section>
  );
}
