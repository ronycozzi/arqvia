import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Copy, ImageIcon, Info } from "lucide-react";
import { DeleteMediaButton } from "@/components/admin/delete-media-button";
import { MediaRightsForm } from "@/components/admin/media-rights-form";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { AdminPaginationControls } from "@/components/admin/pagination-controls";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import {
  buildAdminPaginationHref,
  resolveAdminPagination,
} from "@/lib/admin-pagination";
import { prisma } from "@/lib/db";
import { isMediaRightsApproved } from "@/lib/media-rights";
import { getMediaUsageByUrls } from "@/lib/media-usage";
import { getMediaStorageStatus } from "@/lib/media-storage";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin imágenes",
  robots: { index: false, follow: false },
};

const pageSize = 48;

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    deleted?: string;
    error?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { categoria, deleted, error, page, q } = await searchParams;
  const canManage = canManageContent(session.user.role);
  const query = q?.trim();
  const selectedCategory = categoria?.trim() || "";
  const storage = getMediaStorageStatus();

  const where: Prisma.MediaAssetWhereInput = {
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { altText: { contains: query } },
            { url: { contains: query } },
            { category: { contains: query } },
            { sourceUrl: { contains: query } },
            { rightsNote: { contains: query } },
          ],
        }
      : {}),
  };

  const filteredAssets = await prisma.mediaAsset.count({ where });
  const pagination = resolveAdminPagination(page, filteredAssets, pageSize);
  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (selectedCategory) paginationParams.set("categoria", selectedCategory);
  const pageHref = (nextPage: number) =>
    buildAdminPaginationHref("/admin/media", paginationParams, nextPage);

  if (pagination.shouldRedirect) {
    redirect(pageHref(pagination.currentPage));
  }

  const [assets, totalAssets, categories, totalBytes, pendingRights] =
    await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.mediaAsset.count(),
      prisma.mediaAsset.findMany({
        distinct: ["category"],
        orderBy: { category: "asc" },
        select: { category: true },
      }),
      prisma.mediaAsset.aggregate({ _sum: { sizeBytes: true } }),
      prisma.mediaAsset.count({
        where: {
          OR: [
            { rightsApprovedAt: null },
            { rightsApprovedBy: null },
            { rightsNote: null },
          ],
        },
      }),
    ]);

  const { currentPage, totalPages } = pagination;
  const usageByUrl = await getMediaUsageByUrls(assets.map((asset) => asset.url));

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Imágenes totales", totalAssets],
          ["Resultado actual", filteredAssets],
          ["Categorías", categories.length],
          ["Peso total", formatBytes(totalBytes._sum.sizeBytes || 0)],
          ["Pendientes de derechos", pendingRights],
        ].map(([label, value]) => (
          <article key={label} className="premium-card p-5">
            <p className="font-sans text-4xl font-semibold tabular-nums text-ink">
              {value}
            </p>
            <p className="mt-1 text-sm text-ink/75">{label}</p>
          </article>
        ))}
      </div>

      <div className="premium-card p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Biblioteca visual
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Imágenes para proyectos, servicios y contenido
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Subí recursos, registrá procedencia y derechos, revisá alt text y
              usá la ruta generada en hero, proyectos, servicios, equipo o blog.
            </p>
          </div>
          <div className="flex items-start gap-3 border border-bronze/25 bg-bronze/10 px-4 py-3 text-sm leading-6 text-ink/72">
            <Info className="mt-0.5 size-4 shrink-0 text-bronze" />
            <p>
              {storage.persistent
                ? "La biblioteca usa almacenamiento persistente S3 compatible. Las URLs se conservan entre despliegues."
                : "La biblioteca usa almacenamiento local. Configurá S3 o R2 antes de operar imágenes definitivas en hosting."}
            </p>
          </div>
        </div>

        {deleted === "1" ? (
          <p className="mt-5 border border-olive/30 bg-olive/10 px-4 py-3 text-sm font-semibold text-ink">
            Imagen eliminada correctamente.
          </p>
        ) : null}
        {error === "delete-failed" ? (
          <p className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            No se pudo eliminar la imagen.
          </p>
        ) : null}

        <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="media-search">
            Buscar imágenes
          </label>
          <input
            id="media-search"
            name="q"
            defaultValue={query || ""}
            placeholder="Buscar por título, alt text, ruta, origen o derechos"
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="media-category">
            Filtrar por categoría
          </label>
          <select
            id="media-category"
            name="categoria"
            defaultValue={selectedCategory}
            className="h-12 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.category} value={category.category}>
                {category.category}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-12 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Filtrar
          </button>
        </form>
      </div>

      {canManage ? <MediaUploadForm canManage={canManage} /> : null}

      {assets.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {assets.map((asset) => (
              <article key={asset.id} className="premium-card overflow-hidden">
                {(() => {
                  const usage = usageByUrl.get(asset.url) || { labels: [], total: 0 };
                  const rightsApproved = isMediaRightsApproved(asset);

                  return (
                    <>
                <div className="relative aspect-[4/3] bg-stone">
                  <Image
                    src={asset.url}
                    alt={asset.altText}
                    fill
                    unoptimized={asset.source === "upload"}
                    sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 bg-ink/82 px-3 py-1 text-xs font-semibold text-paper backdrop-blur">
                    {asset.category}
                  </span>
                </div>
                <div className="grid gap-4 p-4">
                  <div>
                    <h3 className="font-serif text-2xl text-ink">{asset.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">
                      {asset.altText}
                    </p>
                  </div>
                  <div className="grid gap-2 text-xs text-ink/62">
                    <span>{asset.mimeType}</span>
                    <span>{formatBytes(asset.sizeBytes)}</span>
                    <span>Subida {formatDate(asset.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 border border-ink/10 bg-mist px-3 py-2">
                    <Copy className="size-3.5 text-bronze" />
                    <code className="min-w-0 flex-1 truncate text-xs text-ink">
                      {asset.url}
                    </code>
                  </div>
                  {usage.total > 0 ? (
                    <div className="border border-bronze/20 bg-bronze/10 px-3 py-2 text-xs leading-5 text-ink/72">
                      <p className="font-semibold text-ink">
                        En uso en {usage.total} lugar{usage.total === 1 ? "" : "es"}.
                      </p>
                      <p className="mt-1 line-clamp-2">{usage.labels.slice(0, 2).join(" · ")}</p>
                    </div>
                  ) : null}
                  <MediaRightsForm
                    canManage={canManage}
                    value={{
                      approved: rightsApproved,
                      id: asset.id,
                      rightsApprovedAt:
                        asset.rightsApprovedAt?.toISOString() || null,
                      rightsApprovedBy: asset.rightsApprovedBy,
                      rightsNote: asset.rightsNote,
                      sourceUrl: asset.sourceUrl,
                    }}
                  />
                  {canManage ? (
                    <DeleteMediaButton
                      id={asset.id}
                      title={asset.title}
                      usageLabels={usage.labels}
                      usageCount={usage.total}
                    />
                  ) : null}
                </div>
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
          <AdminPaginationControls
            currentPage={currentPage}
            itemLabel="imágenes"
            pageHref={pageHref}
            totalPages={totalPages}
            totalResults={filteredAssets}
          />
        </>
      ) : (
        <div className="premium-card border-dashed p-10 text-center">
          <ImageIcon className="mx-auto size-10 text-bronze" />
          <h3 className="mt-4 font-serif text-3xl text-ink">
            Todavía no hay imágenes cargadas.
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink/75">
            Subí la primera imagen para empezar a construir una biblioteca visual
            reutilizable en todo el sitio.
          </p>
        </div>
      )}
    </section>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
