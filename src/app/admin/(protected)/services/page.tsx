import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Edit3, Plus } from "lucide-react";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { DeleteServiceButton } from "@/components/admin/delete-service-button";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";
import {
  countServiceFaqItems,
  evaluateServiceQuality,
} from "@/lib/service-quality";
import { getAvailableServiceProjectSlugs } from "@/lib/service-project-mapping";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin servicios",
  robots: { index: false, follow: false },
};

const pageSize = 20;

export default async function AdminServicesPage({
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
  const publicNow = new Date();

  const categoryOptions = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedCategory = categoryOptions.some((item) => item.id === categoria)
    ? categoria
    : "";

  const where: Prisma.ServiceWhereInput = {
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
            { description: { contains: query } },
            { shortDescription: { contains: query } },
            { mainBenefit: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredServices = await prisma.service.count({ where });
  const pagination = resolveAdminPagination(page, filteredServices, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedCategory) paginationParams.set("categoria", selectedCategory);
  if (selectedFeatured) paginationParams.set("destacado", selectedFeatured);
  if (selectedPublication) paginationParams.set("estado", selectedPublication);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/services", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [
    services,
    allServiceQualityRows,
    totalServices,
    featuredCount,
    publishedCount,
    draftCount,
    linkedProjectCount,
    publishedProjectRows,
  ] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          category: true,
          _count: { select: { faqs: true, projects: true } },
          projects: {
            where: {
              publicationStatus: "PUBLISHED",
              publishedAt: { lte: publicNow },
            },
            select: { slug: true },
          },
        },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.service.findMany({
        include: {
          category: true,
          _count: { select: { faqs: true, projects: true } },
          projects: {
            where: {
              publicationStatus: "PUBLISHED",
              publishedAt: { lte: publicNow },
            },
            select: { slug: true },
          },
        },
      }),
      prisma.service.count(),
      prisma.service.count({ where: { featured: true } }),
      prisma.service.count({ where: { publicationStatus: "PUBLISHED" } }),
      prisma.service.count({ where: { publicationStatus: "DRAFT" } }),
      prisma.service.count({ where: { projects: { some: {} } } }),
      prisma.project.findMany({
        where: {
          publicationStatus: "PUBLISHED",
          publishedAt: { lte: publicNow },
        },
        select: { slug: true },
      }),
    ]);
  const { currentPage, totalPages } = pagination;
  const availableProjectSlugs = publishedProjectRows.map(
    (project) => project.slug,
  );
  const qualityRows = allServiceQualityRows.map((service) =>
    evaluateServiceQuality({
      ...service,
      categoryName: service.category.name,
      faqCount: service._count.faqs,
      projectCount: getAvailableServiceProjectSlugs({
        availableProjectSlugs,
        directProjectSlugs: service.projects.map((project) => project.slug),
        serviceSlug: service.slug,
      }).length,
    }),
  );
  const readyCount = qualityRows.filter((item) => item.status === "strong").length;
  const reviewCount = qualityRows.filter((item) => item.status !== "strong").length;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        {[
          ["Servicios totales", totalServices],
          ["Resultado actual", filteredServices],
          ["Destacados", featuredCount],
          ["Publicados", publishedCount],
          ["Borradores", draftCount],
          ["Con proyectos", linkedProjectCount],
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
              Servicios CMS
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Servicios y páginas SEO
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Organizá servicios por categoría, visibilidad y demanda para que
              cada página comercial se mantenga clara y orientada a consulta.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/services/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
            >
              <Plus className="size-4" />
              Nuevo servicio
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_180px_170px_auto]">
          <label className="sr-only" htmlFor="service-search">
            Buscar servicios
          </label>
          <input
            id="service-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por nombre, slug, beneficio o descripción"
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="service-category">
            Filtrar por categoría
          </label>
          <select
            id="service-category"
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
          <label className="sr-only" htmlFor="service-featured">
            Filtrar por destacado
          </label>
          <select
            id="service-featured"
            name="destacado"
            defaultValue={selectedFeatured}
            className="h-12 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos</option>
            <option value="destacado">Destacados</option>
            <option value="normal">No destacados</option>
          </select>
          <label className="sr-only" htmlFor="service-publication">
            Filtrar por visibilidad
          </label>
          <select
            id="service-publication"
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
            No se pudo eliminar el servicio. Revisá si sigue existiendo o si
            tiene relaciones pendientes.
          </p>
        ) : null}
      </div>

      {services.length ? (
        <>
          <div className="grid gap-4">
            {services.map((service, index) => {
              const relatedProjectCount = getAvailableServiceProjectSlugs({
                availableProjectSlugs,
                directProjectSlugs: service.projects.map(
                  (project) => project.slug,
                ),
                serviceSlug: service.slug,
              }).length;
              const faqCount = Math.max(
                countServiceFaqItems(service.faq),
                service._count.faqs,
              );
              const quality = evaluateServiceQuality({
                ...service,
                categoryName: service.category.name,
                faqCount,
                projectCount: relatedProjectCount,
              });

              return (
                <article
                  key={service.id}
                  className="premium-card grid gap-4 p-4 md:grid-cols-[180px_1fr_auto]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone md:aspect-auto">
                    <Image
                      src={service.coverImage}
                      alt={`Imagen del servicio ${service.title}`}
                      fill
                      loading={index < 3 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      sizes="180px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-mist px-3 py-1 text-xs font-semibold text-ink">
                        {service.category.name}
                      </span>
                      {service.featured ? (
                        <span className="bg-ink px-3 py-1 text-xs font-semibold text-paper">
                          Destacado
                        </span>
                      ) : null}
                      <span
                        className={
                          service.publicationStatus === "PUBLISHED"
                            ? "border border-olive/20 bg-olive/10 px-3 py-1 text-xs font-semibold text-olive"
                            : "border border-bronze/25 bg-bronze/10 px-3 py-1 text-xs font-semibold text-bronze"
                        }
                      >
                        {service.publicationStatus === "PUBLISHED"
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
                      {service.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/75">
                      {service.shortDescription}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/75">
                      <span>{service.slug}</span>
                      <span>
                        {relatedProjectCount} {relatedProjectCount === 1 ? "proyecto relacionado" : "proyectos relacionados"}
                      </span>
                      <span>
                        {faqCount} {faqCount === 1 ? "pregunta frecuente" : "preguntas frecuentes"}
                      </span>
                      <span>Actualizado {formatDate(service.updatedAt)}</span>
                    </div>
                    {quality.missing.length ? (
                      <div className="mt-4 border-l-2 border-bronze pl-4 text-xs leading-6 text-ink/70">
                        <p className="font-semibold text-ink">Para mejorar:</p>
                        <p>{quality.missing.slice(0, 3).join(" · ")}</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    {service.publicationStatus === "PUBLISHED" ? (
                      <Link
                        href={`/servicios/${service.slug}`}
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
                          href={`/admin/services/${service.id}`}
                          className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                        >
                          <Edit3 className="size-4" />
                          Editar
                        </Link>
                        <DeleteServiceButton
                          id={service.id}
                          title={service.title}
                        />
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="servicios"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredServices}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <h3 className="font-serif text-3xl text-ink">
            No hay servicios para mostrar.
          </h3>
          <p className="mt-2 text-sm text-ink/75">
            Creá el primer servicio para alimentar páginas públicas y acciones
            comerciales.
          </p>
        </div>
      )}
    </section>
  );
}
