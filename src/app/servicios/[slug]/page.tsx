import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import styles from "@/components/arqvia-dossier.module.css";
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
  const resolvedTitle = metadataTitle(service.seoTitle, config.companyName);
  const socialTitle = resolvedTitle.absolute;

  return {
    title: resolvedTitle,
    description: service.seoDescription,
    alternates: {
      canonical: `/servicios/${service.slug}`,
    },
    openGraph: {
      title: socialTitle,
      description: service.seoDescription,
      url: `/servicios/${service.slug}`,
      locale: "es_AR",
      siteName: config.companyName,
      images: [{ url: service.coverImage, alt: service.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
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
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación"><Link href="/servicios"><ArrowLeft size={14} className="inline" aria-hidden="true" /> Todos los servicios</Link><span aria-hidden="true">/</span><span>{service.categoryName}</span></nav>
        <section className={styles.serviceOverview}>
          <div>
            <p className={styles.eyebrow}>{service.categoryName}</p>
            <h1>{service.title}</h1>
            <p className={styles.summary}>{service.description}</p>
            <div className={styles.actions}><a href="#consulta-servicio" className={styles.primary}>Consultar por este servicio <ArrowRight size={15} aria-hidden="true" /></a><TrackedAnchor href={buildWhatsAppUrl(service.whatsappMessage, config.whatsapp)} eventName="whatsapp_click" eventParams={{ source: "service_detail", service: service.slug }} className={styles.secondary}>WhatsApp</TrackedAnchor></div>
            <div className={styles.serviceVisual}><Image src={service.coverImage} alt={`Imagen del servicio ${service.title}`} fill preload quality={88} sizes="(min-width:1280px) 600px, (min-width:641px) 50vw, 100vw" /></div>
          </div>
          <aside className={styles.scope}>
            <p className={styles.scopeLabel}>Alcance del servicio</p><h2>Qué podemos resolver</h2><p>{service.mainBenefit}</p>
            <h3 className="text-xs font-semibold">Qué incluye</h3>
            <ul className={styles.checklist}>{service.included.map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul>
            {service.audience ? <div className="mt-5 border-t border-ink/15 pt-4"><h3 className="text-xs font-semibold">Para quién es</h3><p className="mt-2 text-xs leading-6 text-ink/70">{service.audience}</p></div> : null}
          </aside>
        </section>
        <section className={`${styles.section} ${styles.serviceDetails}`}>
          <div><h2>Cómo lo abordamos</h2><ul className={styles.steps}>{service.process.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><h2>Qué buscamos mejorar</h2><ul className={styles.checklist}>{service.benefits.map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul></div>
        </section>
        {service.faq.length ? <section className={styles.section}><div className={styles.sectionHead}><h2>Antes de empezar</h2><p>Alcance, decisiones y dudas frecuentes.</p></div><FaqAccordion items={service.faq} /></section> : null}
        {relatedProjects.length ? <section className={styles.section}><div className={styles.sectionHead}><h2>Este servicio, en proyectos</h2><Link href="/proyectos" className="text-xs underline underline-offset-4">Ver todos los proyectos</Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{relatedProjects.map((project) => <ProjectCard key={project.slug} project={project} />)}</div></section> : null}
        <section id="consulta-servicio" className={`${styles.section} ${styles.quote}`}>
          <div><p className={styles.eyebrow}>Hablemos de tu proyecto</p><h2>Contanos qué necesitás resolver.</h2><p>Ubicación, etapa actual y una idea del espacio. Esa información nos ayuda a orientarte y preparar una propuesta acorde.</p><Link href={contactHref} className={`${styles.secondary} mt-5`}>Abrir formulario completo</Link></div>
          <QuoteForm sourcePage={`/servicios/${service.slug}`} compact />
        </section>
      </div>
    </article>
  );
}
