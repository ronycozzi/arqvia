import type { Metadata } from "next";
import Image from "@/components/app-image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { ProjectDossier } from "@/components/project-dossier";
import styles from "@/components/arqvia-dossier.module.css";
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
    ...(project.areaM2 > 0 ? [["Superficie", `${project.areaM2} m²`] as [string, string]] : []),
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
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <Link href="/proyectos"><ArrowLeft size={14} className="inline" aria-hidden="true" /> Todos los proyectos</Link>
          <span aria-hidden="true">/</span><span>{project.category}</span>
        </nav>
        <section className={styles.overview} aria-label="Resumen del proyecto">
          <div className={styles.cover}>
            <Image src={project.coverImage} alt={project.imageAlt} fill preload quality={88} sizes="(min-width: 1280px) 610px, (min-width: 641px) 50vw, 100vw" />
            {project.status ? <span className={styles.coverLabel}>{project.status}</span> : null}
          </div>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>{project.category} · {project.location}</p>
            <h1>{project.title}</h1>
            <p className={styles.summary}>{project.summary}</p>
            <div className={styles.factTitle}><h2>Ficha del proyecto</h2><span>{project.category}</span></div>
            <dl className={styles.facts}>
              {projectFacts.filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <div className={styles.actions}>
              <Link href={contactHref} className={styles.primary}>Pensar un proyecto similar <ArrowRight size={15} aria-hidden="true" /></Link>
              <a href="#proyecto-galeria" className={styles.secondary}>Ver imágenes</a>
            </div>
          </div>
        </section>
        <ProjectDossier sections={[
          { title: "El desafío", text: project.challenge },
          { title: "La solución", text: project.solution },
          { title: "La ejecución", text: project.process },
          { title: "El resultado", text: project.result },
        ]} />
        <div className={styles.detailGrid}>
          {[["Materiales", project.materials], ["Distribución y uso", project.optimized], ["Decisiones de diseño", project.specialNote]].filter(([, text]) => Boolean(text)).map(([title, text]) => <div key={title}><h3>{title}</h3><p>{text}</p></div>)}
        </div>
        <section id="proyecto-galeria" className={`${styles.section} ${styles.gallery}`}>
          <div className={styles.sectionHead}><h2>El proyecto, en detalle</h2><p>Tocá una imagen para ampliarla.</p></div>
          <GalleryLightbox images={project.galleryImages || project.gallery} title={project.title} />
        </section>
        {project.beforeAfter ? <section className={styles.section} aria-label="Transformación del espacio"><BeforeAfter comparison={project.beforeAfter} /></section> : null}
        {project.testimonial ? <figure className={styles.callout}><blockquote className="max-w-3xl text-base leading-8">“{project.testimonial}”</blockquote><figcaption className="text-xs">Cliente de {project.category} · {project.location}</figcaption></figure> : null}
        <section className={styles.callout}>
          <div><h2>Conversemos sobre tu espacio.</h2><p>Podés compartir ubicación, ideas o planos. Revisamos el punto de partida antes de definir el alcance.</p></div>
          <TrackedAnchor href={whatsapp} eventName="whatsapp_click" eventParams={{ source: "project_final_cta", project: project.slug }} className={styles.primary}>Consultar por esta obra <ArrowRight size={15} aria-hidden="true" /></TrackedAnchor>
        </section>
        {related.length ? <section className={styles.section}>
          <div className={styles.sectionHead}><h2>Otros proyectos del estudio</h2><Link href="/proyectos" className="text-xs underline underline-offset-4">Ver todos</Link></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ProjectCard key={item.slug} project={item} />)}</div>
        </section> : null}
      </div>
    </article>
  );
}
