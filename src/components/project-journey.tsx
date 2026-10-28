"use client";

import Image from "@/components/app-image";
import { ArrowLeft, ArrowRight, Check, Compass, HardHat, PenTool, KeyRound } from "lucide-react";
import { useId, useRef, useState } from "react";
import styles from "./project-journey.module.css";

// Areas to explore rather than a numbered construction schedule.
const phases = [
  { label: "La idea", icon: Compass, title: "Entender el lugar. Dibujar las posibilidades.", description: "Cómo se usa cada ambiente, por dónde entra la luz y qué necesitás cambiar. Ese relevamiento se convierte en alternativas de distribución para conversar con claridad.", image: "/images/arqvia-distribution-study.svg", alt: "Estudio conceptual detallado de distribución, con muros, aberturas, mobiliario y patio", caption: "Estudio de distribución · ilustración conceptual", output: "Prioridades y alcance inicial", details: [{ title: "El lugar", text: "Orientación, accesos y condiciones del terreno o inmueble." }, { title: "Tu forma de vivir", text: "Rutinas, ambientes necesarios y vínculos entre espacios." }, { title: "Las posibilidades", text: "Alternativas de distribución y decisiones que conviene tomar primero." }] },
  { label: "La obra", icon: HardHat, title: "Las decisiones del plano llegan al lugar.", description: "Coordinación y seguimiento para que el proyecto se pueda ejecutar. El alcance, las responsabilidades y los cambios se acuerdan según la obra contratada.", image: "/images/arqvia-construction-technical.webp", alt: "Trabajo técnico y seguimiento de una obra en construcción", caption: "Coordinación · ejecución · seguimiento", output: "Avances y próximos trabajos acordados", details: [{ title: "Planificación", text: "Tareas, rubros y secuencia de ejecución." }, { title: "Coordinación", text: "Consultas técnicas y decisiones entre los equipos de trabajo." }, { title: "Seguimiento", text: "Revisión de avances, terminaciones y cambios de alcance." }] },
  { label: "El proyecto", icon: PenTool, title: "Ver cómo encaja todo, antes de construir.", description: "Distribución, materiales y luz se resuelven en conjunto. El proyecto se desarrolla antes de ejecutar la obra: los planos y las visualizaciones ayudan a tomar decisiones con contexto.", image: "/images/arqvia-hero-architectural-sketch-3840x2160.webp", alt: "Perspectiva arquitectónica detallada de una vivienda de hormigón, vidrio y madera", caption: "Distribución · materialidad · documentación", output: "Propuesta y documentación según el encargo", details: [{ title: "Distribución", text: "Ambientes, recorridos y relación con el exterior." }, { title: "Materialidad", text: "Terminaciones, iluminación y criterios de mantenimiento." }, { title: "Documentación", text: "Planos y definiciones necesarias para el alcance contratado." }] },
  { label: "La entrega", icon: KeyRound, title: "Un espacio terminado, listo para su nueva etapa.", description: "El cierre incluye recorrer lo realizado, revisar terminaciones y acordar la resolución de los pendientes. La atención está en cómo funciona el espacio completo.", image: "/images/arqvia-casa-patio-norte.webp", alt: "Vista exterior completa de Casa Patio Norte terminada, con fachada, galería y jardín", caption: "Casa Patio Norte · vista del conjunto", output: "Revisión final y cierre de los trabajos", details: [{ title: "Recorrido final", text: "Terminaciones e instalaciones incluidas en el encargo." }, { title: "Observaciones", text: "Registro y revisión de los pendientes de entrega." }, { title: "Cierre", text: "Documentación y recomendaciones acordadas para el uso del espacio." }] },
];

export function ProjectJourney({ light = false }: { light?: boolean }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const phase = phases[active];
  function change(index: number, focus = false) {
    const next = (index + phases.length) % phases.length;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  }
  return (
    <div className={`${styles.journey}${light ? ` ${styles.light}` : ""}`}>
      <div role="tablist" aria-label="Etapas del proyecto" className={styles.tabs}>
        {phases.map((item, index) => {
          const Icon = item.icon;
          return <button type="button" key={item.label} role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={index === active} tabIndex={index === active ? 0 : -1} ref={(element) => { tabs.current[index] = element; }} onClick={() => change(index)} onKeyDown={(event) => {
            const next = event.key === "ArrowRight" ? active + 1 : event.key === "ArrowLeft" ? active - 1 : event.key === "Home" ? 0 : event.key === "End" ? phases.length - 1 : null;
            if (next !== null) { event.preventDefault(); change(next, true); }
          }}><Icon size={18} aria-hidden="true" /><span>{item.label}</span><ArrowRight className={styles.tabArrow} size={16} aria-hidden="true" /></button>;
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} tabIndex={0} className={styles.panel}>
        <div className={styles.visual}>
          {phases.map((item, index) => <div key={item.label} className={styles.image} data-active={index === active} aria-hidden={index !== active}>
            <Image src={item.image} alt={index === active ? item.alt : ""} fill quality={88} sizes="(min-width: 1280px) 650px, (min-width: 800px) 55vw, 100vw" className={styles.picture} />
          </div>)}
          <span className={styles.caption}>{phase.caption}</span>
        </div>
        <div className={styles.body} key={phase.label}>
          <span className={styles.kicker}>Así lo trabajamos</span>
          <h2>{phase.title}</h2><p>{phase.description}</p>
          <dl className={styles.details}>{phase.details.map((item) => <div key={item.title}><dt><Check size={14} aria-hidden="true" />{item.title}</dt><dd>{item.text}</dd></div>)}</dl>
          <div className={styles.deliverable}><span>Qué se define</span><strong>{phase.output}</strong></div>
          <div className={styles.arrows}><button type="button" aria-label="Etapa anterior" onClick={() => change(active - 1)}><ArrowLeft size={18} aria-hidden="true" /></button><span>{phase.label}</span><button type="button" aria-label="Etapa siguiente" onClick={() => change(active + 1)}><ArrowRight size={18} aria-hidden="true" /></button></div>
        </div>
      </div>
    </div>
  );
}
