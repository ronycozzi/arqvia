import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ServiceForm,
  type AdminServiceFormValue,
} from "@/components/admin/service-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { imageKit } from "@/lib/content";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Nuevo servicio",
  robots: { index: false, follow: false },
};

const blankService: AdminServiceFormValue = {
  publicationStatus: "DRAFT",
  title: "",
  slug: "",
  categoryId: "",
  icon: "Sparkles",
  shortDescription: "",
  description: "",
  coverImage: imageKit.house,
  mainBenefit: "",
  audience: "",
  benefits:
    "Ordena decisiones antes de invertir\nReduce cambios durante la obra\nFacilita comparar presupuestos\nMejora la coordinación entre diseño y ejecución",
  included:
    "Relevamiento inicial\nPropuesta de alcance\nPresupuesto por etapas\nSeguimiento profesional",
  process:
    "Consulta inicial\nDiagnóstico\nPropuesta\nPlanificación\nEntrega",
  faq: "¿Puedo pedir una consulta inicial? | Sí. La consulta sirve para ordenar alcance, tiempos y próximos pasos.",
  whatsappMessage:
    "Hola, vi este servicio en la web y quiero consultar por mi proyecto.",
  featured: false,
  seoTitle: "",
  seoDescription: "",
};

export default async function NewServicePage() {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const canEdit = canManageContent(session?.user.role);
  const [categories, mediaAssets] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
    }),
    getAdminMediaOptions(),
  ]);

  const service = {
    ...blankService,
    categoryId: categories[0]?.id || "",
  };

  return (
    <section className="grid gap-6">
      <div className="premium-panel p-6">
        <Link
          href="/admin/services"
          className="text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
        >
          Volver a servicios
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Nueva página de servicio
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          Cargar servicio comercial.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Cada servicio puede funcionar como página SEO con beneficio, proceso,
          FAQ, acción de contacto y proyectos relacionados.
        </p>
        {!canEdit ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            Tu rol puede ver esta pantalla, pero solo Admin o Editor puede
            guardar servicios.
          </p>
        ) : null}
      </div>
      {categories.length ? (
        <ServiceForm
          canEdit={canEdit}
          categories={categories}
          mediaAssets={mediaAssets}
          service={service}
        />
      ) : (
        <div className="premium-card p-8">
          <h3 className="font-serif text-3xl text-ink">
            Primero cargá una categoría de servicio.
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/75">
            Los servicios necesitan una categoría para organizar el admin, los
            módulos comerciales y las páginas SEO.
          </p>
          <Link
            href="/admin/categories"
            className="mt-6 inline-flex h-11 items-center justify-center bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-bronze"
          >
            Ir a categorías
          </Link>
        </div>
      )}
    </section>
  );
}
