import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaForm } from "@/components/admin/area-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Editar área",
  robots: { index: false, follow: false },
};

export default async function EditAreaPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);
  const area = await prisma.area.findUnique({ where: { id } });
  if (!area) notFound();

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link href="/admin/areas" className="text-sm font-semibold text-bronze underline underline-offset-4">
          Volver a áreas
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Editar área
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{area.name}</h2>
      </div>
      <AreaForm
        canEdit={canEdit}
        area={{
          id: area.id,
          expectedUpdatedAt: area.updatedAt.toISOString(),
          name: area.name,
          slug: area.slug,
          description: area.description,
          seoTitle: area.seoTitle,
          seoDescription: area.seoDescription,
          active: area.active,
        }}
      />
    </section>
  );
}
