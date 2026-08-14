import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";
import { FaqAccordion } from "@/components/faq-accordion";
import { JsonLd } from "@/components/json-ld";
import { ProjectCard } from "@/components/project-card";
import { QuoteForm } from "@/components/quote-form";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getPublicAreas } from "@/lib/area-data";
import { getClientConfig } from "@/lib/client-config";
import { getContentRedirectDestination } from "@/lib/content-redirects";
import { getPublicProjectsForService } from "@/lib/project-data";
import { getPublicService } from "@/lib/service-data";
import { siteConfig } from "@/lib/site-config";
import { absoluteUrl, buildContactHref, buildWhatsAppUrl, metadataTitle } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [config, service] = await Promise.all([
    getClientConfig(),
    getPublicService(slug),
  ]);
  if (!service) {
    const destination = await getContentRedirectDestination(
      `/servicios/${slug}`,
      "SERVICE",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }

  return {
    title: metadataTitle(service.seoTitle, config.companyName),
    description: service.seoDescription,
    alternates: {
      canonical: `/servicios/${service.slug}`,
    },
    openGraph: {
      title: service.seoTitle,
      description: service.seoDescription,
      url: `/servicios/${service.slug}`,
      locale: "es_AR",
      siteName: config.companyName,
      images: [{ url: service.coverImage, alt: service.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: service.seoTitle,
      description: service.seoDescription,
      images: [service.coverImage],
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [config, service, projects, workAreas] = await Promise.all([
    getClientConfig(),
    getPublicService(slug),
    getPublicProjectsForService(slug, 3),
    getPublicAreas(),
  ]);
  if (!service) {
    const destination = await getContentRedirectDestination(
      `/servicios/${slug}`,
      "SERVICE",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }
  const contactHref = buildContactHref(`/servicios/${service.slug}`);

  const relatedProjects = projects;

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          serviceType: service.categoryName,
          description: service.description,
          provider: {
            "@type": "HomeAndConstructionBusiness",
            name: config.companyName,
            url: siteConfig.url,
            telephone: config.phone,
            email: config.email,
          },
          areaServed: workAreas.length
            ? workAreas.map((area) => ({
                "@type": "AdministrativeArea",
                name: area.name,
              }))
            : undefined,
          image: absoluteUrl(service.coverImage, siteConfig.url),
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: `${siteConfig.url}/contacto`,
            availableLanguage: "es-AR",
          },
          url: `${siteConfig.url}/servicios/${service.slug}`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Inicio",
              item: siteConfig.url,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Servicios",
              item: `${siteConfig.url}/servicios`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: service.title,
              item: `${siteConfig.url}/servicios/${service.slug}`,
            },
          ],
        }}
      />
      <section className="grid min-h-[70vh] bg-paper lg:grid-cols-2">
        <div className="flex items-end px-5 py-16 md:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2))]">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
              Servicio
            </p>
            <h1 className="font-serif text-5xl leading-none text-ink md:text-7xl">
              {service.title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-ink/75">
              {service.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={contactHref}
                className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper"
              >
                Solicitar presupuesto <ArrowRight className="size-4" />
              </Link>
              <TrackedAnchor
                href={buildWhatsAppUrl(service.whatsappMessage, config.whatsapp)}
                eventName="whatsapp_click"
                eventParams={{ source: "service_detail", service: service.slug }}
                className="inline-flex h-12 items-center justify-center gap-2 border border-ink/15 px-6 text-sm font-semibold text-ink"
              >
                <MessageCircle className="size-4" />
                Consultar por WhatsApp
              </TrackedAnchor>
            </div>
          </div>
        </div>
        <div className="relative min-h-[420px]">
          <Image
            src={service.coverImage}
            alt={`Imagen del servicio ${service.title}`}
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="premium-card h-fit p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-3xl text-ink">Beneficio principal</h2>
          <p className="mt-4 text-sm leading-7 text-ink/75">{service.mainBenefit}</p>
          <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
            Para quién es
          </h3>
          <p className="mt-3 text-sm leading-7 text-ink/75">{service.audience}</p>
        </aside>

        <div className="space-y-12">
          {service.benefits.length ? (
            <section>
              <h2 className="font-serif text-4xl text-ink">
                Beneficios para el proyecto
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {service.benefits.map((benefit, index) => (
                  <div
                    key={benefit}
                    className="premium-card group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-bronze/35"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-bronze transition duration-500 group-hover:scale-x-100"
                    />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
                      Beneficio {index + 1}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-ink/72">{benefit}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="font-serif text-4xl text-ink">Qué incluye</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {service.included.map((item) => (
                <div key={item} className="premium-card p-4 text-sm text-ink/70">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-4xl text-ink">Proceso</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {service.process.map((item, index) => (
                <div key={item} className="premium-card border-l-2 border-bronze bg-mist p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-ink/75">
                    Paso {index + 1}
                  </p>
                  <p className="mt-2 font-medium text-ink">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-6 font-serif text-4xl text-ink">Preguntas frecuentes</h2>
            <FaqAccordion items={service.faq} />
          </section>

          {relatedProjects.length ? (
            <section>
              <h2 className="font-serif text-4xl text-ink">Proyectos relacionados</h2>
              <div
                className={
                  relatedProjects.length === 1
                    ? "mt-6 grid max-w-sm gap-5"
                    : "mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                }
              >
                {relatedProjects.map((project) => (
                  <ProjectCard
                    key={project.slug}
                    project={project}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <section className="bg-mist py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
              Consulta específica
            </p>
            <h2 className="mt-3 font-serif text-5xl leading-tight text-ink">
              Pedí una evaluación para {service.title.toLowerCase()}.
            </h2>
            <p className="mt-5 text-base leading-8 text-ink/75">
              Contanos en qué etapa está tu proyecto y qué necesitás resolver.
              Con esa información podemos orientarte mejor antes de avanzar con
              una propuesta.
            </p>
          </div>
          <QuoteForm sourcePage={`/servicios/${service.slug}`} compact />
        </div>
      </section>
    </article>
  );
}
