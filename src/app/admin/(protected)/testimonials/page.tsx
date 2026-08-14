import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Edit3, Plus } from "lucide-react";
import { DeleteTestimonialButton } from "@/components/admin/delete-testimonial-button";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin testimonios",
  robots: { index: false, follow: false },
};

const pageSize = 25;

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ destacado?: string; error?: string; page?: string; q?: string }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { destacado, error, page, q } = await searchParams;
  const canManage = canManageContent(session.user.role);
  const query = q?.trim();
  const selectedFeatured =
    destacado === "home" || destacado === "oculto" ? destacado : "";

  const where: Prisma.TestimonialWhereInput = {
    ...(selectedFeatured ? { featured: selectedFeatured === "home" } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { quote: { contains: query } },
            { projectType: { contains: query } },
            { location: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredTestimonials = await prisma.testimonial.count({ where });
  const pagination = resolveAdminPagination(page, filteredTestimonials, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedFeatured) paginationParams.set("destacado", selectedFeatured);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/testimonials", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [testimonials, totalTestimonials, featuredCount] =
    await Promise.all([
      prisma.testimonial.findMany({
        where,
        include: { project: { select: { title: true, slug: true } } },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.testimonial.count(),
      prisma.testimonial.count({ where: { featured: true } }),
    ]);
  const { currentPage, totalPages } = pagination;
  const hiddenCount = Math.max(totalTestimonials - featuredCount, 0);

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Testimonios totales", totalTestimonials],
          ["Resultado actual", filteredTestimonials],
          ["En home", featuredCount],
          ["Ocultos", hiddenCount],
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
              Testimonios CMS
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Experiencias de clientes y prueba social
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Gestioná testimonios específicos para reforzar confianza,
              proyectos reales y decisiones de contratación.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/testimonials/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
            >
              <Plus className="size-4" />
              Nuevo testimonio
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="testimonial-search">
            Buscar testimonios
          </label>
          <input
            id="testimonial-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por cliente, proyecto, zona o texto"
            className="h-12 flex-1 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="testimonial-featured">
            Filtrar por visibilidad
          </label>
          <select
            id="testimonial-featured"
            name="destacado"
            defaultValue={selectedFeatured}
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos</option>
            <option value="home">En home</option>
            <option value="oculto">Ocultos</option>
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
            No se pudo eliminar el testimonio. Revisá si sigue existiendo o intentá nuevamente.
          </p>
        ) : null}
      </div>

      {testimonials.length ? (
        <>
          <div className="grid gap-4">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.id}
                className="premium-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]"
              >
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-mist px-3 py-1 text-xs font-semibold text-ink">
                    {testimonial.projectType}
                  </span>
                  {testimonial.featured ? (
                    <span className="bg-olive px-3 py-1 text-xs font-semibold text-paper">
                      En home
                    </span>
                  ) : (
                    <span className="bg-ink/8 px-3 py-1 text-xs font-semibold text-ink/65">
                      Oculto
                    </span>
                  )}
                  {testimonial.project ? (
                    <span className="bg-stone px-3 py-1 text-xs font-semibold text-ink/75">
                      {testimonial.project.title}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 font-serif text-3xl text-ink">
                  {testimonial.name}
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-ink/75">
                  “{testimonial.quote}”
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/55">
                  <span>{testimonial.location}</span>
                  <span>{testimonial.role || "Sin servicio asociado"}</span>
                  <span>{formatDate(testimonial.createdAt)}</span>
                </div>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  <Link
                    href={`/admin/testimonials/${testimonial.id}`}
                    className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                  >
                    <Edit3 className="size-4" />
                    Editar
                  </Link>
                  <DeleteTestimonialButton
                    id={testimonial.id}
                    name={testimonial.name}
                  />
                </div>
              ) : null}
              </article>
            ))}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="testimonios"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredTestimonials}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <h3 className="font-serif text-3xl text-ink">
            No hay testimonios para mostrar.
          </h3>
          <p className="mt-2 text-sm text-ink/75">
            Creá testimonios concretos para reforzar confianza y cierre comercial.
          </p>
        </div>
      )}
    </section>
  );
}
