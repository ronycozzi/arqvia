"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Home, Layers3, MapPin } from "lucide-react";
import { useState } from "react";
import { consultationProjectTypes, consultationStages } from "@/lib/consultation-context";

const projectTypes = consultationProjectTypes;
const stages = consultationStages;

/** A short brief, carried into the existing contact flow. No personal data is collected here. */
export function ProjectStart({ areas }: { areas: string[] }) {
  const [type, setType] = useState("Obra nueva");
  const [stage, setStage] = useState("Tengo una idea");
  const [area, setArea] = useState("");
  const params = new URLSearchParams({ origen: "/", tipo: type, etapa: stage });
  if (area) params.set("zona", area);

  return (
    <section className="project-start" id="tu-proyecto" aria-labelledby="project-start-title">
      <div className="project-start__intro">
        <span className="arqvia-overline">Consulta de obra</span>
        <h2 id="project-start-title">Contanos qué querés construir o renovar.</h2>
        <p>Desde una casa nueva hasta la reforma de un ambiente. Elegí el tipo de obra y contanos en qué etapa está.</p>
        <p className="project-start__note"><Check size={16} aria-hidden="true" /> No necesitás tener planos para consultar.</p>
      </div>
      <div className="project-start__brief">
        <div className="project-start__brief-head"><span>Datos del proyecto</span><span>Podés cambiarlos después</span></div>
        <div className="project-start__fields">
          <label><span><Home size={17} aria-hidden="true" /> Quiero hacer</span><select value={type} onChange={(event) => setType(event.target.value)}>{projectTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span><Layers3 size={17} aria-hidden="true" /> Hoy estoy en esta etapa</span><select value={stage} onChange={(event) => setStage(event.target.value)}>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span><MapPin size={17} aria-hidden="true" /> Ciudad o zona</span><input list="project-start-areas" value={area} onChange={(event) => setArea(event.target.value)} maxLength={120} placeholder="Por ejemplo, Villa Allende" autoComplete="address-level2" /><datalist id="project-start-areas">{areas.map((item) => <option key={item} value={item} />)}</datalist></label>
        </div>
        <div className="project-start__continue">
          <p>Estos datos pasan a tu consulta. Después sumás los detalles y elegís cómo contactarte.</p>
          <Link href={`/contacto?${params.toString()}`} className="arqvia-solid-link">Continuar mi consulta <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
