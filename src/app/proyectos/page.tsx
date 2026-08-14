import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { getPublicProjects } from "@/lib/project-data";
import { createPageMetadata } from "@/lib/seo";
import { buildWhatsAppUrl } from "@/lib/utils";

export const generateMetadata = createPageMetadata({
  title: "Proyectos y obras",
  description:
    "Portfolio de proyectos de arquitectura, construcción, remodelaciones e interiorismo en Córdoba.",
  canonical: "/proyectos",
});

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const [config, projects] = await Promise.all([
    getClientConfig(),
    getPublicProjects(),
  ]);
  const projectCategories = [
    "Todos",
    ...Array.from(
      new Set(projects.map((project) => project.category.trim()).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right, "es")),
  ];
  const active = categoria || "Todos";
  const contactHref = "/contacto?origen=%2Fproyectos";
  const visibleProjects =
    active === "Todos"
      ? projects
      : projects.filter(
          (project) =>
            project.category === active ||
            project.status === active ||
            project.servicePerformed.toLowerCase().includes(active.toLowerCase()),
        );

  return (
    <div className="bg-background">
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <SectionHeading
          as="h1"
          eyebrow="Portfolio"
          title="Proyectos construidos para vivir, trabajar y crecer."
          description="Explorá viviendas, remodelaciones, interiores y espacios comerciales realizados en Córdoba."
        />
        <nav
          aria-label="Filtros de proyectos"
          className="mt-7 flex max-w-full snap-x gap-2 overflow-x-auto pb-3 md:flex-wrap md:overflow-visible"
        >
          {projectCategories.map((category) => (
            <Link
              key={category}
              href={
                category === "Todos"
                  ? "/proyectos"
                  : `/proyectos?${new URLSearchParams({ categoria: category }).toString()}`
              }
              className={`inline-flex min-h-11 shrink-0 snap-start items-center border px-4 py-2.5 text-sm font-semibold transition duration-300 ${
                active === category
                  ? "border-ink bg-ink text-paper shadow-premium"
                  : "border-ink/12 bg-paper text-ink hover:-translate-y-0.5 hover:border-bronze hover:bg-white"
              }`}
              aria-current={active === category ? "page" : undefined}
            >
              {category}
            </Link>
          ))}
        </nav>
        {visibleProjects.length ? (
          <section className="mt-10">
            <h2 className="sr-only">Listado de proyectos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProjects.map((project, index) => (
                <ProjectCard
                  key={project.slug}
                  priority={index < 3}
                  project={project}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="premium-card mt-10 p-10 text-center">
            <h2 className="font-serif text-3xl text-ink">
              No encontramos proyectos con esos filtros.
            </h2>
            <p className="mt-3 text-sm text-ink/75">
              Probá con otra categoría o contanos qué tipo de obra estás buscando.
            </p>
            <Link
              href={contactHref}
              className="mt-6 inline-flex h-11 items-center justify-center bg-ink px-5 text-sm font-semibold text-paper transition duration-300 hover:-translate-y-0.5 hover:bg-bronze"
            >
              Consultar por un proyecto similar
            </Link>
          </div>
        )}
        {visibleProjects.length ? (
          <section className="mt-12 bg-ink px-6 py-8 text-paper md:flex md:items-center md:justify-between md:gap-10 md:px-8" aria-labelledby="projects-contact-title">
            <div className="max-w-2xl">
              <h2 id="projects-contact-title" className="font-serif text-3xl md:text-4xl">
                ¿Querés evaluar un proyecto similar?
              </h2>
              <p className="mt-3 text-sm leading-7 text-paper/72">
                Contanos ubicación, tipo de obra y etapa actual. Te orientamos
                con el próximo paso.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0 md:shrink-0">
              <Link
                href={contactHref}
                className="inline-flex h-12 items-center justify-center bg-bronze px-6 text-sm font-semibold text-paper transition hover:bg-paper hover:text-ink"
              >
                Solicitar presupuesto para mi proyecto
              </Link>
              <TrackedAnchor
                href={buildWhatsAppUrl(
                  `Hola, vi los proyectos de ${config.companyName} y quiero consultar por una obra similar.`,
                  config.whatsapp,
                )}
                eventName="whatsapp_click"
                eventParams={{ source: "projects_final_cta" }}
                className="inline-flex h-12 items-center justify-center border border-paper/20 px-6 text-sm font-semibold text-paper transition hover:border-bronze-light hover:text-bronze-light"
              >
                Consultar por WhatsApp
              </TrackedAnchor>
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
