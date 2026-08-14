import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ContentStatus, Prisma } from "@prisma/client";
import { Edit3, Plus } from "lucide-react";
import { DeleteBlogPostButton } from "@/components/admin/delete-blog-post-button";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin blog",
  robots: { index: false, follow: false },
};

const pageSize = 20;

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; error?: string; page?: string }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { q, estado, error, page } = await searchParams;
  const canManage = canManageContent(session.user.role);
  const query = q?.trim();
  const status = estado === "DRAFT" || estado === "PUBLISHED" ? estado : "";

  const where: Prisma.BlogPostWhereInput = {
    ...(status ? { status: status as ContentStatus } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { slug: { contains: query } },
            { excerpt: { contains: query } },
            { category: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredPosts = await prisma.blogPost.count({ where });
  const pagination = resolveAdminPagination(page, filteredPosts, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (status) paginationParams.set("estado", status);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/blog", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [posts, totalPosts, publishedCount, draftCount] =
    await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
      prisma.blogPost.count({ where: { status: "DRAFT" } }),
    ]);
  const { currentPage, totalPages } = pagination;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Publicaciones totales", totalPosts],
          ["Resultado actual", filteredPosts],
          ["Publicadas", publishedCount],
          ["Borradores", draftCount],
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
              Blog
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Guías y publicaciones
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Gestioná artículos para autoridad, consultas informadas y SEO
              local.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/admin/blog/new"
              className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
            >
              <Plus className="size-4" />
              Nueva publicación
            </Link>
          ) : null}
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="blog-search">
            Buscar publicaciones
          </label>
          <input
            id="blog-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por título, slug o categoría"
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="blog-status">
            Filtrar por estado
          </label>
          <select
            id="blog-status"
            name="estado"
            defaultValue={status}
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="DRAFT">Borradores</option>
          </select>
          <button
            type="submit"
            className="h-12 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Buscar
          </button>
        </form>

        {error === "delete-failed" ? (
          <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudo eliminar la publicación. Revisá si el registro existe e
            intentá nuevamente.
          </p>
        ) : null}
      </div>

      {posts.length ? (
        <>
          <div className="grid gap-4">
            {posts.map((post, index) => (
              <article
                key={post.id}
                className="premium-card grid gap-4 p-4 md:grid-cols-[180px_1fr_auto]"
              >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone md:aspect-auto">
                <Image
                  src={post.coverImage}
                  alt={`Imagen de ${post.title}`}
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
                    {post.category}
                  </span>
                  <span className="bg-ink px-3 py-1 text-xs font-semibold text-paper">
                    {post.status === "PUBLISHED" ? "Publicado" : "Borrador"}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-3xl text-ink">
                  {post.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/75">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/75">
                  <span>{post.slug}</span>
                  <span>Actualizado {formatDate(post.updatedAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                {post.status === "PUBLISHED" ? (
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex h-10 items-center border border-ink/15 px-4 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
                  >
                    Ver
                  </Link>
                ) : null}
                {canManage ? (
                  <>
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                    >
                      <Edit3 className="size-4" />
                      Editar
                    </Link>
                    <DeleteBlogPostButton id={post.id} title={post.title} />
                  </>
                ) : null}
              </div>
              </article>
            ))}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="publicaciones"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredPosts}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <h3 className="font-serif text-3xl text-ink">
            No encontramos publicaciones.
          </h3>
          <p className="mt-2 text-sm text-ink/75">
            Ajustá la búsqueda o cargá una nueva guía para el blog.
          </p>
        </div>
      )}
    </section>
  );
}
