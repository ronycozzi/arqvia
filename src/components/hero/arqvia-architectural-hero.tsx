"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicClientConfig } from "@/lib/client-config";
import type { PublicProject } from "@/types/project";

export function ArqviaArchitecturalHero({
  config,
  eyebrow,
  imageAlt,
  trustItems,
  projects,
}: {
  config: PublicClientConfig;
  eyebrow: string;
  imageAlt: string;
  trustItems: string[];
  projects: PublicProject[];
}) {
  // El índice se ordena por superficie: la obra mayor abre la portada porque
  // es la que mejor sostiene el alcance del estudio.
  const indice = [...projects].sort((a, b) => b.areaM2 - a.areaM2).slice(0, 5);
  const [activeId, setActiveId] = useState(indice[0]?.id ?? "");
  const formatoArea = new Intl.NumberFormat("es-AR");

  return (
    <section id="home-projects" className="obra-index" aria-labelledby="obra-index-claim">
      <div className="obra-index__shell">
        <div className="obra-index__head-main">
          <p className="obra-index__eyebrow">
            <span aria-hidden="true" className="obra-index__eyebrow-tick" />
            {eyebrow}
          </p>
          <h1 id="obra-index-claim" className="hero-reveal obra-index__claim">
            {config.heroTitle === "Arquitectura pensada para construirse bien." ? "Casas y espacios que parten de cómo los usás." : config.heroTitle}
          </h1>
        </div>

        <div className="obra-index__head-aside">
          <p className="obra-index__lead">{config.heroSubtitle === "Diseñamos, planificamos y acompañamos proyectos residenciales y comerciales desde la primera idea hasta la entrega final." ? "Arquitectura, remodelación e interiores en Córdoba. Definimos la distribución, los materiales y el alcance de obra a partir del lugar y de lo que necesitás hacer en él." : config.heroSubtitle}</p>
          <Link href="/contacto" className="obra-index__cta">
            {config.primaryCtaLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {indice.length > 0 ? (
          <>
            <p className="obra-index__rotulo">
              <span>Selección de proyectos</span>
              <span aria-hidden="true" className="obra-index__rotulo-rule" />
              <span className="obra-index__rotulo-count">
                {indice.length} {indice.length === 1 ? "proyecto" : "proyectos"}
              </span>
              <Link href="/proyectos" className="obra-index__rotulo-link">
                {config.secondaryCtaLabel}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </p>

            <ol className="obra-index__list">
              {indice.map((project) => {
                const abierto = activeId === project.id;

                return (
                  <li key={project.id} className="obra-index__item">
                    <div className="obra-index__disclosure" data-open={abierto}>
                      <button type="button" className="obra-index__summary" aria-expanded={abierto} aria-controls={`obra-panel-${project.id}`} id={`obra-trigger-${project.id}`} onClick={() => setActiveId(abierto ? "" : project.id)}>
                        <span className="obra-index__thumb" aria-hidden="true">
                          <Image
                            src={project.coverImage}
                            alt=""
                            width={160}
                            height={120}
                            sizes="80px"
                            className="obra-index__thumb-img"
                          />
                        </span>

                        <span className="obra-index__name">{project.title}</span>

                        <span className="obra-index__meta">
                          <span className="obra-index__meta-item">
                            {project.location}
                          </span>
                          <span className="obra-index__meta-item">
                            {project.category}
                          </span>
                          <span className="obra-index__meta-item obra-index__meta-item--num">
                            {formatoArea.format(project.areaM2)} m²
                          </span>
                          <span className="obra-index__meta-item obra-index__meta-item--num">
                            {project.year}
                          </span>
                        </span>

                        <span aria-hidden="true" className="obra-index__chevron" />
                      </button>

                      <div className="obra-index__panel" id={`obra-panel-${project.id}`} role="region" aria-labelledby={`obra-trigger-${project.id}`} inert={!abierto}>
                        <div className="obra-index__panel-inner">
                          <div className="obra-index__figure">
                            <Image
                              src={project.coverImage}
                              alt={project.imageAlt || imageAlt}
                              fill
                              priority={project.id === indice[0]?.id}
                              loading={project.id === indice[0]?.id ? "eager" : "lazy"}
                              sizes="(min-width: 1024px) 64vw, 100vw"
                              className="obra-index__figure-img"
                              {...(abierto
                                ? { "data-testid": "hero-architectural-image" }
                                : {})}
                            />
                          </div>

                          <div className="obra-index__detail">
                            <p className="obra-index__summary-text">
                              {project.summary}
                            </p>
                            <Link
                              href={`/proyectos/${project.slug}`}
                              className="obra-index__open"
                            >
                              Ver el proyecto
                              <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}

        {trustItems.length > 0 ? (
          <ul className="obra-index__legend">
            {trustItems.map((item) => (
              <li key={item} className="obra-index__legend-item">
                <span aria-hidden="true" className="obra-index__legend-tick" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
