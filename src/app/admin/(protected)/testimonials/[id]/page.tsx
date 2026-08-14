import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { findAdminReferenceOptions } from "@/lib/admin-reference-options";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar testimonio",
  robots: { index: false, follow: false },
};

export default async function EditTestimonialPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);

  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) notFound();
  const { options: projects } = await findAdminReferenceOptions({
    q: "",
    selectedId: testimonial.projectId || "",
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
          Editar testimonio
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          {testimonial.name}
        </h2>
      </div>

      <TestimonialForm
        canEdit={canEdit}
        projects={projects}
        testimonial={{
          id: testimonial.id,
          expectedUpdatedAt: testimonial.updatedAt.toISOString(),
          name: testimonial.name,
          role: testimonial.role,
          projectType: testimonial.projectType,
          location: testimonial.location,
          quote: testimonial.quote,
          imageUrl: testimonial.imageUrl,
          projectId: testimonial.projectId,
          featured: testimonial.featured,
        }}
      />
    </section>
  );
}
