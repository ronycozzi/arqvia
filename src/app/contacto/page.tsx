import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { QuoteForm } from "@/components/quote-form";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getPublicAreaLinks } from "@/lib/area-data";
import { getPublicBlogPosts } from "@/lib/blog-data";
import { getClientConfig } from "@/lib/client-config";
import { resolveContactSource } from "@/lib/contact-source";
import { localSeoPages } from "@/lib/local-seo";
import { getPublicProjects } from "@/lib/project-data";
import { createPageMetadata } from "@/lib/seo";
import { getPublicServiceLinks } from "@/lib/service-data";
import { buildWhatsAppUrl } from "@/lib/utils";

export const generateMetadata = createPageMetadata({
  title: "Solicitar presupuesto",
  description:
    "Formulario de presupuesto para construcción, remodelación, arquitectura e interiorismo en Córdoba.",
  canonical: "/contacto",
});

type ContactPageProps = {
  searchParams: Promise<{ origen?: string }>;
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { origen } = await searchParams;
  const [config, projects, services, posts, areas] = await Promise.all([
    getClientConfig(),
    getPublicProjects(),
    getPublicServiceLinks(),
    getPublicBlogPosts(),
    getPublicAreaLinks(),
  ]);
  const dynamicLabels = new Map<string, string>([
    ...projects.map(
      (project) =>
        ["/proyectos/" + project.slug, "proyecto " + project.title] as const,
    ),
    ...services.map(
      (service) =>
        ["/servicios/" + service.slug, "servicio " + service.title] as const,
    ),
    ...posts.map(
      (post) => ["/blog/" + post.slug, "guía " + post.title] as const,
    ),
    ...areas.map(
      (area) => ["/zonas/" + area.slug, "zona " + area.name] as const,
    ),
    ...localSeoPages.map(
      (page) => ["/" + page.slug, page.title] as const,
    ),
  ]);
  const { label: sourceLabel, sourcePage } = resolveContactSource(
    origen,
    dynamicLabels,
  );

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-9 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="contact-page-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
            Contacto
          </p>
          <h1 id="contact-page-title" className="mt-4 font-serif text-4xl leading-tight text-ink md:text-6xl">
            Contanos sobre tu proyecto.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink/75 md:text-lg">
            Compartí los datos principales y te contactamos para evaluar el
            alcance y los próximos pasos.
          </p>
          {sourceLabel ? (
            <div className="mt-6 border border-bronze/25 bg-bronze/10 px-4 py-3 text-sm leading-6 text-ink/78">
              Tomamos como referencia inicial:{" "}
              <strong className="font-semibold text-ink">{sourceLabel}</strong>.
              Podés sumar detalles para adaptar la evaluación a tu caso.
            </div>
          ) : null}
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <QuoteForm sourcePage={sourcePage} />
        </div>

        <div className="lg:col-start-1">
          <div className="mt-8 space-y-4 text-sm text-ink/70">
            <TrackedAnchor
              href={`tel:${config.phone.replace(/[^+\d]/g, "")}`}
              eventName="phone_click"
              eventParams={{ source: "contact_page" }}
              className="flex min-h-11 items-center gap-3 transition hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
            >
              <Phone className="size-4 text-bronze" aria-hidden="true" />
              <span>{config.phone}</span>
            </TrackedAnchor>
            <TrackedAnchor
              href={`mailto:${config.email}`}
              eventName="email_click"
              eventParams={{ source: "contact_page" }}
              className="flex min-h-11 items-center gap-3 transition hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
            >
              <Mail className="size-4 text-bronze" aria-hidden="true" />
              <span className="break-all">{config.email}</span>
            </TrackedAnchor>
            <p className="flex items-center gap-3">
              <MapPin className="size-4 text-bronze" aria-hidden="true" /> {config.address}
            </p>
            <p className="flex items-center gap-3">
              <Clock3 className="size-4 text-bronze" aria-hidden="true" /> {config.businessHours}
            </p>
          </div>
          <TrackedAnchor
            href={buildWhatsAppUrl(
              "Hola, quiero consultar por un proyecto con Arqvia. Estoy en Córdoba y me gustaría recibir orientación.",
              config.whatsapp,
            )}
            eventName="whatsapp_click"
            eventParams={{ source: "contact_page" }}
            className="mt-8 inline-flex h-12 items-center gap-2 border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Consultar por WhatsApp
          </TrackedAnchor>
        </div>
      </section>
    </>
  );
}
