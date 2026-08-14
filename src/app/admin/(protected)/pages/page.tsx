import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import {
  fallbackInstitutionalPages,
  institutionalPageSlugs,
} from "@/lib/institutional-content";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Páginas institucionales | Admin",
  robots: { follow: false, index: false },
};

export default async function AdminPagesPage() {
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);
  const storedPages = await prisma.institutionalPage.findMany({
    where: { slug: { in: [...institutionalPageSlugs] } },
    select: { slug: true, updatedAt: true },
  });
  const storedBySlug = new Map(storedPages.map((page) => [page.slug, page]));

  return (
    <section className="grid gap-6">
      <header className="premium-card p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Contenido institucional
        </p>
        <h2 className="mt-3 font-serif text-4xl text-ink md:text-5xl">
          Páginas de confianza y metodología
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">
          Administrá la historia, filosofía, forma de decidir, equipo visible y
          las siete etapas del proceso sin modificar código.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {institutionalPageSlugs.map((slug) => {
          const page = fallbackInstitutionalPages[slug];
          const stored = storedBySlug.get(slug);
          return (
            <article
              className="premium-card flex min-h-72 flex-col p-6 transition hover:-translate-y-0.5 hover:border-bronze/45"
              key={slug}
            >
              <div className="flex items-start justify-between gap-4">
                <FileCheck2 className="size-6 text-bronze" aria-hidden="true" />
                <span
                  className={`px-3 py-1 text-xs font-semibold ${
                    stored ? "bg-olive text-paper" : "bg-ink/8 text-ink/65"
                  }`}
                >
                  {stored ? "Administrada" : "Contenido base"}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-3xl text-ink">{page.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-ink/72">
                {page.introduction}
              </p>
              <div className="mt-auto pt-6">
                <p className="mb-4 text-xs text-ink/55">
                  {stored
                    ? `Actualizada ${formatDate(stored.updatedAt)}`
                    : "Lista para inicializar desde el panel"}
                </p>
                <Link
                  className="inline-flex min-h-11 items-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze"
                  href={`/admin/pages/${slug}`}
                >
                  {canEdit ? "Editar página" : "Revisar página"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
