import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Edit3, Plus } from "lucide-react";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { DeleteProjectButton } from "@/components/admin/delete-project-button";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";
import { evaluateProjectQuality } from "@/lib/project-quality";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin proyectos",
  robots: { index: false, follow: false },
};

const pageSize = 20;

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    destacado?: string;
    estado?: string;
    error?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { categoria, destacado, estado, error, page, q } = await searchParams;
  const canManage = canManageContent(session.user.role);
  const query = q?.trim();
  const selectedFeatured =
    destacado === "destacado" || destacado === "normal" ? destacado : "";
  const selectedPublication =
    estado === "PUBLISHED" || estado === "DRAFT" ? estado : "";

  const categoryOptions = await prisma.projectCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedCategory = categoryOptions.some((item) => item.id === categoria)
    ? categoria
    : "";

  const where: Prisma.ProjectWhereInput = {
    ...(selectedCategory ? { categoryId: selectedCategory } : {}),
    ...(selectedFeatured
      ? { featured: selectedFeatured === "destacado" }
      : {}),
    ...(selectedPublication ? { publicationStatus: selectedPublication } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { slug: { contains: query } },
            { location: { contains: query } },
            { servicePerformed: { contains: query } },
            { status: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredProjects = await prisma.project.count({ where });
  const pagination = resolveAdminPagination(page, filteredProjects, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedCategory) paginationParams.set("categoria", selectedCategory);
  if (selectedFeatured) paginationParams.set("destacado", selectedFeatured);
  if (selectedPublication) paginationParams.set("estado", selectedPublication);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/projects", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [
    projects,
    allProjectQualityRows,
    totalProjects,
    featuredCount,
    publishedCount,
    draftCount,
    withGalleryCount,
  ] =
    await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          category: true,
          service: true,
          images: { select: { altText: true, caption: true, type: true } },
          _count: { select: { images: true } },
        },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.project.findMany({
        include: {
          category: true,
          images: { select: { altText: true, caption: true, type: true } },
        },
      }),
      prisma.project.count(),
      prisma.project.count({ where: { featured: true } }),
      prisma.project.count({ where: { publicationStatus: "PUBLISHED" } }),
      prisma.project.count({ where: { publicationStatus: "DRAFT" } }),
      prisma.project.count({ where: { images: { some: {} } } }),
    ]);
  const { currentPage, totalPages } = pagination;
  const qualityRows = allProjectQualityRows.map((project) =>
    evaluateProjectQuality({
      ...project,
      categoryName: project.category.name,
    }),
  );
  const readyCount = qualityRows.filter((item) => item.status === "strong").length;
  const reviewCount = qualityRows.filter((item) => item.status !== "strong").length;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        {[
          ["Proyectos totales", totalProjects],
          ["Resultado actual", filteredProjects],
          ["Destacados", featuredCount],
          ["Publicados", publishedCount],
          ["Borradores", draftCount],
          ["Con galería", withGalleryCount],
          ["Listos para vender", readyCount],
          ["A revisar", reviewCount],
        ].map(([label, value]) => (
          <article key={label} className="premium-card p-5">
            <p className="font-sans text-4xl font-semibold tabular-nums text-ink">{value}</p>
            <p className="mt-1 text-sm text-ink/75">{label}</p>
          </article>
        ))}
      </div>

      <div className="premium-card p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Portfolio CMS
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Proyectos y casos de estudio
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Ordená obras por categoría, visibilidad y búsqueda para mantener
              el portfolio comercial actualizado y fácil de consultar.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/projects/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
            >
              <Plus className="size-4" />
              Nuevo proyecto
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_180px_170px_auto]">
          <label className="sr-only" htmlFor="project-search">
            Buscar proyectos
          </label>
          <input
            id="project-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por nombre, ubicación, estado o servicio"
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="project-category">
            Filtrar por categoría
          </label>
          <select
            id="project-category"
            name="categoria"
            defaultValue={selectedCategory}
            className="h-12 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todas las categorías</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="project-featured">
            Filtrar por destacado
          </label>
          <select
            id="project-featured"
            name="destacado"
            defaultValue={selectedFeatured}
            className="h-12 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos</option>
            <option value="destacado">Destacados</option>
            <option value="normal">No destacados</option>
          </select>
          <label className="sr-only" htmlFor="project-publication">
            Filtrar por visibilidad
          </label>
          <select
            id="project-publication"
            name="estado"
            defaultValue={selectedPublication}
            className="h-12 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="DRAFT">Borradores</option>
          </select>
          <button
            type="submit"
            className="h-12 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Filtrar
          </button>
        </form>
        {error === "delete-failed" ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            No se pudo eliminar el proyecto. Revisá si sigue existiendo o si
            tiene relaciones pendientes.
          </p>
        ) : null}
      </div>

      {projects.length ? (
        <>
          <div className="grid gap-4">
            {projects.map((project, index) => {
              const quality = evaluateProjectQuality({
                ...project,
                categoryName: project.category.name,
              });

              return (
              <article
                key={project.id}
                className="premium-card grid gap-4 p-4 md:grid-cols-[180px_1fr_auto]"
              >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone md:aspect-auto">
                <Image
                  src={project.coverImage}
                  alt={project.imageAlt}
                  fill
                  loading="eager"
                  fetchPriority={index < 3 ? "high" : "auto"}
                  sizes="180px"
                  className="object-cover"
                />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-mist px-3 py-1 text-xs font-semibold text-ink">
                    {project.category.name}
                  </span>
                  {project.featured ? (
                    <span className="bg-ink px-3 py-1 text-xs font-semibold text-paper">
                      Destacado
                    </span>
                  ) : null}
                  <span
                    className={
                      project.publicationStatus === "PUBLISHED"
                        ? "border border-olive/20 bg-olive/10 px-3 py-1 text-xs font-semibold text-olive"
                        : "border border-bronze/25 bg-bronze/10 px-3 py-1 text-xs font-semibold text-bronze"
                    }
                  >
                    {project.publicationStatus === "PUBLISHED"
                      ? "Publicado"
                      : "Borrador"}
                  </span>
                  <span
                    className={`border px-3 py-1 text-xs font-semibold ${quality.badgeClassName}`}
                  >
                    {quality.missing.length
                      ? `${quality.missing.length} pendiente${quality.missing.length === 1 ? "" : "s"} · ${quality.label}`
                      : quality.label}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-3xl text-ink">
                  {project.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/75">
                  {project.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/75">
                  <span>{project.location}</span>
                  <span>{project.year}</span>
                  <span>{project.areaM2} m²</span>
                  <span>{project.status}</span>
                  <span>{project._count.images} imágenes</span>
                  <span>Actualizado {formatDate(project.updatedAt)}</span>
                </div>
                {quality.missing.length ? (
                  <div className="mt-4 border-l-2 border-bronze pl-4 text-xs leading-6 text-ink/70">
                    <p className="font-semibold text-ink">Para mejorar:</p>
                    <p>{quality.missing.slice(0, 3).join(" · ")}</p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                {project.publicationStatus === "PUBLISHED" ? (
                  <Link
                    href={`/proyectos/${project.slug}`}
                    className="inline-flex h-10 items-center border border-ink/15 px-4 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
                  >
                    Ver
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center border border-ink/10 px-4 text-xs font-semibold text-ink/45">
                    Borrador
                  </span>
                )}
                {canManage ? (
                  <>
                    <Link
                      href={`/admin/projects/${project.id}`}
                    className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                    >
                      <Edit3 className="size-4" />
                      Editar
                    </Link>
                    <DeleteProjectButton id={project.id} title={project.title} />
                  </>
                ) : null}
              </div>
              </article>
              );
            })}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="proyectos"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredProjects}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <h3 className="font-serif text-3xl text-ink">
            No hay proyectos para mostrar.
          </h3>
          <p className="mt-2 text-sm text-ink/75">
            Creá el primer caso de estudio para alimentar el portfolio público.
          </p>
        </div>
      )}
    </section>
  );
}
