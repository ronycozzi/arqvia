import type { Metadata } from "next";
import Link from "next/link";
import { Edit3, Plus } from "lucide-react";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin categorías",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; tipo?: string }>;
}) {
  const session = await requireVerifiedAdminSession();
  const { error, q, tipo } = await searchParams;
  const canManage = canManageContent(session.user.role);
  const query = q?.trim().toLowerCase();
  const selectedType = tipo === "project" || tipo === "service" ? tipo : "";

  const [projectCategories, serviceCategories] = await Promise.all([
    prisma.projectCategory.findMany({
      include: { _count: { select: { projects: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.serviceCategory.findMany({
      include: { _count: { select: { services: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const projectRows = projectCategories
    .map((category) => ({
      id: category.id,
      count: category._count.projects,
      description: category.description,
      name: category.name,
      slug: category.slug,
      type: "project" as const,
    }))
    .filter((category) => matchesQuery(category, query))
    .filter((category) => !selectedType || category.type === selectedType);

  const serviceRows = serviceCategories
    .map((category) => ({
      id: category.id,
      count: category._count.services,
      description: category.description,
      name: category.name,
      slug: category.slug,
      type: "service" as const,
    }))
    .filter((category) => matchesQuery(category, query))
    .filter((category) => !selectedType || category.type === selectedType);

  const totalProjectAssociations = projectRows.reduce(
    (total, category) => total + category.count,
    0,
  );
  const totalServiceAssociations = serviceRows.reduce(
    (total, category) => total + category.count,
    0,
  );
  const filteredCategories = projectRows.length + serviceRows.length;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Categorías visibles", filteredCategories],
          ["De proyectos", projectRows.length],
          ["De servicios", serviceRows.length],
          ["Contenido asociado", totalProjectAssociations + totalServiceAssociations],
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
              Categorías
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">
              Organización de proyectos y servicios
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
              Ordená cómo se agrupan obras y servicios para que el portfolio,
              los formularios internos y la navegación comercial mantengan una
              estructura clara.
            </p>
          </div>
          {canManage ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/categories/new?type=project"
                className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
              >
                <Plus className="size-4" />
                Categoría proyecto
              </Link>
              <Link
                href="/admin/categories/new?type=service"
                className="inline-flex h-12 items-center justify-center gap-2 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-bronze hover:text-bronze"
              >
                <Plus className="size-4" />
                Categoría servicio
              </Link>
            </div>
          ) : null}
        </div>

        {error === "category-in-use" ? (
          <div className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se puede eliminar una categoría que tiene contenido asociado.
          </div>
        ) : null}

        {error === "delete-failed" ? (
          <div className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudo eliminar la categoría. Revisá si sigue existiendo o intentá nuevamente.
          </div>
        ) : null}

        <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="category-search">
            Buscar categorías
          </label>
          <input
            id="category-search"
            name="q"
            defaultValue={q || ""}
            placeholder="Buscar por nombre, slug o descripción"
            className="h-12 border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          />
          <label className="sr-only" htmlFor="category-type">
            Filtrar por tipo
          </label>
          <select
            id="category-type"
            name="tipo"
            defaultValue={selectedType}
            className="h-12 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20"
          >
            <option value="">Todos los tipos</option>
            <option value="project">Proyectos</option>
            <option value="service">Servicios</option>
          </select>
          <button
            type="submit"
            className="h-12 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Filtrar
          </button>
        </form>
      </div>

      {selectedType !== "service" ? (
        <CategorySection
          canManage={canManage}
          title="Categorías de proyectos"
          rows={projectRows}
        />
      ) : null}
      {selectedType !== "project" ? (
        <CategorySection
          canManage={canManage}
          title="Categorías de servicios"
          rows={serviceRows}
        />
      ) : null}
    </section>
  );
}

function matchesQuery(
  category: { description: string | null; name: string; slug: string },
  query?: string,
) {
  if (!query) return true;
  return [category.name, category.slug, category.description || ""].some((value) =>
    value.toLowerCase().includes(query),
  );
}

function CategorySection({
  canManage,
  rows,
  title,
}: {
  canManage: boolean;
  rows: {
    count: number;
    description: string | null;
    id: string;
    name: string;
    slug: string;
    type: "project" | "service";
  }[];
  title: string;
}) {
  return (
    <section className="grid gap-4">
      <h3 className="font-serif text-3xl text-ink">{title}</h3>
      {rows.length ? (
        rows.map((category) => (
          <article
            key={`${category.type}-${category.id}`}
            className="premium-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]"
          >
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-mist px-3 py-1 text-xs font-semibold text-ink">
                  {category.type === "project" ? "Proyecto" : "Servicio"}
                </span>
                <span className="bg-stone px-3 py-1 text-xs font-semibold text-ink/75">
                  {category.slug}
                </span>
                <span className="bg-ink/8 px-3 py-1 text-xs font-semibold text-ink/65">
                  {category.count} asociados
                </span>
              </div>
              <h4 className="mt-4 font-serif text-3xl text-ink">{category.name}</h4>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
                {category.description || "Sin descripción interna."}
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <Link
                  href={`/admin/categories/${category.type}/${category.id}`}
                  className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze"
                >
                  <Edit3 className="size-4" />
                  Editar
                </Link>
                <DeleteCategoryButton
                  id={category.id}
                  name={category.name}
                  type={category.type}
                />
              </div>
            ) : null}
          </article>
        ))
      ) : (
        <div className="premium-card border-dashed p-8 text-center text-sm text-ink/70">
          No hay categorías para mostrar.
        </div>
      )}
    </section>
  );
}
