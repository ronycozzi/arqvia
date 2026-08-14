import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string; type: string }>;
};

export const metadata: Metadata = {
  title: "Editar categoría",
  robots: { index: false, follow: false },
};

export default async function EditCategoryPage({ params }: PageProps) {
  const { id, type } = await params;
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);
  const categoryType = type === "service" ? "service" : type === "project" ? "project" : null;
  if (!categoryType) notFound();

  const category =
    categoryType === "project"
      ? await prisma.projectCategory.findUnique({ where: { id } })
      : await prisma.serviceCategory.findUnique({ where: { id } });

  if (!category) notFound();

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link
          href="/admin/categories"
          className="text-sm font-semibold text-bronze underline underline-offset-4"
        >
          Volver a categorías
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Editar categoría
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{category.name}</h2>
      </div>

      <CategoryForm
        canEdit={canEdit}
        category={{
          id: category.id,
          type: categoryType,
          name: category.name,
          slug: category.slug,
          description: category.description,
        }}
      />
    </section>
  );
}
