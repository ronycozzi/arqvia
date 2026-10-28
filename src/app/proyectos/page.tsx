import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import styles from "@/components/arqvia-dossier.module.css";
import { ProjectFilters } from "@/components/project-filters";
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
    <div className={styles.shell}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Proyectos / Córdoba</p><h1>Casas, interiores y espacios de trabajo.</h1></div>
        <p>Recorré los proyectos por uso. En cada ficha podés consultar la distribución, los materiales y el alcance de la intervención.</p>
      </header>
      <ProjectFilters active={active} categories={projectCategories} />
      {visibleProjects.length ? <section className={styles.projects} aria-label="Listado de proyectos">
        {visibleProjects.map((project, index) => <Link href={`/proyectos/${project.slug}`} key={project.slug} className={styles.projectLink}>
          <div className={styles.projectImage}><Image src={project.coverImage} alt={project.imageAlt} fill quality={88} loading={index === 0 ? "eager" : "lazy"} sizes="(min-width: 1280px) 600px, (min-width: 641px) 50vw, 100vw" /></div>
          <div className={styles.projectInfo}><div><p>{project.category} · {project.location}</p><h2>{project.title}</h2></div><ArrowUpRight size={20} aria-hidden="true" /></div>
          <div className={styles.projectCaption}><p>{project.summary}</p><dl>{project.areaM2 > 0 ? <div><dt>Superficie</dt><dd>{project.areaM2} m²</dd></div> : null}{project.year ? <div><dt>Año</dt><dd>{project.year}</dd></div> : null}</dl></div>
        </Link>)}
      </section> : <section className={styles.callout}><div><h2>No hay proyectos en esta selección.</h2><p>Podés explorar otra categoría o contarnos qué tipo de espacio querés resolver.</p></div><Link href="/proyectos" className={styles.secondary}>Ver todos los proyectos</Link></section>}
      <section className={styles.callout}>
        <div><h2>¿Tenés un espacio en mente?</h2><p>Compartí la ubicación y lo que necesitás cambiar. Si ya tenés planos o medidas, podés sumarlos a la consulta.</p></div>
        <div className={styles.actions}><Link href={contactHref} className={styles.primary}>Contar mi proyecto</Link><TrackedAnchor href={buildWhatsAppUrl(`Hola, vi los proyectos de ${config.companyName} y quiero consultar por una obra similar.`, config.whatsapp)} eventName="whatsapp_click" eventParams={{ source: "projects_final_cta" }} className={styles.secondary}>WhatsApp</TrackedAnchor></div>
      </section>
    </div>
  );
}
