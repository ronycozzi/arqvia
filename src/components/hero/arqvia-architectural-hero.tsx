import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicClientConfig } from "@/lib/client-config";
import type { PublicProject } from "@/types/project";

/**
 * La portada es el índice de obra del estudio.
 *
 * El patrón que se repetía en todas las portadas del estudio era el mismo:
 * etiqueta chica, título enorme, párrafo, dos botones y algo visual al
 * costado. Cambiar la foto o la tipografía no lo rompe, porque lo que se
 * repite no es la estética sino la estructura: promesa primero, evidencia
 * después, y la única acción del visitante es leer.
 *
 * Acá se invierte. La primera pantalla no anuncia: enumera. Cuatro obras
 * reales, cada una un renglón a ancho completo con su localidad, su rubro, su
 * superficie y su año. El renglón abierto muestra la obra; los demás quedan
 * como líneas de un índice. Quien llega ve de una que el estudio hace
 * residencial, oficinas, comercial y remodelación en cuatro puntos distintos
 * de Córdoba, que es la pregunta que trae —"¿hacen lo mío?"— y que ningún
 * eslogan contesta.
 *
 * Decisiones que sostienen eso:
 *
 * - No hay título gigante. La promesa se reduce a una línea sobre el índice,
 *   porque la evidencia la da la lista.
 * - Se construye con `<details>` nativos. El teclado, el lector de pantalla y
 *   la navegación sin JavaScript funcionan sin reimplementar nada, y el
 *   atributo `name` hace que abrir uno cierre el otro. Donde el navegador no
 *   soporte `name`, quedan varios abiertos: sigue siendo utilizable.
 * - La apertura anima la altura con `grid-template-rows`, que tiene soporte
 *   parejo, y se desactiva con `prefers-reduced-motion`.
 * - Cada renglón lleva su miniatura, así que en táctil —donde no hay hover—
 *   la lista se entiende sin abrir nada.
 */
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
  const formatoArea = new Intl.NumberFormat("es-AR");

  return (
    <section className="obra-index" aria-labelledby="obra-index-claim">
      <div className="obra-index__shell">
        <div className="obra-index__head-main">
          <p className="obra-index__eyebrow">
            <span aria-hidden="true" className="obra-index__eyebrow-tick" />
            {eyebrow}
          </p>
          <h1 id="obra-index-claim" className="hero-reveal obra-index__claim">
            {config.heroTitle}
          </h1>
        </div>

        <div className="obra-index__head-aside">
          <p className="obra-index__lead">{config.heroSubtitle}</p>
          <Link href="/contacto" className="obra-index__cta">
            {config.primaryCtaLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {indice.length > 0 ? (
          <>
            <p className="obra-index__rotulo">
              <span>Obra construida</span>
              <span aria-hidden="true" className="obra-index__rotulo-rule" />
              <span className="obra-index__rotulo-count">
                {indice.length} {indice.length === 1 ? "obra" : "obras"}
              </span>
              <Link href="/proyectos" className="obra-index__rotulo-link">
                {config.secondaryCtaLabel}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </p>

            <ol className="obra-index__list">
              {indice.map((project, posicion) => {
                const abierto = posicion === 0;
                const orden = String(posicion + 1).padStart(2, "0");

                return (
                  <li key={project.id} className="obra-index__item">
                    <details name="obra-index" open={abierto}>
                      <summary className="obra-index__summary">
                        <span className="obra-index__order" aria-hidden="true">
                          {orden}
                        </span>

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
                      </summary>

                      <div className="obra-index__panel">
                        <div className="obra-index__panel-inner">
                          <div className="obra-index__figure">
                            <Image
                              src={project.coverImage}
                              alt={project.imageAlt || imageAlt}
                              fill
                              priority={abierto}
                              loading={abierto ? "eager" : "lazy"}
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
                              Ver la obra
                              <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </details>
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
