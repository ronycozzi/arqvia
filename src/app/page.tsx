import Link from "next/link";
import { CheckCircle2, MessageCircle, MoveUpRight } from "lucide-react";
import { BeforeAfter } from "@/components/before-after";
import { ArqviaArchitecturalHero } from "@/components/hero/arqvia-architectural-hero";
import { JsonLd } from "@/components/json-ld";
import { MetricCounter } from "@/components/metric-counter";
import { ProjectCard } from "@/components/project-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "@/components/section-heading";
import { ServiceCard } from "@/components/service-card";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getPublicAreas } from "@/lib/area-data";
import { getClientConfig } from "@/lib/client-config";
import { getHomeContent } from "@/lib/home-data";
import { getFeaturedPublicProjects, getPublicProjects } from "@/lib/project-data";
import { buildPageMetadata } from "@/lib/seo";
import { getPublicServices } from "@/lib/service-data";
import { getPublicTestimonials } from "@/lib/testimonial-data";
import { siteConfig } from "@/lib/site-config";
import { absoluteUrl, buildWhatsAppUrl } from "@/lib/utils";

export async function generateMetadata() {
  const [config, homeContent] = await Promise.all([
    getClientConfig(),
    getHomeContent(),
  ]);
  return buildPageMetadata(
    {
      title: homeContent.seoTitle,
      description: homeContent.seoDescription,
      canonical: "/",
    },
    config,
  );
}

const schemaDays = [
  { name: "lunes", value: "https://schema.org/Monday" },
  { name: "martes", value: "https://schema.org/Tuesday" },
  { name: "miercoles", value: "https://schema.org/Wednesday" },
  { name: "jueves", value: "https://schema.org/Thursday" },
  { name: "viernes", value: "https://schema.org/Friday" },
  { name: "sabado", value: "https://schema.org/Saturday" },
  { name: "domingo", value: "https://schema.org/Sunday" },
] as const;

function normalizeSchedule(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSchemaTime(hours: string, minutes = "00") {
  const numericHours = Number(hours);
  const numericMinutes = Number(minutes);

  if (
    !Number.isInteger(numericHours) ||
    !Number.isInteger(numericMinutes) ||
    numericHours < 0 ||
    numericHours > 23 ||
    numericMinutes < 0 ||
    numericMinutes > 59
  ) {
    return null;
  }

  return `${String(numericHours).padStart(2, "0")}:${String(numericMinutes).padStart(2, "0")}`;
}

function parseOpeningHoursSchedule(value: string) {
  const dayPattern = "(lunes|martes|miercoles|jueves|viernes|sabado|domingo)";
  const match = normalizeSchedule(value).match(
    new RegExp(
      `^${dayPattern}(?:\\s+a\\s+${dayPattern})?,?\\s*(?:de\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(?:a|-)\\s*(\\d{1,2})(?::(\\d{2}))?$`,
    ),
  );

  if (!match) return null;

  const startIndex = schemaDays.findIndex((day) => day.name === match[1]);
  const endIndex = schemaDays.findIndex(
    (day) => day.name === (match[2] || match[1]),
  );
  const opens = formatSchemaTime(match[3], match[4]);
  const closes = formatSchemaTime(match[5], match[6]);

  if (startIndex < 0 || endIndex < startIndex || !opens || !closes) return null;

  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: schemaDays.slice(startIndex, endIndex + 1).map((day) => day.value),
    opens,
    closes,
  };
}

function parseOpeningHours(value: string) {
  const specifications = value
    .split(";")
    .map((schedule) => schedule.trim())
    .filter(Boolean)
    .map(parseOpeningHoursSchedule);

  if (!specifications.length || specifications.some((item) => !item)) {
    return undefined;
  }

  return specifications;
}

function getStreetAddress(value: string) {
  const address = value.trim();
  const firstPart = normalizeSchedule(address.split(",")[0] || "")
    .replace(/\b\d{4,5}\b/g, "")
    .trim();
  const localityNames = [
    normalizeSchedule(siteConfig.city),
    normalizeSchedule(`${siteConfig.city} Capital`),
  ];

  if (!address || localityNames.includes(firstPart)) return undefined;

  return /\d/.test(address) ? address : undefined;
}

export default async function Home() {
  const [
    config,
    homeContent,
    publicProjects,
    publicServices,
    publicTestimonials,
    publicAreas,
    todasLasObras,
  ] =
    await Promise.all([
      getClientConfig(),
      getHomeContent(),
      getFeaturedPublicProjects(3),
      getPublicServices(),
      getPublicTestimonials(),
      getPublicAreas(),
      // El índice de portada muestra el rango completo del estudio, no la
      // selección destacada: dejar afuera la obra comercial hacía que la
      // primera pantalla contara menos de lo que el estudio hace.
      getPublicProjects(),
    ]);
  const featuredProjects = publicProjects;
  const featuredServices = (
    publicServices.some((service) => service.featured)
      ? publicServices.filter((service) => service.featured)
      : publicServices
  ).slice(0, 3);
  const testimonial = publicTestimonials[0];
  const streetAddress = getStreetAddress(config.address);
  const openingHoursSpecification = parseOpeningHours(config.businessHours);
  const whatsappUrl = buildWhatsAppUrl(
    siteConfig.whatsappMessage,
    config.whatsapp,
  );

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
          name: config.companyName,
          description: homeContent.seoDescription,
          image: absoluteUrl(config.heroImage, siteConfig.url),
          logo: config.logoUrl
            ? absoluteUrl(config.logoUrl, siteConfig.url)
            : undefined,
          areaServed: publicAreas.map((area) => ({
            "@type": "AdministrativeArea",
            name: area.name,
          })),
          address: {
            "@type": "PostalAddress",
            streetAddress,
            addressLocality: siteConfig.city,
            addressRegion: "Córdoba",
            addressCountry: siteConfig.country,
          },
          telephone: config.phone,
          email: config.email,
          openingHoursSpecification,
          sameAs: [
            config.instagramUrl,
            config.linkedinUrl,
            config.facebookUrl,
          ].filter(Boolean),
          url: siteConfig.url,
        }}
      />

      <ArqviaArchitecturalHero
        config={config}
        eyebrow={homeContent.heroEyebrow}
        imageAlt={homeContent.heroImageAlt}
        trustItems={homeContent.heroTrustItems}
        projects={todasLasObras}
      />

      <section
        aria-label="Indicadores de experiencia"
        className="border-y border-paper/10 bg-graphite-soft text-paper"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-paper/10 px-5 md:grid-cols-4 md:px-8">
          {homeContent.trustMetrics.map((metric, index) => (
            <ScrollReveal
              key={metric.label}
              delay={index * 60}
              className="bg-graphite-soft py-6 md:px-6 md:py-8"
            >
              <p className="font-serif text-3xl tabular-nums text-bronze-light md:text-4xl">
                <MetricCounter value={metric.value} delay={index * 55} />
              </p>
              <p className="mt-1 text-xs font-semibold text-paper/78 md:text-sm">
                {metric.label}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section
        id="home-projects"
        aria-labelledby="home-projects-title"
        className="architectural-grid bg-graphite py-14 text-paper md:py-16"
      >
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <ScrollReveal variant="left" className="mb-9">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-bronze-light">
                  Proyectos
                </p>
                <h2 id="home-projects-title" className="font-serif text-4xl leading-tight md:text-5xl">
                  {homeContent.projectsTitle}
                </h2>
              </div>
              <Link
                href="/proyectos"
                className="architectural-link inline-flex items-center gap-2 text-sm font-semibold text-bronze-light"
              >
                Ver todos los proyectos <MoveUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
          <div className="grid items-stretch gap-5 lg:grid-cols-3">
            {featuredProjects.map((project, index) => (
              <ScrollReveal
                key={project.slug}
                delay={index * 80}
                variant="media"
                className="h-full [&_article]:bg-paper"
              >
                <ProjectCard project={project} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="home-services"
        aria-label="Servicios destacados"
        className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16"
      >
        <ScrollReveal variant="right" className="mb-9">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Servicios"
              title={homeContent.servicesTitle}
              description={homeContent.servicesDescription}
            />
            <Link
              href="/servicios"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
            >
              Ver servicios <MoveUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </ScrollReveal>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featuredServices.map((service, index) => (
            <ScrollReveal key={service.slug} delay={index * 70}>
              <ServiceCard service={service} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section
        id="home-before-after"
        aria-label="Caso antes y después"
        className="bg-mist px-5 py-14 md:px-8 md:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <ScrollReveal variant="media">
            <BeforeAfter
              compact
              compactDescription={homeContent.beforeAfterDescription}
              compactTitle={homeContent.beforeAfterTitle}
            />
          </ScrollReveal>
        </div>
      </section>

      <section
        id="home-process"
        aria-labelledby="home-process-title"
        className="bg-ink py-14 text-paper md:py-16"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-[0.82fr_1.18fr]">
          <ScrollReveal variant="left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze-light">
                Cómo trabajamos
              </p>
              <h2 id="home-process-title" className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
                {homeContent.processTitle}
              </h2>
              <div className="mt-7 grid gap-3">
                {homeContent.processReasons.map((reason) => (
                  <p
                    key={reason}
                    className="flex items-center gap-3 text-sm font-semibold text-paper/78"
                  >
                    <CheckCircle2
                      className="size-4 shrink-0 text-bronze-light"
                      aria-hidden="true"
                    />
                    {reason}
                  </p>
                ))}
              </div>
              <Link
                href="/proceso"
                className="architectural-link mt-8 inline-flex text-sm font-semibold text-bronze-light"
              >
                Ver cómo trabajamos
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal
            variant="scale"
            className="process-grid grid gap-px border border-paper/10 bg-paper/10 sm:grid-cols-2"
          >
            {homeContent.processSteps.map((step, index) => (
              <article
                key={step.title}
                className="process-step h-full bg-graphite-soft p-5 md:p-6"
              >
                <p className="font-serif text-3xl text-bronze-light">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-5 font-serif text-2xl text-paper">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-paper/68">
                  {step.description}
                </p>
              </article>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {testimonial ? (
        <section
          aria-label="Experiencia de cliente"
          className="border-b border-ink/10 bg-paper px-5 py-12 md:px-8 md:py-14"
        >
          <ScrollReveal variant="scale" className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
              Experiencia de cliente
            </p>
            <blockquote className="mt-4 font-serif text-3xl leading-tight text-ink md:text-4xl">
              “{testimonial.quote}”
            </blockquote>
            <p className="mt-5 text-sm font-semibold text-ink/65">
              {testimonial.name} · {testimonial.projectType} · {testimonial.location}
            </p>
            <Link
              href="/proyectos"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-bronze underline-offset-4 transition hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
            >
              Ver obras similares <MoveUpRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </ScrollReveal>
        </section>
      ) : null}

      <section
        id="home-contact"
        aria-labelledby="home-contact-title"
        className="mx-auto grid max-w-7xl gap-9 px-5 py-14 md:px-8 md:py-16 lg:grid-cols-[1fr_auto] lg:items-center"
      >
        <ScrollReveal variant="left">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
              Empecemos
            </p>
            <h2 id="home-contact-title" className="mt-3 font-serif text-4xl leading-tight text-ink md:text-5xl">
              {homeContent.finalCtaTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/72">
              {homeContent.finalCtaDescription}
            </p>
            <p className="mt-4 text-sm text-ink/68">
              Trabajamos en {publicAreas.map((area) => area.name).join(", ")}.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={90} variant="right">
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/contacto?origen=%2F"
              className="inline-flex min-h-14 items-center justify-center bg-ink px-7 text-sm font-semibold text-paper transition hover:bg-bronze"
            >
              Solicitar presupuesto
            </Link>
            <TrackedAnchor
              href={whatsappUrl}
              eventName="whatsapp_click"
              eventParams={{ source: "home_final_cta" }}
              className="inline-flex min-h-14 items-center justify-center gap-2 border border-ink/15 px-7 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Escribir por WhatsApp
            </TrackedAnchor>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
