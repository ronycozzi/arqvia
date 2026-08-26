import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { FaqAccordion } from "@/components/faq-accordion";
import { JsonLd } from "@/components/json-ld";
import { ProjectCard } from "@/components/project-card";
import { getPublicArea, getPublicAreas } from "@/lib/area-data";
import { getClientConfig } from "@/lib/client-config";
import { getContentRedirectDestination } from "@/lib/content-redirects";
import { getPublicFaqs } from "@/lib/faq-data";
import { getPublicProjects } from "@/lib/project-data";
import { defaultOgImage } from "@/lib/seo";
import { getPublicServices } from "@/lib/service-data";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { metadataTitle } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const areas = await getPublicAreas();
  return areas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [area, config] = await Promise.all([
    getPublicArea(slug),
    getClientConfig(),
  ]);
  if (!area) {
    const destination = await getContentRedirectDestination(
      `/zonas/${slug}`,
      "AREA",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }
  const resolvedTitle = metadataTitle(area.seoTitle, config.companyName);
  const socialTitle = resolvedTitle.absolute;
  return {
    title: resolvedTitle,
    description: area.seoDescription,
    alternates: {
      canonical: `/zonas/${area.slug}`,
    },
    openGraph: {
      title: socialTitle,
      description: area.seoDescription,
      url: `/zonas/${area.slug}`,
      type: "website",
      locale: "es_AR",
      siteName: config.companyName,
      images: [
        {
          url: config.heroImage || defaultOgImage.url,
          alt: `Proyecto de arquitectura de ${config.companyName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: area.seoDescription,
      images: [config.heroImage || defaultOgImage.url],
    },
  };
}

export default async function AreaPage({ params }: PageProps) {
  const { slug } = await params;
  const area = await getPublicArea(slug);
  if (!area) {
    const destination = await getContentRedirectDestination(
      `/zonas/${slug}`,
      "AREA",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }
  const [projects, services, localFaqs] = await Promise.all([
    getPublicProjects(),
    getPublicServices(),
    getPublicFaqs(4),
  ]);
  const contactHref = `/contacto?origen=${encodeURIComponent(`/zonas/${area.slug}`)}`;
  const areaProjects = projects.filter((project) => {
    const location = project.location.toLocaleLowerCase("es-AR");
    const areaName = area.name.toLocaleLowerCase("es-AR");
    return location.includes(areaName) || areaName.includes(location);
  });

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: area.name, path: `/zonas/${area.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: localFaqs.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
        Zona de trabajo
      </p>
      <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight text-ink md:text-7xl">
        Arquitectura, construcción y remodelaciones en {area.name}.
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/75">
        {area.description} Acompañamos proyectos con evaluación de alcance,
        planificación, presupuesto por etapas y seguimiento técnico según la
        necesidad de cada obra.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {services.slice(0, 3).map((service) => (
          <Link
            key={service.slug}
            href={`/servicios/${service.slug}`}
            className="premium-card p-6 transition hover:border-bronze"
          >
            <h2 className="font-serif text-3xl text-ink">{service.title}</h2>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              {service.shortDescription}
            </p>
          </Link>
        ))}
      </div>
      <h2 className="mt-14 font-serif text-4xl text-ink">Proyectos de referencia</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {areaProjects.length ? (
          areaProjects.slice(0, 3).map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))
        ) : (
          <div className="border border-dashed border-ink/20 bg-mist p-6 md:col-span-3">
            <p className="font-serif text-2xl text-ink">
              Evaluamos cada proyecto según su ubicación y alcance.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/70">
              Consultanos por antecedentes y disponibilidad de trabajo en {area.name}.
              No mostramos obras de otras zonas como si fueran referencias locales.
            </p>
          </div>
        )}
      </div>
      <div className="mt-14 max-w-4xl">
        <h2 className="mb-6 font-serif text-4xl text-ink">FAQ local</h2>
        <FaqAccordion items={localFaqs} />
      </div>
      <Link
        href={contactHref}
        className="mt-10 inline-flex h-12 items-center bg-ink px-6 text-sm font-semibold text-paper"
      >
        Solicitar presupuesto en {area.name}
      </Link>
      </section>
    </>
  );
}
