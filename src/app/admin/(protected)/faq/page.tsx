import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Edit3, Plus } from "lucide-react";
import { DeleteFaqButton } from "@/components/admin/delete-faq-button";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin FAQ",
  robots: { index: false, follow: false },
};

const pageSize = 25;

export default async function AdminFaqPage({
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

  const where: Prisma.FaqWhereInput = {
    ...(selectedStatus ? { active: selectedStatus === "publicada" } : {}),
    ...(query
      ? {
          OR: [
            { question: { contains: query } },
            { answer: { contains: query } },
            { category: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredFaqs = await prisma.faq.count({ where });
  const pagination = resolveAdminPagination(page, filteredFaqs, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedStatus) paginationParams.set("activa", selectedStatus);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/faq", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [faqs, totalFaqs, activeCount, inactiveCount] =
    await Promise.all([
      prisma.faq.findMany({
        where,
        include: { relatedService: { select: { title: true, slug: true } } },
        orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { question: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.faq.count(),
      prisma.faq.count({ where: { active: true } }),
      prisma.faq.count({ where: { active: false } }),
    ]);
  const { currentPage, totalPages } = pagination;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Preguntas totales", totalFaqs],
          ["Resultado actual", filteredFaqs],
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
              FAQ CMS
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Preguntas frecuentes y objeciones comerciales
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Gestioná respuestas públicas para presupuesto, visitas técnicas,
              documentación, obra, tiempos y formas de contratación.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/faq/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
            >
              <Plus className="size-4" />
              Nueva pregunta
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="faq-search">
            Buscar preguntas
          </label>
          <input
            id="faq-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por pregunta, respuesta o categoría"
            className="h-12 flex-1 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="faq-active">
            Filtrar por publicación
          </label>
          <select
            id="faq-active"
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
            No se pudo eliminar la pregunta. Revisá si sigue existiendo o intentá nuevamente.
          </p>
        ) : null}
      </div>

      {faqs.length ? (
        <>
          <div className="grid gap-4">
            {faqs.map((faq) => (
              <article
                key={faq.id}
                className="premium-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]"
              >
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-mist px-3 py-1 text-xs font-semibold text-ink">
                    {faq.category}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold ${
                      faq.active ? "bg-olive text-paper" : "bg-ink/8 text-ink/65"
                    }`}
                  >
                    {faq.active ? "Publicada" : "Oculta"}
                  </span>
                  {faq.relatedService ? (
                    <span className="bg-stone px-3 py-1 text-xs font-semibold text-ink/75">
                      {faq.relatedService.title}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 font-serif text-3xl text-ink">
                  {faq.question}
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-ink/75">
                  {faq.answer}
                </p>
                <p className="mt-3 text-xs text-ink/55">Orden {faq.sortOrder}</p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  <Link
                    href={`/admin/faq/${faq.id}`}
                    className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                  >
                    <Edit3 className="size-4" />
                    Editar
                  </Link>
                  <DeleteFaqButton id={faq.id} question={faq.question} />
                </div>
              ) : null}
              </article>
            ))}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="preguntas"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredFaqs}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <h3 className="font-serif text-3xl text-ink">
            No hay preguntas para mostrar.
          </h3>
          <p className="mt-2 text-sm text-ink/75">
            Creá preguntas frecuentes para reducir dudas antes de la consulta.
          </p>
        </div>
      )}
    </section>
  );
}
