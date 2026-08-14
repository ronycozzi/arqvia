import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Edit3, Plus } from "lucide-react";
import { DeleteAreaButton } from "@/components/admin/delete-area-button";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin áreas",
  robots: { index: false, follow: false },
};

const pageSize = 25;

export default async function AdminAreasPage({
  searchParams,
}: {
  searchParams: Promise<{ activa?: string; error?: string; page?: string; q?: string }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { activa, error, page, q } = await searchParams;
  const canManage = canManageContent(session.user.role);
  const query = q?.trim();
  const selectedStatus =
    activa === "publicada" || activa === "oculta" ? activa : "";

  const where: Prisma.AreaWhereInput = {
    ...(selectedStatus ? { active: selectedStatus === "publicada" } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            { description: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredAreas = await prisma.area.count({ where });
  const pagination = resolveAdminPagination(page, filteredAreas, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedStatus) paginationParams.set("activa", selectedStatus);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/areas", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [areas, totalAreas, activeCount] = await Promise.all([
    prisma.area.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.area.count(),
    prisma.area.count({ where: { active: true } }),
  ]);
  const { currentPage, totalPages } = pagination;
  const inactiveCount = Math.max(totalAreas - activeCount, 0);

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Áreas totales", totalAreas],
          ["Resultado actual", filteredAreas],
          ["Publicadas", activeCount],
          ["Ocultas", inactiveCount],
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
              Áreas CMS
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Zonas de trabajo y SEO local
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Gestioná páginas locales, cobertura de servicio, footer y sitemap
              para búsquedas por ciudad o zona.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/areas/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
            >
              <Plus className="size-4" />
              Nueva área
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="area-search">
            Buscar áreas
          </label>
          <input
            id="area-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por zona, slug o descripción"
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="area-active">
            Filtrar por publicación
          </label>
          <select
            id="area-active"
            name="activa"
            defaultValue={selectedStatus}
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todas</option>
            <option value="publicada">Publicadas</option>
            <option value="oculta">Ocultas</option>
          </select>
          <button
            type="submit"
            className="h-12 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Buscar
          </button>
        </form>
        {error === "delete-failed" ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            No se pudo eliminar el área. Revisá si sigue existiendo o intentá
            nuevamente.
          </p>
        ) : null}
      </div>

      {areas.length ? (
        <>
          <div className="grid gap-4">
            {areas.map((area) => (
              <article
                key={area.id}
                className="premium-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={
                        area.active
                          ? "bg-olive px-3 py-1 text-xs font-semibold text-paper"
                          : "bg-ink/8 px-3 py-1 text-xs font-semibold text-ink/65"
                      }
                    >
                      {area.active ? "Publicada" : "Oculta"}
                    </span>
                    <span className="bg-mist px-3 py-1 text-xs font-semibold text-ink">
                      {area.slug}
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-3xl text-ink">
                    {area.name}
                  </h3>
                  <p className="mt-2 max-w-4xl text-sm leading-7 text-ink/75">
                    {area.description}
                  </p>
                  <p className="mt-3 text-xs text-ink/55">{area.seoTitle}</p>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  <Link
                    href={`/zonas/${area.slug}`}
                    className="inline-flex h-10 items-center border border-ink/15 px-4 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
                  >
                    Ver
                  </Link>
                  {canManage ? (
                    <>
                      <Link
                        href={`/admin/areas/${area.id}`}
                        className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                      >
                        <Edit3 className="size-4" />
                        Editar
                      </Link>
                      <DeleteAreaButton id={area.id} name={area.name} />
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="áreas"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredAreas}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <h3 className="font-serif text-3xl text-ink">
            No hay áreas para mostrar.
          </h3>
          <p className="mt-2 text-sm text-ink/75">
            Publicá zonas para alimentar páginas locales y enlaces internos.
          </p>
        </div>
      )}
    </section>
  );
}
