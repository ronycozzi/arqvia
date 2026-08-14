import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";

type PageProps = {
  searchParams: Promise<{ type?: string }>;
};

export const metadata: Metadata = {
  title: "Nueva categoría",
  robots: { index: false, follow: false },
};

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const { type } = await searchParams;
  const categoryType = type === "service" ? "service" : "project";
  const canEdit = canManageContent(session?.user.role);

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
          Nueva categoría
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          {categoryType === "project"
            ? "Categoría para proyectos"
            : "Categoría para servicios"}
        </h2>
      </div>

      <CategoryForm
        canEdit={canEdit}
        category={{
          type: categoryType,
          name: "",
          slug: "",
          description: "",
        }}
      />
    </section>
  );
}
