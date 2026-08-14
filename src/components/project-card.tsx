import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Ruler } from "lucide-react";
import type { PublicProject } from "@/types/project";

export function ProjectCard({
  priority = false,
  project,
}: {
  priority?: boolean;
  project: PublicProject;
}) {
  return (
    <article className="group h-full border border-ink/12 bg-paper shadow-[0_10px_30px_rgba(28,33,29,0.06)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-bronze/45 hover:shadow-[0_18px_42px_rgba(28,33,29,0.1)] focus-within:-translate-y-1 focus-within:border-bronze/45 focus-within:shadow-[0_18px_42px_rgba(28,33,29,0.1)] motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        href={`/proyectos/${project.slug}`}
        aria-label={`Ver proyecto: ${project.title}`}
        className="flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bronze"
      >
        <div className="relative aspect-[3/2] overflow-hidden bg-stone">
          <Image
            src={project.coverImage}
            alt={project.imageAlt}
            fill
            preload={priority}
            loading={priority ? undefined : "lazy"}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035] group-focus-within:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
          />
          <div className="absolute left-3 top-3 border border-paper/15 bg-graphite/90 px-3 py-2 text-xs font-semibold uppercase leading-none text-paper backdrop-blur-sm md:left-4 md:top-4">
            {project.category}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="font-serif text-2xl font-medium leading-[1.12] text-ink md:text-[1.7rem]">
              {project.title}
            </h3>
            <ArrowUpRight
              className="mt-1 size-5 shrink-0 text-ink/40 transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bronze group-focus-within:-translate-y-0.5 group-focus-within:translate-x-0.5 group-focus-within:text-bronze motion-reduce:transform-none motion-reduce:transition-none"
              aria-hidden="true"
            />
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-ink/72">
            {project.summary}
          </p>
          <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-ink/10 pt-4 text-xs leading-5 text-ink/70">
            <div className="flex min-w-0 items-start gap-2">
              <dt className="sr-only">Ubicación</dt>
              <MapPin className="mt-0.5 size-4 shrink-0 text-bronze" aria-hidden="true" />
              <dd className="min-w-0 break-words">{project.location}</dd>
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <dt className="sr-only">Superficie</dt>
              <Ruler className="mt-0.5 size-4 shrink-0 text-bronze" aria-hidden="true" />
              <dd>{project.areaM2} m²</dd>
            </div>
            <div>
              <dt className="sr-only">Año</dt>
              <dd>{project.year}</dd>
            </div>
            <div>
              <dt className="sr-only">Estado</dt>
              <dd>{project.status}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </article>
  );
}
