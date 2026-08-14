import type {
  LeadAutomationEvent,
  LeadAutomationStatus,
  Prisma,
} from "@prisma/client";

const identifierPattern = /^[a-zA-Z0-9_-]{1,128}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const manualAutomationBatchSize = 10;

export const automationStatusValues = [
  "PENDING",
  "PROCESSING",
  "DELIVERED",
  "FAILED",
  "DEAD",
] as const satisfies readonly LeadAutomationStatus[];

export const automationEventValues = [
  "LEAD_CREATED",
  "LEAD_RECONSULTED",
] as const satisfies readonly LeadAutomationEvent[];

export const automationResultValues = [
  "ERROR",
  "NO_RESPONSE",
  "HTTP_4XX",
  "HTTP_5XX",
] as const;

export const automationRecoveryValues = [
  "READY",
  "SCHEDULED",
  "EXHAUSTED",
] as const;

export type AutomationResultFilter =
  (typeof automationResultValues)[number];
export type AutomationRecoveryFilter =
  (typeof automationRecoveryValues)[number];

export type AdminAutomationFilters = {
  deliveryId: string | null;
  event: LeadAutomationEvent | null;
  fromDate: string | null;
  query: string | null;
  recovery: AutomationRecoveryFilter | null;
  result: AutomationResultFilter | null;
  status: LeadAutomationStatus | null;
  toDate: string | null;
};

export type AutomationErrorPresentation = {
  description: string;
  requeueRecommended: boolean;
  suggestion: string;
  title: string;
  tone: "danger" | "warning";
};

export function parseAdminAutomationFilters(
  searchParams: URLSearchParams,
): AdminAutomationFilters {
  const rawStatus = searchParams.get("estado")?.trim() || "";
  const rawEvent = searchParams.get("evento")?.trim() || "";
  const rawResult = searchParams.get("resultado")?.trim() || "";
  const rawRecovery = searchParams.get("recuperacion")?.trim() || "";
  const rawDeliveryId = searchParams.get("entrega")?.trim() || "";

  return {
    deliveryId: identifierPattern.test(rawDeliveryId) ? rawDeliveryId : null,
    event: automationEventValues.includes(rawEvent as LeadAutomationEvent)
      ? (rawEvent as LeadAutomationEvent)
      : null,
    fromDate: parseCalendarDate(searchParams.get("desde")),
    query: searchParams.get("q")?.trim().slice(0, 160) || null,
    recovery: automationRecoveryValues.includes(
      rawRecovery as AutomationRecoveryFilter,
    )
      ? (rawRecovery as AutomationRecoveryFilter)
      : null,
    result: automationResultValues.includes(rawResult as AutomationResultFilter)
      ? (rawResult as AutomationResultFilter)
      : null,
    status: automationStatusValues.includes(rawStatus as LeadAutomationStatus)
      ? (rawStatus as LeadAutomationStatus)
      : null,
    toDate: parseCalendarDate(searchParams.get("hasta")),
  };
}

export function buildAdminAutomationWhere(
  filters: AdminAutomationFilters,
  now = new Date(),
): Prisma.LeadAutomationDeliveryWhereInput {
  const createdAt = buildCreatedAtFilter(filters.fromDate, filters.toDate);
  const constraints: Prisma.LeadAutomationDeliveryWhereInput[] = [];

  if (filters.query) {
    constraints.push({
      OR: [
        { id: { contains: filters.query } },
        { lastErrorCode: { contains: filters.query } },
        { lead: { is: { name: { contains: filters.query } } } },
        { lead: { is: { city: { contains: filters.query } } } },
        { lead: { is: { projectType: { contains: filters.query } } } },
      ],
    });
  }
  if (filters.result) constraints.push(buildResultWhere(filters.result));
  if (filters.recovery) {
    constraints.push(buildRecoveryWhere(filters.recovery, now));
  }
  if (hasInvalidAutomationDateRange(filters.fromDate, filters.toDate)) {
    constraints.push({ id: { in: [] } });
  }

  return {
    ...(filters.deliveryId ? { id: filters.deliveryId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.event ? { event: filters.event } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(constraints.length ? { AND: constraints } : {}),
  };
}

export function buildManualAutomationBatchWhere(
  now: Date,
): Prisma.LeadAutomationDeliveryWhereInput {
  return {
    nextAttemptAt: { lte: now },
    status: { in: ["FAILED", "DEAD"] },
  };
}

export function buildAdminAutomationSearchParams(
  filters: AdminAutomationFilters,
  overrides: Partial<AdminAutomationFilters> = {},
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.query) params.set("q", next.query);
  if (next.deliveryId) params.set("entrega", next.deliveryId);
  if (next.status) params.set("estado", next.status);
  if (next.event) params.set("evento", next.event);
  if (next.result) params.set("resultado", next.result);
  if (next.recovery) params.set("recuperacion", next.recovery);
  if (next.fromDate) params.set("desde", next.fromDate);
  if (next.toDate) params.set("hasta", next.toDate);
  return params;
}

export function hasAdminAutomationFilters(filters: AdminAutomationFilters) {
  return Boolean(
    filters.deliveryId ||
      filters.event ||
      filters.fromDate ||
      filters.query ||
      filters.recovery ||
      filters.result ||
      filters.status ||
      filters.toDate,
  );
}

export function hasInvalidAutomationDateRange(
  fromDate: string | null,
  toDate: string | null,
) {
  return Boolean(fromDate && toDate && fromDate > toDate);
}

export function getAutomationErrorPresentation(
  errorCode: string | null,
  responseStatus: number | null,
): AutomationErrorPresentation | null {
  if (!errorCode && (!responseStatus || responseStatus < 400)) return null;

  const status = responseStatus || parseHttpStatus(errorCode);
  if (status) return getHttpErrorPresentation(status);

  switch (errorCode) {
    case "TIMEOUT":
      return {
        title: "El destino tardó demasiado",
        description:
          "El webhook no respondió dentro del tiempo máximo configurado.",
        suggestion:
          "Comprobá la disponibilidad del destino. Reencolar suele ser apropiado cuando el servicio vuelve a responder.",
        requeueRecommended: true,
        tone: "warning",
      };
    case "NETWORK_ERROR":
      return {
        title: "No se pudo establecer conexión",
        description:
          "La entrega falló antes de recibir una respuesta HTTP del destino.",
        suggestion:
          "Revisá DNS, conectividad y certificado TLS. Después podés reencolar la entrega.",
        requeueRecommended: true,
        tone: "warning",
      };
    case "LEASE_EXPIRED":
      return {
        title: "La ejecución anterior quedó incompleta",
        description:
          "El procesador recuperó una entrega que permaneció demasiado tiempo en curso.",
        suggestion:
          "Verificá el cron y sus tiempos de ejecución antes de reencolar.",
        requeueRecommended: true,
        tone: "warning",
      };
    case "INVALID_PAYLOAD":
      return {
        title: "La carga guardada no es válida",
        description:
          "El contenido de la entrega no pudo interpretarse de forma segura.",
        suggestion:
          "Reencolar repetirá el mismo error. Investigá el registro de origen y la captura de la entrega.",
        requeueRecommended: false,
        tone: "danger",
      };
    case "UNSAFE_DESTINATION":
      return {
        title: "Destino bloqueado por seguridad",
        description:
          "La política de red rechazó el host configurado para el webhook.",
        suggestion:
          "Corregí el host permitido y la URL de destino antes de reencolar.",
        requeueRecommended: false,
        tone: "danger",
      };
    default:
      return {
        title: "Error de entrega",
        description: errorCode
          ? `El procesador registró el código ${errorCode}.`
          : "El destino devolvió un resultado no exitoso.",
        suggestion:
          "Revisá la configuración y el servicio receptor antes de volver a intentar.",
        requeueRecommended: false,
        tone: "danger",
      };
  }
}

function getHttpErrorPresentation(status: number): AutomationErrorPresentation {
  if (status === 401 || status === 403) {
    return {
      title: `Autorización rechazada (HTTP ${status})`,
      description: "El destino recibió la entrega pero rechazó sus credenciales.",
      suggestion:
        "Verificá el secreto compartido y la validación de firma antes de reencolar.",
      requeueRecommended: false,
      tone: "danger",
    };
  }
  if (status === 404) {
    return {
      title: "Webhook no encontrado (HTTP 404)",
      description: "La ruta configurada ya no existe en el servicio receptor.",
      suggestion: "Corregí la URL del webhook antes de reencolar.",
      requeueRecommended: false,
      tone: "danger",
    };
  }
  if (status === 408 || status === 429) {
    return {
      title:
        status === 429
          ? "Destino temporalmente limitado (HTTP 429)"
          : "El destino agotó el tiempo (HTTP 408)",
      description:
        "El receptor indicó una condición temporal que puede resolverse al esperar.",
      suggestion:
        "Respetá la ventana de recuperación y reencolá cuando el destino esté disponible.",
      requeueRecommended: true,
      tone: "warning",
    };
  }
  if (status >= 500) {
    return {
      title: `Falla del servicio receptor (HTTP ${status})`,
      description:
        "El webhook respondió, pero su servidor no pudo completar la operación.",
      suggestion:
        "Revisá el estado del servicio externo. Reencolar es apropiado cuando se recupere.",
      requeueRecommended: true,
      tone: "warning",
    };
  }
  return {
    title: `Solicitud rechazada (HTTP ${status})`,
    description:
      "El destino recibió la entrega y la consideró inválida para su contrato actual.",
    suggestion:
      "Revisá el contrato del webhook y el evento enviado antes de reencolar.",
    requeueRecommended: false,
    tone: "danger",
  };
}

function buildResultWhere(
  result: AutomationResultFilter | null,
): Prisma.LeadAutomationDeliveryWhereInput {
  switch (result) {
    case "ERROR":
      return {
        OR: [
          { lastErrorCode: { not: null } },
          { responseStatus: { gte: 400 } },
        ],
      };
    case "NO_RESPONSE":
      return {
        responseStatus: null,
        status: { in: ["FAILED", "DEAD"] },
      };
    case "HTTP_4XX":
      return { responseStatus: { gte: 400, lt: 500 } };
    case "HTTP_5XX":
      return { responseStatus: { gte: 500 } };
    default:
      return {};
  }
}

function buildRecoveryWhere(
  recovery: AutomationRecoveryFilter | null,
  now: Date,
): Prisma.LeadAutomationDeliveryWhereInput {
  switch (recovery) {
    case "READY":
      return {
        nextAttemptAt: { lte: now },
        status: { in: ["FAILED", "DEAD"] },
      };
    case "SCHEDULED":
      return { nextAttemptAt: { gt: now }, status: "FAILED" };
    case "EXHAUSTED":
      return { status: "DEAD" };
    default:
      return {};
  }
}

function parseCalendarDate(value: string | null) {
  if (!value || !datePattern.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
}

function buildCreatedAtFilter(fromDate: string | null, toDate: string | null) {
  if (!fromDate && !toDate) return null;
  return {
    ...(fromDate
      ? { gte: new Date(`${fromDate}T00:00:00.000-03:00`) }
      : {}),
    ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999-03:00`) } : {}),
  } satisfies Prisma.DateTimeFilter;
}

function parseHttpStatus(errorCode: string | null) {
  const match = errorCode?.match(/^HTTP_(\d{3})$/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 100 && value <= 599 ? value : null;
}
