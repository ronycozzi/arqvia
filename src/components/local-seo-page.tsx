import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/json-ld";
import { getPublicAreas } from "@/lib/area-data";
import { getClientConfig } from "@/lib/client-config";
import {
  budgetScopeBlocks,
  clientStartingNeeds,
  deliverables,
  processSteps,
} from "@/lib/content";
import type { LocalSeoPage } from "@/lib/local-seo";
import { projectMatchesLocalService } from "@/lib/local-proof";
import { getPublicProjects } from "@/lib/project-data";
import { getPublicServices } from "@/lib/service-data";
import { siteConfig } from "@/lib/site-config";
import { buildContactHref } from "@/lib/utils";

export async function LocalSeoPage({ page }: { page: LocalSeoPage }) {
  const [config, services, projects, workAreas] = await Promise.all([
    getClientConfig(),
    getPublicServices(),
    getPublicProjects(),
    getPublicAreas(),
  ]);
  const relatedService = services.find((service) => service.title === page.service);
  const relatedProjects = projects
    .filter((project) =>
      projectMatchesLocalService({
        area: page.area,
        location: project.location,
        projectServiceSlug: project.serviceSlug,
        serviceSlug: relatedService?.slug || null,
      }),
    )
    .slice(0, 3);
  const fallbackProjects = relatedProjects;
  const intent = getLocalIntent(page);
  const contactHref = buildContactHref(`/${page.slug}`);
  const publicAreaServed = [{
    "@type": "AdministrativeArea",
    name: page.area,
  }];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: page.service,
          description: page.description,
          provider: {
            "@type": "HomeAndConstructionBusiness",
            name: config.companyName,
            url: siteConfig.url,
            areaServed: publicAreaServed.length ? publicAreaServed : undefined,
          },
          serviceType: page.service,
          areaServed: publicAreaServed.length ? publicAreaServed : undefined,
          url: `${siteConfig.url}/${page.slug}`,
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
              name: page.title,
              item: `${siteConfig.url}/${page.slug}`,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: intent.faq.map((item) => ({
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
          Córdoba, Argentina
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight text-ink md:text-7xl">
          {page.title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/75">
          {page.description}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={contactHref}
            data-testid="local-seo-primary-cta"
            className="inline-flex h-12 items-center justify-center bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze"
          >
            {page.cta}
          </Link>
          <Link
            href="/proyectos"
            className="inline-flex h-12 items-center justify-center border border-ink/15 px-6 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Ver proyectos
          </Link>
        </div>

        <section className="mt-12 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          {fallbackProjects[0] ? (
            <Link
              href={`/proyectos/${fallbackProjects[0].slug}`}
              className="group premium-card overflow-hidden bg-ink text-paper"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={fallbackProjects[0].coverImage}
                  alt={fallbackProjects[0].imageAlt}
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover opacity-90 transition duration-700 group-hover:scale-[1.035]"
                  preload
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light">
                    Caso relacionado
                  </p>
                  <h2 className="mt-2 font-serif text-3xl leading-tight md:text-5xl">
                    {fallbackProjects[0].title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-paper/78">
                    {fallbackProjects[0].summary}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="premium-card bg-mist p-6 lg:col-span-2">
              <p className="font-serif text-3xl text-ink">
                Referencias disponibles según ubicación y alcance.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70">
                Consultanos por antecedentes vinculados con {page.area}. No usamos
                proyectos de otra zona como evidencia local.
              </p>
            </div>
          )}
          <div className="grid gap-4">
            {fallbackProjects.slice(1, 3).map((project) => (
              <Link
                href={`/proyectos/${project.slug}`}
                key={project.slug}
                className="group premium-card grid grid-cols-[120px_1fr] overflow-hidden"
              >
                <div className="relative min-h-32 overflow-hidden">
                  <Image
                    src={project.coverImage}
                    alt={project.imageAlt}
                    fill
                    sizes="120px"
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                    {project.category}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ink/65">
                    {project.location} · {project.areaM2} m²
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-5 lg:grid-cols-3">
          <article className="premium-card p-6">
            <h2 className="font-serif text-3xl text-ink">
              Servicios relacionados
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              {page.service}, planificación, documentación, presupuesto,
              seguimiento técnico y acompañamiento según alcance.
            </p>
            {relatedService ? (
              <Link
                href={`/servicios/${relatedService.slug}`}
                className="architectural-link mt-5 inline-flex text-sm font-semibold text-bronze"
              >
                Ver servicio de {relatedService.title.toLowerCase()}
              </Link>
            ) : null}
          </article>
          <article className="premium-card p-6">
            <h2 className="font-serif text-3xl text-ink">Zonas cubiertas</h2>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              {workAreas.map((area) => area.name).join(", ")}.
            </p>
          </article>
          <article className="premium-card p-6">
            <h2 className="font-serif text-3xl text-ink">
              Evaluación inicial
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              Revisamos etapa actual, superficie, presupuesto inicial,
              documentación disponible y próximos pasos antes de avanzar.
            </p>
          </article>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
              Enfoque local
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink">
              {intent.title}
            </h2>
            <p className="mt-4 text-base leading-8 text-ink/75">
              {intent.description}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {intent.points.map((item) => (
              <article key={item} className="premium-card p-5">
                <h3 className="text-sm font-semibold leading-7 text-ink">
                  {item}
                </h3>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-4xl text-ink">
            Cómo ordenamos una consulta en esta zona
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {processSteps.slice(0, 4).map((step, index) => (
              <article key={step.title} className="premium-card bg-mist p-5">
                <p className="font-serif text-3xl text-bronze">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 font-serif text-2xl text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink/75">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="premium-card p-6">
            <h2 className="font-serif text-4xl text-ink">
              Información útil para pedir una evaluación
            </h2>
            <div className="mt-6 grid gap-2 text-sm leading-7 text-ink/75 sm:grid-cols-2">
              {clientStartingNeeds.map((item) => (
                <span key={item} className="border-b border-ink/10 pb-2">
                  {item}
                </span>
              ))}
            </div>
          </article>
          <article className="premium-card bg-mist p-6">
            <h2 className="font-serif text-4xl text-ink">
              Qué puede quedar documentado
            </h2>
            <div className="mt-6 grid gap-2 text-sm leading-7 text-ink/75 sm:grid-cols-2">
              {deliverables.slice(0, 8).map((item) => (
                <span key={item} className="border-b border-ink/10 pb-2">
                  {item}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-4xl text-ink">
            Presupuesto, alcance y variables
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {budgetScopeBlocks.map((block) => (
              <article key={block.title} className="premium-card p-5">
                <h3 className="font-serif text-2xl text-ink">{block.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink/75">
                  {block.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-4xl text-ink">Proyectos relacionados</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {fallbackProjects.map((project) => (
              <Link
                href={`/proyectos/${project.slug}`}
                key={project.slug}
                className="group premium-card overflow-hidden transition hover:border-bronze"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={project.coverImage}
                    alt={project.imageAlt}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-2xl text-ink">{project.title}</h3>
                  <p className="mt-2 text-sm text-ink/75">
                    {project.location} · {project.areaM2} m² · {project.year}
                  </p>
                </div>
              </Link>
            ))}
            {!fallbackProjects.length ? (
              <div className="border border-dashed border-ink/20 bg-mist p-6 md:col-span-3">
                <p className="text-sm leading-7 text-ink/70">
                  Los casos relacionados se publican cuando existe una obra verificable
                  para este servicio y esta ubicación.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-4xl text-ink">Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {intent.faq.map((item) => (
              <article key={item.question} className="premium-card p-5">
                <h3 className="font-serif text-2xl text-ink">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-ink/75">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="premium-card-dark mt-14 p-8 text-paper">
          <h2 className="font-serif text-4xl">
            ¿Querés evaluar un proyecto en esta zona?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-paper/78">
            Contanos ubicación, superficie aproximada, etapa actual y rango de
            inversión en USD. Con esa información podemos orientarte sobre
            alcance, entregables y próximos pasos.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={contactHref}
              data-testid="local-seo-final-cta"
              className="inline-flex h-12 items-center justify-center bg-bronze px-6 text-sm font-semibold text-paper"
            >
              {page.cta}
            </Link>
            <Link
              href="/proyectos"
              className="inline-flex h-12 items-center justify-center border border-paper/20 px-6 text-sm font-semibold text-paper"
            >
              Ver casos de estudio
            </Link>
          </div>
        </section>
      </section>
    </>
  );
}

function getLocalIntent(page: LocalSeoPage) {
  const slug = page.slug;

  if (slug.includes("cocinas")) {
    return {
      title: "Una cocina necesita diseño, instalaciones y decisiones cerradas antes de romper.",
      description:
        "La remodelación de una cocina combina uso diario, guardado, mesadas, instalaciones, iluminación, ventilación y materiales. Ordenar esas decisiones antes de iniciar evita compras apuradas y cambios caros.",
      points: [
        "Relevamiento del estado actual y puntos existentes.",
        "Distribución, guardado y superficie de trabajo.",
        "Definición de mesadas, revestimientos, griferías e iluminación.",
        "Coordinación de rubros húmedos, mobiliario y terminaciones.",
      ],
      faq: [
        {
          question: "¿Puedo enviar fotos antes de coordinar una visita?",
          answer:
            "Sí. Las fotos ayudan a entender estado actual, medidas aproximadas y tipo de intervención posible.",
        },
        {
          question: "¿Se puede remodelar sin cambiar toda la distribución?",
          answer:
            "Sí. Primero evaluamos qué conviene conservar, qué modificar y qué impacto tiene cada decisión en costo y tiempos.",
        },
      ],
    };
  }

  if (slug.includes("banos")) {
    return {
      title: "Un baño bien resuelto depende de instalaciones, pendientes, materiales y coordinación.",
      description:
        "Antes de cotizar una reforma de baño conviene revisar estado actual, cañerías, ventilación, revestimientos, artefactos, iluminación y nivel de terminación buscado.",
      points: [
        "Diagnóstico de instalaciones existentes.",
        "Selección de revestimientos, artefactos y griferías.",
        "Orden de obra para reducir demoras e interferencias.",
        "Revisión de terminaciones, sellados y mantenimiento.",
      ],
      faq: [
        {
          question: "¿Pueden orientar si no tengo medidas exactas?",
          answer:
            "Sí. Podemos iniciar con fotos, medidas aproximadas y luego confirmar con relevamiento si el alcance lo requiere.",
        },
        {
          question: "¿Qué define el costo de una reforma de baño?",
          answer:
            "Influyen instalaciones, estado actual, revestimientos, artefactos, mano de obra, tiempos y nivel de terminación.",
        },
      ],
    };
  }

  if (slug.includes("constructora") || slug.includes("llave-en-mano")) {
    return {
      title: "Construir requiere alcance, documentación, rubros y responsables claros.",
      description:
        "Una obra ordenada empieza antes del inicio físico: documentación, presupuesto por etapas, compras críticas, gremios, seguimiento y criterios para manejar cambios.",
      points: [
        "Definición de alcance y sistema constructivo.",
        "Presupuesto por rubros y etapas.",
        "Coordinación de materiales, gremios y tiempos.",
        "Seguimiento técnico y revisión de terminaciones.",
      ],
      faq: [
        {
          question: "¿Llave en mano significa que no debo tomar decisiones?",
          answer:
            "No. El equipo centraliza y ordena el proceso, pero el cliente participa en decisiones de alcance, materiales, presupuesto y prioridades.",
        },
        {
          question: "¿Se puede trabajar por etapas?",
          answer:
            "Sí. Cuando el proyecto lo permite, definimos qué se ejecuta primero y qué puede quedar preparado para una etapa futura.",
        },
      ],
    };
  }

  if (slug.includes("interior")) {
    return {
      title: "El interiorismo debe mejorar uso, atmósfera y coherencia material.",
      description:
        "Diseñar interiores no es solo elegir colores. Implica ordenar distribución, iluminación, materiales, mobiliario, circulación y forma real de vivir o trabajar.",
      points: [
        "Brief de uso, estilo y necesidades concretas.",
        "Layout, moodboard y criterios de materiales.",
        "Iluminación, mobiliario y compras asistidas según alcance.",
        "Acompañamiento para que la propuesta pueda ejecutarse.",
      ],
      faq: [
        {
          question: "¿Puedo contratar solo la propuesta de interiorismo?",
          answer:
            "Sí. También podemos acompañar compras, documentación o seguimiento de implementación según el caso.",
        },
        {
          question: "¿Ayudan a definir materiales?",
          answer:
            "Sí. Evaluamos uso diario, mantenimiento, presupuesto, disponibilidad y coherencia visual.",
        },
      ],
    };
  }

  return {
    title: "Antes de diseñar o remodelar, conviene ordenar posibilidades, límites y prioridades.",
    description:
      "Revisamos ubicación, superficie, documentación, presupuesto estimado y objetivos para definir qué servicio conviene contratar y qué pasos seguir.",
    points: [
      "Diagnóstico de etapa actual y documentación disponible.",
      "Criterios de diseño, materialidad y presupuesto.",
      "Entregables necesarios para presupuestar o ejecutar.",
      "Próximos pasos según tipo de proyecto y zona.",
    ],
    faq: [
      {
        question: "¿Puedo consultar si todavía no tengo planos?",
        answer:
          "Sí. Podemos ayudarte a ordenar idea, alcance, documentación necesaria y próximos pasos.",
      },
      {
        question: "¿Trabajan fuera de Córdoba Capital?",
        answer:
          "Sí. Trabajamos en Córdoba Capital, Zona Norte, Sierras Chicas y localidades cercanas según alcance.",
      },
    ],
  };
}
