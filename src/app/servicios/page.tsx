import Link from "next/link";
import { MessageCircle, MoveUpRight } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { ServiceCard } from "@/components/service-card";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { createPageMetadata } from "@/lib/seo";
import { getServiceGroups } from "@/lib/service-data";
import { buildWhatsAppUrl } from "@/lib/utils";

export const generateMetadata = createPageMetadata({
  title: "Servicios",
  description:
    "Servicios de arquitectura, construcción llave en mano, remodelaciones, dirección de obra e interiorismo en Córdoba.",
  canonical: "/servicios",
});

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [serviceGroups, config] = await Promise.all([
    getServiceGroups(),
    getClientConfig(),
  ]);
  const contactHref = "/contacto?origen=%2Fservicios";
  const whatsappHref = buildWhatsAppUrl(
    "Hola, quiero recibir orientación sobre qué servicio de Arqvia se ajusta a mi proyecto.",
    config.whatsapp,
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <SectionHeading
        as="h1"
        eyebrow="Servicios"
        title="Diseño, obra e interiores con un alcance claro."
        description="Elegí el servicio que mejor se ajusta a tu proyecto. Si todavía no lo tenés definido, te ayudamos a ordenarlo en la consulta inicial."
      />
      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-ink/10 py-4 text-sm">
        <span className="font-semibold text-ink">También podés:</span>
        <Link
          href="/proyectos"
          className="inline-flex min-h-10 items-center gap-2 font-semibold text-ink underline decoration-bronze underline-offset-4 transition hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
        >
          Ver obras realizadas <MoveUpRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href={contactHref}
          className="inline-flex min-h-10 items-center font-semibold text-ink underline decoration-bronze underline-offset-4 transition hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
        >
          Pedir presupuesto
        </Link>
      </div>
      <div className="mt-10 space-y-12">
        {serviceGroups.map((category) =>
          category.services.length ? (
            <section key={category.slug} aria-labelledby={`service-category-${category.slug}`}>
              <h2 id={`service-category-${category.slug}`} className="mb-4 font-serif text-2xl text-ink md:text-3xl">
                {category.name}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {category.services.map((service) => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            </section>
          ) : null,
        )}
      </div>
      <section className="mt-14 bg-ink p-7 text-paper md:p-9" aria-labelledby="services-contact-title">
        <h2 id="services-contact-title" className="font-serif text-3xl md:text-4xl">
          ¿No sabés qué servicio necesitás?
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-paper/72">
          Contanos qué querés construir o transformar y en qué etapa estás. Te
          orientamos hacia el alcance adecuado.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={contactHref}
            className="inline-flex min-h-12 items-center justify-center bg-bronze px-6 text-sm font-semibold text-paper transition duration-300 hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
          >
            Solicitar presupuesto para un servicio
          </Link>
          <TrackedAnchor
            href={whatsappHref}
            eventName="whatsapp_click"
            eventParams={{ source: "services_final_cta" }}
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-paper/20 px-6 text-sm font-semibold text-paper transition hover:border-bronze-light hover:text-bronze-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze-light"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Consultar por WhatsApp
          </TrackedAnchor>
        </div>
      </section>
    </section>
  );
}
