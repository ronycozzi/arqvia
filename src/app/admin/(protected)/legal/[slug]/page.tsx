import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalPageForm } from "@/components/admin/legal-page-form";
import { adminOnlyRoles, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminLegalPage } from "@/lib/legal-data";
import { isLegalPageSlug } from "@/lib/legal-content";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Editar documento legal | Admin",
  robots: { follow: false, index: false },
};

export default async function EditLegalPage({ params }: PageProps) {
  await requireVerifiedAdminSession(adminOnlyRoles);
  const { slug } = await params;
  if (!isLegalPageSlug(slug)) notFound();
  const page = await getAdminLegalPage(slug);

  return (
    <section className="grid gap-6">
      <header className="premium-card p-6">
        <Link
          className="text-sm font-semibold text-bronze underline underline-offset-4"
          href="/admin/legal"
        >
          Volver a documentos legales
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          /{page.slug}
        </p>
        <h1 className="mt-2 font-serif text-4xl text-ink">{page.title}</h1>
      </header>

      <LegalPageForm
        page={{
          content: page.content,
          expectedUpdatedAt: page.updatedAt?.toISOString(),
          reviewedAt: page.reviewedAt ? formatDate(page.reviewedAt) : undefined,
          reviewedBy: page.reviewedBy || "",
          seoDescription: page.seoDescription,
          seoTitle: page.seoTitle,
          slug: page.slug,
          status: page.status,
          summary: page.summary,
          title: page.title,
        }}
      />
    </section>
  );
}
