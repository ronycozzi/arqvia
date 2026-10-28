import Image from "@/components/app-image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { PublicProject } from "@/types/project";
import styles from "./arqvia-cards.module.css";

export function ProjectCard({ priority = false, project, imageSizes = "(min-width: 1280px) 292px, (min-width: 1024px) calc(33vw - 32px), (min-width: 768px) calc(50vw - 32px), calc(100vw - 40px)" }: { priority?: boolean; project: PublicProject; imageSizes?: string }) {
  return (
    <article className={styles.project}>
      <Link href={`/proyectos/${project.slug}`} className={styles.projectLink}>
        <div className={styles.projectMedia}>
          <Image
            src={project.coverImage}
            alt={project.imageAlt}
            fill
            quality={88}
            loading={priority ? "eager" : "lazy"}
            sizes={imageSizes}
            className={styles.image}
          />
          <span className={styles.projectCategory}>{project.category}</span>
          <span className={styles.projectExplore} aria-hidden="true"><ArrowUpRight size={21} strokeWidth={1.5} /></span>
          {project.materials ? <span className={styles.projectMaterial}>{project.materials}</span> : null}
        </div>
        <div className={styles.projectBody}>
          <p className={styles.location}><MapPin size={13} aria-hidden="true" />{project.location}</p>
          <h3 className={`font-serif ${styles.projectTitle}`}><span className="sr-only">Ver proyecto: </span>{project.title}</h3>
          <p className={styles.description}>{project.summary}</p>
          <dl className={styles.projectFacts}>
            {project.areaM2 > 0 ? <div><dt>Superficie</dt><dd>{project.areaM2} <span>m²</span></dd></div> : null}
            {project.year ? <div><dt>Año</dt><dd>{project.year}</dd></div> : null}
            {project.status ? <div className={styles.statusFact}><dt>Estado</dt><dd>{project.status}</dd></div> : null}
          </dl>
        </div>
      </Link>
    </article>
  );
}
