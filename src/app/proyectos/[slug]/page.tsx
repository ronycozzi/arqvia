import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";
import { BeforeAfter } from "@/components/before-after";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { JsonLd } from "@/components/json-ld";
import { ProjectCard } from "@/components/project-card";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { getContentRedirectDestination } from "@/lib/content-redirects";
import {
  getPublicProject,
  getRelatedPublicProjects,
} from "@/lib/project-data";
import { siteConfig } from "@/lib/site-config";
import { absoluteUrl, buildContactHref, buildWhatsAppUrl, metadataTitle } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [config, project] = await Promise.all([
    getClientConfig(),
    getPublicProject(slug),
  ]);
  if (!project) {
    const destination = await getContentRedirectDestination(
      `/proyectos/${slug}`,
      "PROJECT",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }
  const resolvedTitle = metadataTitle(project.seoTitle, config.companyName);
  const socialTitle = resolvedTitle.absolute;

  return {
    title: resolvedTitle,
    description: project.seoDescription,
    alternates: {
      canonical: `/proyectos/${project.slug}`,
    },
    openGraph: {
      title: socialTitle,
      description: project.seoDescription,
      url: `/proyectos/${project.slug}`,
      locale: "es_AR",
      siteName: config.companyName,
      images: [{ url: project.coverImage, alt: project.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: project.seoDescription,
      images: [project.coverImage],
    },
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [config, project] = await Promise.all([
    getClientConfig(),
    getPublicProject(slug),
  ]);
  if (!project) {
    const destination = await getContentRedirectDestination(
      `/proyectos/${slug}`,
      "PROJECT",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }

  const related = await getRelatedPublicProjects(project.slug);
  const projectFacts: Array<[string, string | number]> = [
    ["Ubicación", project.location],
    ["Año", project.year],
    ["Superficie", `${project.areaM2} m²`],
    ["Estado", project.status],
    ["Cliente", project.clientType],
    ["Servicio", project.servicePerformed],
    ["Sistema", project.constructionSystem],
    ["Duración", project.duration],
    ["Equipo", project.responsibleTeam],
    ...(project.budgetRange
      ? ([["Inversión", project.budgetRange]] as Array<[string, string]>)
      : []),
  ];
  const whatsapp = buildWhatsAppUrl(
    `Hola, vi el proyecto ${project.title} de ${config.companyName} y quiero consultar por una obra similar.`,
    config.whatsapp,
  );
  const contactHref = buildContactHref(`/proyectos/${project.slug}`);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Project",
          name: project.title,
          description: project.description,
          url: `${siteConfig.url}/proyectos/${project.slug}`,
          image: (project.gallery.length ? project.gallery : [project.coverImage]).map(
            (image) => absoluteUrl(image, siteConfig.url),
          ),
          location: project.location,
          creator: {
            "@type": "Organization",
            name: config.companyName,
            url: siteConfig.url,
          },
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
              name: "Proyectos",
              item: `${siteConfig.url}/proyectos`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: project.title,
              item: `${siteConfig.url}/proyectos/${project.slug}`,
            },
          ],
        }}
      />
      <section className="relative min-h-[72vh] overflow-hidden bg-ink text-paper">
        <Image
          src={project.coverImage}
          alt={project.imageAlt}
          fill
          preload
          sizes="100vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-transparent" />
        <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-end px-5 py-14 md:px-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-bronze-light">
            {project.category} · {project.location}
          </p>
          <h1 className="max-w-4xl font-serif text-4xl leading-[1.02] sm:text-5xl md:text-6xl lg:text-7xl lg:leading-none">
            {project.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-paper/75">
            {project.summary}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="premium-card h-fit p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-3xl text-ink">Ficha del proyecto</h2>
          <dl className="mt-6 grid gap-4 text-sm">
            {projectFacts.map(([label, value]) => (
              <div key={label} className="border-b border-ink/10 pb-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-ink/75">
                  {label}
                </dt>
                <dd className="mt-1 font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <TrackedAnchor
            href={whatsapp}
            eventName="whatsapp_click"
            eventParams={{ source: "project_sidebar", project: project.slug }}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-olive px-5 text-sm font-semibold text-paper transition hover:bg-bronze"
          >
            <MessageCircle className="size-4" />
            Quiero un proyecto similar
          </TrackedAnchor>
        </aside>

        <div className="space-y-14">
          <section>
            <h2 className="mb-6 font-serif text-4xl text-ink">Galería</h2>
            <GalleryLightbox
              images={project.galleryImages || project.gallery}
              title={project.title}
            />
          </section>

          <Narrative title="El desafío" text={project.challenge} />
          <Narrative title="La solución" text={project.solution} />
          <Narrative title="Cómo se ejecutó" text={project.process} />
          <Narrative title="Resultado final" text={project.result} />

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Materiales", project.materials],
              ["Qué se optimizó", project.optimized],
              ["Qué lo hizo especial", project.specialNote],
            ].map(([title, text]) => (
              <div key={title} className="premium-card p-5">
                <h2 className="font-serif text-2xl text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-ink/75">{text}</p>
              </div>
            ))}
          </div>

          {project.beforeAfter ? (
            <BeforeAfter comparison={project.beforeAfter} />
          ) : null}

          {project.testimonial ? (
            <figure className="premium-card border-l-4 border-bronze bg-mist p-6">
              <blockquote className="font-serif text-3xl leading-10 text-ink">
                “{project.testimonial}”
              </blockquote>
              <figcaption className="mt-4 text-sm text-ink/75">
                Cliente de {project.category} · {project.location}
              </figcaption>
            </figure>
          ) : null}

          <div className="premium-card-dark p-8 text-paper">
            <h2 className="font-serif text-4xl">¿Querés una obra como esta?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-paper/78">
              Si estás pensando en una obra similar, podemos ayudarte a evaluar
              terreno, superficie, etapas, materiales y próximos pasos.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <TrackedAnchor
                href={whatsapp}
                eventName="whatsapp_click"
                eventParams={{ source: "project_final_cta", project: project.slug }}
                className="inline-flex h-12 items-center justify-center bg-bronze px-6 text-sm font-semibold text-paper"
              >
                Consultar por una obra como esta
              </TrackedAnchor>
              <Link
                href={contactHref}
                className="inline-flex h-12 items-center justify-center gap-2 border border-paper/20 px-6 text-sm font-semibold text-paper"
              >
                Pedir presupuesto <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-mist py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <h2 className="font-serif text-4xl text-ink">Proyectos relacionados</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {related.map((item) => (
              <ProjectCard key={item.slug} project={item} />
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}

function Narrative({ title, text }: { title: string; text: string }) {
  return (
    <section className="max-w-3xl">
      <h2 className="font-serif text-4xl text-ink">{title}</h2>
      <p className="mt-4 text-lg leading-9 text-ink/75">{text}</p>
    </section>
  );
}
