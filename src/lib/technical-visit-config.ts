export const technicalVisitStatusValues = [
  "REQUESTED",
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const visitWindowValues = [
  "MORNING",
  "AFTERNOON",
  "FLEXIBLE",
] as const;

export type TechnicalVisitStatusValue =
  (typeof technicalVisitStatusValues)[number];
export type VisitWindowValue = (typeof visitWindowValues)[number];

export const technicalVisitStatusLabels: Record<
  TechnicalVisitStatusValue,
  string
> = {
  REQUESTED: "Solicitada",
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
};

export const technicalVisitStatusClassNames: Record<
  TechnicalVisitStatusValue,
  string
> = {
  REQUESTED: "border-amber-200 bg-amber-50 text-amber-800",
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-800",
  CONFIRMED: "border-olive/25 bg-olive/10 text-olive",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

export const visitWindowLabels: Record<VisitWindowValue, string> = {
  MORNING: "Por la mañana",
  AFTERNOON: "Por la tarde",
  FLEXIBLE: "Horario flexible",
};

const visitDateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Cordoba",
});

const visitDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeZone: "America/Argentina/Cordoba",
});

export function formatTechnicalVisitDateTime(value: Date | string) {
  return visitDateTimeFormatter.format(new Date(value));
}

export function formatRequestedVisitDate(value?: string | null) {
  if (!value) return "Sin fecha preferida";
  return visitDateFormatter.format(new Date(`${value}T12:00:00-03:00`));
}

export function getCordobaDateTimeInputParts(value?: Date | string | null) {
  if (!value) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPart["type"]) =>
    parts.find((part) => part.type === type)?.value || "";

  const hour = get("hour") === "24" ? "00" : get("hour");

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}

export function parseCordobaDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
