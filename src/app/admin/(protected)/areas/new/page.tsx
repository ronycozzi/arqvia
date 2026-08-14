import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AreaForm } from "@/components/admin/area-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Nueva área",
  robots: { index: false, follow: false },
};

export default async function NewAreaPage() {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const canEdit = canManageContent(session.user.role);

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link href="/admin/areas" className="text-sm font-semibold text-bronze underline underline-offset-4">
          Volver a áreas
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Nueva área
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">Agregar página local</h2>
      </div>
      <AreaForm
        canEdit={canEdit}
        area={{
          name: "",
          slug: "",
          description: "",
          seoTitle: "",
          seoDescription: "",
          active: true,
        }}
      />
    </section>
  );
}
