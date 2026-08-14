import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProjectForm,
  type AdminProjectFormValue,
} from "@/components/admin/project-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { findAdminReferenceOptions } from "@/lib/admin-reference-options";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar proyecto",
  robots: { index: false, follow: false },
};

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);
  const project = await prisma.project.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!project) notFound();
  const [categories, serviceResult, mediaAssets] = await Promise.all([
    prisma.projectCategory.findMany({ orderBy: { name: "asc" } }),
    findAdminReferenceOptions({
      q: "",
      selectedId: project.serviceId || "",
      take: 30,
      type: "services",
    }),
    getAdminMediaOptions(),
  ]);
  const serviceOptions = serviceResult.options;

  const formProject: AdminProjectFormValue = {
    id: project.id,
    expectedUpdatedAt: project.updatedAt.toISOString(),
    publicationStatus: project.publicationStatus,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    description: project.description,
    location: project.location,
    year: project.year,
    areaM2: project.areaM2,
    status: project.status,
    clientType: project.clientType,
    servicePerformed: project.servicePerformed,
    coverImage: project.coverImage,
    gallery: project.images.length
      ? project.images
          .map((image) =>
            [
              image.url,
              image.type.toLowerCase(),
              image.altText,
              image.caption || "",
            ].join(" | "),
          )
          .join("\n")
      : project.coverImage,
    challenge: project.challenge,
    solution: project.solution,
    process: project.process,
    result: project.result,
    optimized: project.optimized,
    specialNote: project.specialNote,
    materials: project.materials,
    duration: project.duration,
    constructionSystem: project.constructionSystem,
    currentStage: project.currentStage,
    responsibleTeam: project.responsibleTeam,
    architectDirector: project.architectDirector,
    supplier: project.supplier || "",
    budgetRange: project.budgetRange || "",
    featured: project.featured,
    categoryId: project.categoryId,
    serviceId: project.serviceId || "",
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    seoCategory: project.seoCategory,
    imageAlt: project.imageAlt,
  };

  return (
    <section className="grid gap-6">
      <div className="premium-panel p-6">
        <Link
          href="/admin/projects"
          className="text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
        >
          Volver a proyectos
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Editar caso de estudio
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{project.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Los cambios se revalidan en home, portfolio, detalle del proyecto y
          páginas relacionadas.
        </p>
        {!canEdit ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            Tu rol puede ver esta pantalla, pero solo Admin o Editor puede
            guardar proyectos.
          </p>
        ) : null}
      </div>
      <ProjectForm
        canEdit={canEdit}
        categories={categories}
        mediaAssets={mediaAssets}
        project={formProject}
        services={serviceOptions}
      />
    </section>
  );
}
