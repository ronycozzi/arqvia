import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ServiceForm,
  type AdminServiceFormValue,
} from "@/components/admin/service-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar servicio",
  robots: { index: false, follow: false },
};

function faqToLines(value: string) {
  try {
    const parsed = JSON.parse(value) as Array<{
      question?: unknown;
      answer?: unknown;
    }>;

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => `${String(item.question || "")} | ${String(item.answer || "")}`)
        .join("\n");
    }
  } catch {
    return value;
  }

  return value;
}

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);
  const [service, categories, mediaAssets] = await Promise.all([
    prisma.service.findUnique({ where: { id } }),
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } }),
    getAdminMediaOptions(),
  ]);

  if (!service) notFound();

  const formService: AdminServiceFormValue = {
    id: service.id,
    expectedUpdatedAt: service.updatedAt.toISOString(),
    publicationStatus: service.publicationStatus,
    title: service.title,
    slug: service.slug,
    categoryId: service.categoryId,
    icon: service.icon,
    shortDescription: service.shortDescription,
    description: service.description,
    coverImage: service.coverImage,
    mainBenefit: service.mainBenefit,
    audience: service.audience,
    benefits: service.benefits,
    included: service.included,
    process: service.process,
    faq: faqToLines(service.faq),
    whatsappMessage: service.whatsappMessage,
    featured: service.featured,
    seoTitle: service.seoTitle,
    seoDescription: service.seoDescription,
  };

  return (
    <section className="grid gap-6">
      <div className="premium-panel p-6">
        <Link
          href="/admin/services"
          className="text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
        >
          Volver a servicios
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Editar página de servicio
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{service.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Los cambios se revalidan en home, servicios, detalle y páginas
          relacionadas.
        </p>
        {!canEdit ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            Tu rol puede ver esta pantalla, pero solo Admin o Editor puede
            guardar servicios.
          </p>
        ) : null}
      </div>
      <ServiceForm
        canEdit={canEdit}
        categories={categories}
        mediaAssets={mediaAssets}
        service={formService}
      />
    </section>
  );
}
