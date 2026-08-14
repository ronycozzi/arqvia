import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FaqForm } from "@/components/admin/faq-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { findAdminReferenceOptions } from "@/lib/admin-reference-options";

export const metadata: Metadata = {
  title: "Nueva pregunta frecuente",
  robots: { index: false, follow: false },
};

export default async function NewFaqPage() {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const canEdit = canManageContent(session.user.role);
  const { options: services } = await findAdminReferenceOptions({
    q: "",
    selectedId: "",
    take: 30,
    type: "services",
  });

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link
          href="/admin/faq"
          className="text-sm font-semibold text-bronze underline underline-offset-4"
        >
          Volver a FAQ
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Nueva pregunta frecuente
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          Agregar respuesta pública
        </h2>
      </div>

      <FaqForm
        canEdit={canEdit}
        services={services}
        faq={{
          question: "",
          answer: "",
          category: "Presupuesto",
          sortOrder: 0,
          active: true,
          relatedServiceId: "",
        }}
      />
    </section>
  );
}
