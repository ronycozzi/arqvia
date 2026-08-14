import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstitutionalPageForm } from "@/components/admin/institutional-page-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import {
  fallbackInstitutionalPages,
  isInstitutionalPageSlug,
  toPublicInstitutionalPage,
} from "@/lib/institutional-content";

export const metadata: Metadata = {
  title: "Editar página institucional | Admin",
  robots: { follow: false, index: false },
};

export default async function AdminInstitutionalPageEditor({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { slug } = await params;
  if (!isInstitutionalPageSlug(slug)) notFound();

  const storedPage = await prisma.institutionalPage.findUnique({
    where: { slug },
  });
  const page = storedPage
    ? toPublicInstitutionalPage(storedPage) || fallbackInstitutionalPages[slug]
    : fallbackInstitutionalPages[slug];

  return (
    <section className="grid gap-6">
      <header className="premium-card p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Página /{slug}
        </p>
        <h2 className="mt-3 font-serif text-4xl text-ink md:text-5xl">
          {slug === "nosotros" ? "Confianza y filosofía" : "Método de trabajo"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">
          El contenido guardado se publica inmediatamente y conserva historial,
          versión y responsable del cambio.
        </p>
      </header>

      <InstitutionalPageForm
        canEdit={canManageContent(session.user.role)}
        expectedUpdatedAt={storedPage?.updatedAt.toISOString()}
        page={page}
      />
    </section>
  );
}
