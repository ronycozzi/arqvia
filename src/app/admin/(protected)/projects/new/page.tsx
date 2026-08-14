import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectForm, type AdminProjectFormValue } from "@/components/admin/project-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { findAdminReferenceOptions } from "@/lib/admin-reference-options";
import { imageKit } from "@/lib/content";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Nuevo proyecto",
  robots: { index: false, follow: false },
};

const blankProject: AdminProjectFormValue = {
  publicationStatus: "DRAFT",
  title: "",
  slug: "",
  summary: "",
  description: "",
  location: "Córdoba Capital",
  year: "2026",
  areaM2: 120,
  status: "Finalizado",
  clientType: "Familia",
  servicePerformed: "Diseño + construcción llave en mano",
  coverImage: imageKit.house,
  gallery: [
    `${imageKit.house} | final | Casa contemporánea finalizada | Vista principal del proyecto terminado`,
  ].join("\n"),
  challenge: "",
  solution: "",
  process: "",
  result: "",
  optimized: "",
  specialNote: "",
  materials: "Hormigón, vidrio, madera y terminaciones definidas por proyecto",
  duration: "6 meses",
  constructionSystem: "Construcción tradicional",
  currentStage: "Finalizado",
  responsibleTeam: "Equipo Arqvia",
  architectDirector: "Equipo Arqvia",
  supplier: "",
  budgetRange: "",
  featured: false,
  categoryId: "",
  serviceId: "",
  seoTitle: "",
  seoDescription: "",
  seoCategory: "Proyecto",
  imageAlt: "",
};

export default async function NewProjectPage() {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const canEdit = canManageContent(session?.user.role);
  const [categories, serviceResult, mediaAssets] = await Promise.all([
    prisma.projectCategory.findMany({ orderBy: { name: "asc" } }),
    findAdminReferenceOptions({
      q: "",
      selectedId: "",
      take: 30,
      type: "services",
    }),
    getAdminMediaOptions(),
  ]);
  const serviceOptions = serviceResult.options;

  const project = {
    ...blankProject,
    categoryId: categories[0]?.id || "",
    serviceId: serviceOptions[0]?.id || "",
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
          Nuevo caso de estudio
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          Cargar proyecto al portfolio.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Completá una obra como caso de estudio: ficha, narrativa, galería y
          SEO. Los datos se guardan en Prisma y alimentan el sitio público.
        </p>
        {!canEdit ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            Tu rol puede ver esta pantalla, pero solo Admin o Editor puede
            guardar proyectos.
          </p>
        ) : null}
      </div>
      {categories.length ? (
        <ProjectForm
          canEdit={canEdit}
          categories={categories}
          mediaAssets={mediaAssets}
          project={project}
          services={serviceOptions}
        />
      ) : (
        <div className="premium-card p-8">
          <h3 className="font-serif text-3xl text-ink">
            Primero cargá una categoría de proyecto.
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/75">
            Los proyectos necesitan una categoría para ordenar el portfolio,
            habilitar filtros y sostener la estructura SEO.
          </p>
          <Link
            href="/admin/categories"
            className="mt-6 inline-flex h-11 items-center justify-center bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze"
          >
            Ir a categorías
          </Link>
        </div>
      )}
    </section>
  );
}
