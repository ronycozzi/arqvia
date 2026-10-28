"use client";

import Image from "@/components/app-image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useState } from "react";
import type { PublicProject } from "@/types/project";

/** The homepage shows a compact catalogue; the complete dossier lives at its own URL. */
export function ProjectSelection({ projects }: { projects: PublicProject[] }) {
  const [selected, setSelected] = useState(0);
  const active = projects[selected];
  if (!active) return null;
  return (
    <section className="project-selection" id="home-projects" aria-labelledby="selected-projects-title">
      <header className="project-selection__heading">
        <div><span className="arqvia-overline">Arquitectura en contexto</span><h2 id="selected-projects-title">Un lugar. Una forma de habitarlo.</h2></div>
        <Link href="/proyectos">Explorar proyectos <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>
      <div className="project-selection__layout">
        <div className="project-selection__index">
          <p>Casas, espacios de trabajo y reformas. Mirá cómo cambian las decisiones según el uso y el lugar.</p>
          <div className="project-selection__tabs" role="tablist" aria-label="Seleccionar proyecto" aria-orientation="vertical">
            {projects.map((project, index) => (
              <button key={project.id} id={`selection-tab-${project.id}`} type="button" role="tab" aria-label={`${project.category}: ${project.title}`} aria-selected={index === selected} aria-controls="selection-preview" tabIndex={index === selected ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  const next = event.key === "ArrowDown" ? (index + 1) % projects.length : event.key === "ArrowUp" ? (index - 1 + projects.length) % projects.length : event.key === "Home" ? 0 : event.key === "End" ? projects.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault(); setSelected(next);
                  document.getElementById(`selection-tab-${projects[next].id}`)?.focus();
                }}>
                <span><small>{project.category}</small><strong>{project.title}</strong></span><ArrowUpRight size={19} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <div className="project-selection__preview" id="selection-preview" role="tabpanel" aria-labelledby={`selection-tab-${active.id}`}>
          <div className="project-selection__media">
            {projects.map((project, index) => <Image key={project.id} src={project.coverImage} alt={selected === index ? project.imageAlt : ""} aria-hidden={selected !== index} fill quality={88} sizes="(min-width: 1280px) 760px, (min-width: 768px) 64vw, calc(100vw - 40px)" className={selected === index ? "is-selected" : ""} />)}
            <span className="project-selection__location"><MapPin size={13} aria-hidden="true" />{active.location}</span>
          </div>
          <div className="project-selection__caption" key={active.id}>
            <p>{active.summary}</p><Link href={`/proyectos/${active.slug}`}>Ver ficha <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
