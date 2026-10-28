/** Public, non-personal choices shared by orientation and contact forms. */
export const consultationProjectTypes = [
  "Obra nueva", "Remodelación", "Ampliación", "Diseño interior",
  "Dirección y administración de obra", "Local comercial", "Oficina", "Otro",
] as const;

export const consultationStages = [
  "Tengo una idea", "Tengo terreno", "Tengo planos", "Ya empecé la obra",
  "Necesito remodelar un espacio existente",
] as const;

export type ConsultationPrefill = {
  projectType?: string;
  currentStatus?: string;
  city?: string;
  message?: string;
};

type QueryValue = string | string[] | undefined;

export function readConsultationContext(query: {
  tipo?: QueryValue; etapa?: QueryValue; zona?: QueryValue;
}): ConsultationPrefill {
  const projectType = typeof query.tipo === "string"
    && consultationProjectTypes.some((type) => type === query.tipo) ? query.tipo : undefined;
  const currentStatus = typeof query.etapa === "string"
    && consultationStages.some((stage) => stage === query.etapa) ? query.etapa : undefined;
  const rawCity = typeof query.zona === "string" ? query.zona.trim() : "";
  const city = rawCity.length >= 2 && rawCity.length <= 120
    && /^[\p{L}\p{N} .,()'’/-]+$/u.test(rawCity) && !rawCity.includes("://")
    ? rawCity : undefined;
  return {
    projectType, currentStatus, city,
    message: currentStatus ? `Mi punto de partida: ${currentStatus.toLocaleLowerCase("es-AR")}.` : undefined,
  };
}
