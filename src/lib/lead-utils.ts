import type { Lead, LeadStatus } from "@prisma/client";

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  QUOTED: "Presupuestado",
  WON: "Ganado",
  LOST: "Perdido",
};

export const leadStatusOptions = Object.entries(leadStatusLabels).map(
  ([value, label]) => ({
    value: value as LeadStatus,
    label,
  }),
);

export const leadStatusClassNames: Record<LeadStatus, string> = {
  NEW: "bg-bronze-light text-ink",
  CONTACTED: "bg-stone text-ink",
  QUALIFIED: "bg-olive text-paper",
  QUOTED: "bg-graphite-soft text-paper",
  WON: "bg-ink text-paper",
  LOST: "bg-mist text-ink",
};

type LeadCommercialFields = Pick<
  Lead,
  | "areaM2"
  | "budgetRange"
  | "city"
  | "currentStatus"
  | "hasPlans"
  | "message"
  | "needsVisit"
  | "projectType"
  | "referenceLinks"
  | "startDate"
>;

export function buildLeadWhatsAppUrl(lead: Pick<Lead, "phone" | "name">) {
  const number = lead.phone.replace(/\D/g, "");
  const message = `Hola ${lead.name}, te escribimos de Arqvia por la consulta que nos dejaste en la web. Queremos revisar tu proyecto y coordinar los próximos pasos.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildLeadMailtoUrl(
  lead: Pick<Lead, "email" | "name" | "projectType">,
) {
  const subject = `Consulta Arqvia - ${lead.projectType}`;
  const body = `Hola ${lead.name},\n\nGracias por escribirnos a Arqvia. Queremos revisar tu proyecto y coordinar los próximos pasos.\n\nQuedamos atentos.`;

  return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function maskLeadEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "Email reservado";

  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
}

export function maskLeadPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "WhatsApp reservado";

  return `*** *** ${digits.slice(-4)}`;
}

export function buildLeadResponseDraft(
  lead: Pick<
    Lead,
    | "areaM2"
    | "budgetRange"
    | "city"
    | "currentStatus"
    | "name"
    | "projectType"
    | "startDate"
  >,
) {
  const firstName = lead.name.trim().split(/\s+/)[0] || lead.name;
  const projectContext = [lead.projectType, lead.city].filter(Boolean).join(" en ");
  const budgetLine = lead.budgetRange
    ? `Vimos que marcaste un rango de inversión de ${lead.budgetRange}.`
    : "Para orientarte bien, necesitamos confirmar un rango de inversión aproximado.";
  const timingLine = lead.startDate
    ? `También tomamos como referencia tu fecha ideal: ${lead.startDate}.`
    : "También podemos revisar tiempos posibles según la etapa en la que estés.";

  return [
    `Hola ${firstName}, gracias por escribirnos a Arqvia.`,
    `Recibimos tu consulta por ${projectContext || "tu proyecto"} y queremos revisarla con criterio antes de presupuestar.`,
    budgetLine,
    lead.areaM2 ? `Superficie indicada: ${lead.areaM2}.` : "Nos ayudaría conocer la superficie aproximada.",
    timingLine,
    "El próximo paso sería coordinar una llamada breve o visita técnica para validar alcance, prioridades y documentación disponible.",
  ].join("\n\n");
}

export function buildLeadInternalBrief(
  lead: LeadCommercialFields &
    Pick<Lead, "email" | "name" | "phone" | "sourcePage">,
) {
  return [
    `Consulta: ${lead.name}`,
    `Proyecto: ${lead.projectType}`,
    `Zona: ${lead.city || "Sin especificar"}`,
    `Contacto: ${lead.phone} · ${lead.email}`,
    `Estado: ${lead.currentStatus || "Sin especificar"}`,
    `Superficie: ${lead.areaM2 || "Sin especificar"}`,
    `Presupuesto: ${lead.budgetRange || "Sin especificar"}`,
    `Inicio ideal: ${lead.startDate || "Sin especificar"}`,
    `Visita técnica: ${lead.needsVisit ? "Sí" : "No marcada"}`,
    `Planos o imágenes: ${lead.hasPlans ? "Sí" : "No marcado"}`,
    `Links o referencias: ${lead.referenceLinks || "Sin especificar"}`,
    `Origen: ${lead.sourcePage}`,
  ].join("\n");
}

export function getLeadCommercialReading(lead: LeadCommercialFields) {
  const reasons: string[] = [];
  const nextSteps: string[] = [];
  const missing: string[] = [];
  let score = 18;

  const normalizedBudget = normalizeText(lead.budgetRange);
  const normalizedProject = normalizeText(lead.projectType);
  const normalizedStatus = normalizeText(lead.currentStatus);
  const normalizedStartDate = normalizeText(lead.startDate);
  const normalizedMessage = normalizeText(lead.message);

  if (lead.needsVisit) {
    score += 15;
    reasons.push("Pidió visita técnica");
    nextSteps.push("Proponer dos horarios posibles para una visita o reunión inicial.");
  } else {
    missing.push("Confirmar si necesita visita técnica");
  }

  if (lead.hasPlans) {
    score += 12;
    reasons.push("Tiene planos, fotos o referencias");
    nextSteps.push("Pedir que envíe planos, fotos o medidas por WhatsApp.");
  } else {
    missing.push("Solicitar fotos, planos o medidas disponibles");
  }

  if (lead.referenceLinks) {
    score += 6;
    reasons.push("Compartio links o referencias visuales");
  }

  if (normalizedBudget.includes("80.000") || normalizedBudget.includes("mas")) {
    score += 24;
    reasons.push("Presupuesto alto o amplio");
  } else if (
    normalizedBudget.includes("30.000") ||
    normalizedBudget.includes("25.000")
  ) {
    score += 14;
    reasons.push("Presupuesto medio con margen para propuesta");
  } else if (lead.budgetRange) {
    score += 6;
    reasons.push("Indicó rango de inversión");
  } else {
    missing.push("Definir rango de inversión aproximado");
  }

  if (lead.areaM2) {
    score += 8;
    reasons.push("Informó superficie aproximada");
  } else {
    missing.push("Pedir superficie aproximada");
  }

  if (
    normalizedProject.includes("llave") ||
    normalizedProject.includes("construccion") ||
    normalizedProject.includes("remodelacion") ||
    normalizedProject.includes("comercial")
  ) {
    score += 10;
    reasons.push("Tipo de proyecto con alto valor comercial");
  }

  if (
    normalizedStatus.includes("tengo planos") ||
    normalizedStatus.includes("ya empece") ||
    normalizedStatus.includes("necesito remodelar") ||
    normalizedStatus.includes("tengo terreno")
  ) {
    score += 8;
    reasons.push("Etapa actual concreta");
  } else {
    missing.push("Aclarar en qué etapa está el proyecto");
  }

  if (
    normalizedStartDate.includes("proximo") ||
    normalizedStartDate.includes("mes") ||
    normalizedStartDate.includes("inmediato")
  ) {
    score += 7;
    reasons.push("Tiene intención de avanzar pronto");
  }

  if (normalizedMessage.length > 90) {
    score += 6;
    reasons.push("Mensaje con contexto suficiente");
  }

  if (lead.city) score += 4;

  const boundedScore = Math.min(score, 100);
  const priority =
    boundedScore >= 72
      ? {
          label: "Alta",
          className: "bg-olive text-paper",
          summary: "Oportunidad para contactar hoy",
        }
      : boundedScore >= 45
        ? {
            label: "Media",
            className: "bg-bronze-light text-ink",
            summary: "Conviene calificar antes de presupuestar",
          }
        : {
            label: "Inicial",
            className: "bg-mist text-ink",
            summary: "Requiere más datos antes de avanzar",
          };

  return {
    className: priority.className,
    label: priority.label,
    missing: missing.slice(0, 4),
    nextSteps: [
      ...nextSteps,
      "Confirmar alcance, zona, etapa actual y prioridad de inicio.",
      "Registrar una nota interna con próximos pasos y responsable.",
    ].slice(0, 4),
    reasons: reasons.length ? reasons.slice(0, 5) : ["Consulta inicial para calificar"],
    score: boundedScore,
    summary: priority.summary,
  };
}

export function getLeadPriority(lead: LeadCommercialFields) {
  const reading = getLeadCommercialReading(lead);

  return {
    className: reading.className,
    label: reading.label,
    score: reading.score,
    summary: reading.summary,
  };
}

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
