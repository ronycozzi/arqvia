"use client";

import Image from "@/components/app-image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { PublicService } from "@/types/service";
import styles from "./service-studio.module.css";

/** A service is selected explicitly: hover never changes the visitor's reading. */
export function ServiceStudio({ services, title, description }: { services: PublicService[]; title: string; description: string }) {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = services[selected] ?? services[0];
  if (!active) return null;

  function move(key: string, index: number) {
    const last = services.length - 1;
    const next = key === "Home" ? 0 : key === "End" ? last :
      key === "ArrowDown" || key === "ArrowRight" ? (index + 1) % services.length :
      key === "ArrowUp" || key === "ArrowLeft" ? (index + last) % services.length : index;
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return (
    <section id="home-services" aria-labelledby="studio-services-title" className={styles.studio}>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>Servicios / Alcance del encargo</p><h2 id="studio-services-title">{title}</h2></div>
        <p>{description}</p>
      </header>
      <div className={styles.layout}>
        <div className={styles.directory}>
          <div role="tablist" aria-label="Explorar servicios" aria-orientation="vertical" className={styles.tabs}>
            {services.map((service, index) => (
              <button key={service.slug} ref={(element) => { buttons.current[index] = element; }} id={`service-tab-${service.slug}`} role="tab" aria-selected={active.slug === service.slug} aria-controls="studio-service-panel" tabIndex={active.slug === service.slug ? 0 : -1}
                onClick={() => setSelected(index)} onKeyDown={(event) => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); move(event.key, index); } }}>
                <span><small>{service.categoryName}</small>{" "}<strong>{service.title}</strong></span><ArrowUpRight size={21} aria-hidden="true" />
              </button>
            ))}
          </div>
          <Link href="/servicios" className={styles.all}>Todos los servicios <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <div id="studio-service-panel" role="tabpanel" aria-labelledby={`service-tab-${active.slug}`} tabIndex={0} className={styles.panel}>
          <div className={styles.media}>
            {services.map((service) => <Image key={service.slug} src={service.coverImage} alt="" fill quality={88} sizes="(min-width: 1280px) 740px, (min-width: 768px) 62vw, 100vw" className={active.slug === service.slug ? styles.visible : styles.hidden} />)}
            <span className={styles.caption}>Referencia de espacio y materialidad</span>
          </div>
          <div key={active.slug} className={styles.details}>
            <p className={styles.description}>{active.shortDescription}</p>
            {active.included.length > 0 && <div className={styles.scope}><p>Qué se define</p><ul>{active.included.filter(Boolean).slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div>}
            <Link className={styles.link} href={`/servicios/${active.slug}`}>Ver alcance y entregables <ArrowUpRight size={19} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
