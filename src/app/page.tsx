import Link from "next/link";
import { MessageCircle, MoveUpRight } from "lucide-react";
import { BeforeAfter } from "@/components/before-after";
import { ArqviaArchitecturalHero } from "@/components/hero/arqvia-architectural-hero";
import { JsonLd } from "@/components/json-ld";
import { ProjectStart } from "@/components/project-start";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ServiceStudio } from "@/components/service-studio";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getPublicAreas } from "@/lib/area-data";
import { getClientConfig } from "@/lib/client-config";
import { getHomeContent } from "@/lib/home-data";
import { getPublicProjects } from "@/lib/project-data";
import { buildPageMetadata } from "@/lib/seo";
import { getPublicServices } from "@/lib/service-data";
import { getPublicTestimonials } from "@/lib/testimonial-data";
import { siteConfig } from "@/lib/site-config";
import { absoluteUrl, buildWhatsAppUrl } from "@/lib/utils";
import "@/components/arqvia-public-refresh.css";

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
    publicServices,
    publicTestimonials,
    publicAreas,
    todasLasObras,
  ] =
    await Promise.all([
      getClientConfig(),
      getHomeContent(),
      getPublicServices(),
      getPublicTestimonials(),
      getPublicAreas(),
      // El índice de portada muestra el rango completo del estudio, no la
      // selección destacada: dejar afuera la obra comercial hacía que la
      // primera pantalla contara menos de lo que el estudio hace.
      getPublicProjects(),
    ]);
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

      <nav aria-label="Explorar esta página" className="arqvia-section-nav">
        <Link href="/proyectos">Ver proyectos</Link>
        <a href="#home-before-after">Antes y después</a>
        <Link href="/proceso">Cómo trabajamos</Link>
        <a href="#tu-proyecto">Pensar mi proyecto</a>
      </nav>

      <ServiceStudio services={featuredServices}
        title={homeContent.servicesTitle === "Diseñamos, construimos y transformamos espacios." ? "Qué necesitás resolver en tu espacio." : homeContent.servicesTitle}
        description={homeContent.servicesDescription === "Podemos resolver una etapa puntual o acompañar el proyecto completo." ? "Distribución, materiales o una obra completa. Elegí un servicio para conocer qué incluye antes de consultar." : homeContent.servicesDescription}
      />

      <section
        id="home-before-after"
        aria-label="Caso antes y después"
        className="bg-mist px-5 py-14 md:px-8 md:py-16"
      >
        <div className="mx-auto max-w-7xl">
            <BeforeAfter
              compact
              compactDescription={homeContent.beforeAfterDescription === "Comparamos el mismo baño desde un encuadre equivalente para mostrar cómo cambian los materiales, la iluminación y el uso cotidiano." ? "La mampara deja pasar la luz, el mueble suspendido libera el piso y los revestimientos claros unifican el ambiente. Deslizá para comparar." : homeContent.beforeAfterDescription}
              compactTitle={homeContent.beforeAfterTitle === "El mismo espacio, antes y después." ? "Lo que cambia al repensar un baño." : homeContent.beforeAfterTitle}
            />
            <p className="arqvia-study-note">Estudio visual de remodelación · Imágenes de referencia</p>
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

      <ProjectStart areas={publicAreas.map((area) => area.name)} />

      <section id="home-contact" className="arqvia-coverage" aria-label="Zona de trabajo y contacto">
        <div><span className="arqvia-overline">Córdoba y alrededores</span><p>{publicAreas.map((area) => area.name).join(" · ")}</p></div>
        <TrackedAnchor href={whatsappUrl} eventName="whatsapp_click" eventParams={{ source: "home_final_cta" }} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-ink"><MessageCircle size={17} aria-hidden="true" /> Consultar por WhatsApp</TrackedAnchor>
      </section>
    </>
  );
}
