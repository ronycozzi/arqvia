import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { findAdminReferenceOptions } from "@/lib/admin-reference-options";

export const metadata: Metadata = {
  title: "Nuevo testimonio",
  robots: { index: false, follow: false },
};

export default async function NewTestimonialPage() {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const canEdit = canManageContent(session.user.role);
  const { options: projects } = await findAdminReferenceOptions({
    q: "",
    selectedId: "",
    take: 30,
    type: "projects",
  });

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link
          href="/admin/testimonials"
          className="text-sm font-semibold text-bronze underline underline-offset-4"
        >
          Volver a testimonios
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Nuevo testimonio
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          Agregar experiencia de cliente
        </h2>
      </div>

      <TestimonialForm
        canEdit={canEdit}
        projects={projects}
        testimonial={{
          name: "",
          role: "",
          projectType: "",
          location: "",
          quote: "",
          imageUrl: "",
          projectId: "",
          featured: true,
        }}
      />
    </section>
  );
}
