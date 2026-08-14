import type { Prisma } from "@prisma/client";
import {
  buildAuditLogWhere,
  parseAuditLogFilters,
  type AuditAction,
  type AuditEntity,
} from "@/lib/audit-export";

const identifierPattern = /^[a-zA-Z0-9_-]{1,128}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const systemActorValue = "system";

export type AdminActivityFilters = {
  action: AuditAction | null;
  actor: string | null;
  entity: AuditEntity | null;
  fromDate: string | null;
  query: string | null;
  toDate: string | null;
};

export type AdminAuditResourceTarget = {
  href: string;
  label: string;
};

export function parseAdminActivityFilters(
  searchParams: URLSearchParams,
): AdminActivityFilters {
  const base = parseAuditLogFilters(searchParams);
  const actorValue = searchParams.get("actor")?.trim() || "";

  return {
    ...base,
    actor:
      actorValue === systemActorValue || identifierPattern.test(actorValue)
        ? actorValue
        : null,
    fromDate: parseCalendarDate(searchParams.get("desde")),
    query: base.query?.slice(0, 160) || null,
    toDate: parseCalendarDate(searchParams.get("hasta")),
  };
}

export function buildAdminActivityWhere(
  filters: AdminActivityFilters,
): Prisma.AuditLogWhereInput {
  const where = buildAuditLogWhere(filters);
  const createdAt = buildCreatedAtFilter(filters.fromDate, filters.toDate);
  const search = filters.query
    ? {
        OR: [
          ...((where.OR as Prisma.AuditLogWhereInput[]) || []),
          { entityId: { contains: filters.query } },
        ],
      }
    : {};

  return {
    ...where,
    ...search,
    ...(filters.actor === systemActorValue
      ? { userId: null }
      : filters.actor
        ? { userId: filters.actor }
        : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(hasInvalidDateRange(filters.fromDate, filters.toDate)
      ? { id: { in: [] } }
      : {}),
  };
}

export function buildAdminActivityScopedWhere(
  baseWhere: Prisma.AuditLogWhereInput,
  scope: Prisma.AuditLogWhereInput,
): Prisma.AuditLogWhereInput {
  return { AND: [baseWhere, scope] };
}

export function hasInvalidDateRange(
  fromDate: string | null,
  toDate: string | null,
) {
  return Boolean(fromDate && toDate && fromDate > toDate);
}

export function hasAdminActivityFilters(filters: AdminActivityFilters) {
  return Boolean(
    filters.action ||
      filters.actor ||
      filters.entity ||
      filters.fromDate ||
      filters.query ||
      filters.toDate,
  );
}

export function buildAdminActivitySearchParams(
  filters: AdminActivityFilters,
  options: { includeActorAndDates?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.entity) params.set("entidad", filters.entity);
  if (filters.action) params.set("accion", filters.action);

  if (options.includeActorAndDates !== false) {
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.fromDate) params.set("desde", filters.fromDate);
    if (filters.toDate) params.set("hasta", filters.toDate);
  }

  return params;
}

export function getAdminAuditResourceTarget({
  action,
  entity,
  entityId,
}: {
  action: string;
  entity: string;
  entityId: string | null;
}): AdminAuditResourceTarget | null {
  const deleted = action === "DELETE";
  const listTarget = listTargets[entity];
  const safeEntityId =
    entityId && identifierPattern.test(entityId)
      ? encodeURIComponent(entityId)
      : null;
  if (deleted || !safeEntityId) return listTarget || null;

  if (leadEntities.has(entity)) {
    return { href: `/admin/leads/${safeEntityId}`, label: "Ver consulta" };
  }

  if (entity === "LeadAutomationDelivery") {
    const params = new URLSearchParams({ entrega: safeEntityId });
    return {
      href: `/admin/automations?${params.toString()}`,
      label: "Ver entrega",
    };
  }

  const detailTarget = detailTargets[entity];
  if (detailTarget) {
    return {
      href: detailTarget.href(safeEntityId),
      label: detailTarget.label,
    };
  }

  return listTarget || null;
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

const leadEntities = new Set([
  "Lead",
  "LeadAttachment",
  "LeadEstimate",
  "LeadNote",
  "TechnicalVisit",
]);

const listTargets: Record<string, AdminAuditResourceTarget> = {
  Area: { href: "/admin/areas", label: "Ver áreas" },
  AuditLog: { href: "/admin/activity", label: "Ver historial" },
  BlogPost: { href: "/admin/blog", label: "Ver publicaciones" },
  ClientConfig: { href: "/admin/settings", label: "Ver configuración" },
  EstimateConfig: { href: "/admin/estimador", label: "Ver estimador" },
  EstimateRule: { href: "/admin/estimador", label: "Ver estimador" },
  Faq: { href: "/admin/faq", label: "Ver preguntas" },
  Lead: { href: "/admin/leads", label: "Ver consultas" },
  LeadAttachment: { href: "/admin/leads", label: "Ver consultas" },
  LeadAutomationDelivery: {
    href: "/admin/automations",
    label: "Ver automatizaciones",
  },
  LeadEstimate: { href: "/admin/leads", label: "Ver consultas" },
  LeadNote: { href: "/admin/leads", label: "Ver consultas" },
  LeadNotification: { href: "/admin/leads", label: "Ver consultas" },
  MediaAsset: { href: "/admin/media", label: "Ver biblioteca" },
  Project: { href: "/admin/projects", label: "Ver proyectos" },
  ProjectCategory: { href: "/admin/categories", label: "Ver categorías" },
  Service: { href: "/admin/services", label: "Ver servicios" },
  ServiceCategory: { href: "/admin/categories", label: "Ver categorías" },
  TeamMember: { href: "/admin/team", label: "Ver equipo" },
  TechnicalVisit: { href: "/admin/visitas", label: "Ver visitas" },
  Testimonial: { href: "/admin/testimonials", label: "Ver testimonios" },
  User: { href: "/admin/users", label: "Ver usuarios" },
};

const detailTargets: Record<
  string,
  { href: (id: string) => string; label: string }
> = {
  Area: { href: (id) => `/admin/areas/${id}`, label: "Abrir área" },
  BlogPost: {
    href: (id) => `/admin/blog/${id}`,
    label: "Abrir publicación",
  },
  EstimateRule: {
    href: (id) => `/admin/estimador/${id}`,
    label: "Abrir rango",
  },
  Faq: { href: (id) => `/admin/faq/${id}`, label: "Abrir pregunta" },
  Project: {
    href: (id) => `/admin/projects/${id}`,
    label: "Abrir proyecto",
  },
  ProjectCategory: {
    href: (id) => `/admin/categories/project/${id}`,
    label: "Abrir categoría",
  },
  Service: {
    href: (id) => `/admin/services/${id}`,
    label: "Abrir servicio",
  },
  ServiceCategory: {
    href: (id) => `/admin/categories/service/${id}`,
    label: "Abrir categoría",
  },
  TeamMember: {
    href: (id) => `/admin/team/${id}`,
    label: "Abrir integrante",
  },
  Testimonial: {
    href: (id) => `/admin/testimonials/${id}`,
    label: "Abrir testimonio",
  },
  User: { href: (id) => `/admin/users/${id}`, label: "Abrir usuario" },
};
