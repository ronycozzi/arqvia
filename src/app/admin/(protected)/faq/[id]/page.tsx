import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqForm } from "@/components/admin/faq-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { findAdminReferenceOptions } from "@/lib/admin-reference-options";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar pregunta frecuente",
  robots: { index: false, follow: false },
};

export default async function EditFaqPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);

  const faq = await prisma.faq.findUnique({ where: { id } });
  if (!faq) notFound();
  const { options: services } = await findAdminReferenceOptions({
    q: "",
    selectedId: faq.relatedServiceId || "",
    take: 30,
    type: "services",
  });

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link
          href="/admin/faq"
          className="text-sm font-semibold text-bronze underline underline-offset-4"
        >
          Volver a FAQ
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Editar pregunta frecuente
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{faq.question}</h2>
      </div>

      <FaqForm
        canEdit={canEdit}
        services={services}
        faq={{
          id: faq.id,
          expectedUpdatedAt: faq.updatedAt.toISOString(),
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          sortOrder: faq.sortOrder,
          active: faq.active,
          relatedServiceId: faq.relatedServiceId,
        }}
      />
    </section>
  );
}
