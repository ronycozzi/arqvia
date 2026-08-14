import type { Prisma } from "@prisma/client";
import { toCsvRow } from "@/lib/lead-export";

export const auditActionOptions = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT_LEADS",
  "EXPORT_ACTIVITY",
  "PRIVACY_ERASURE",
  "RETENTION_ERASURE",
  "REQUEUE",
  "REQUEUE_BATCH",
  "MARK_NOTIFICATIONS_READ",
  "RESTORE_NOTIFICATIONS_UNREAD",
] as const;

export const auditEntityOptions = [
  "Lead",
  "LeadNote",
  "LeadAttachment",
  "TechnicalVisit",
  "LeadEstimate",
  "LeadAutomationDelivery",
  "EstimateConfig",
  "EstimateRule",
  "Project",
  "Service",
  "BlogPost",
  "LegalPage",
  "Faq",
  "Testimonial",
  "TeamMember",
  "Area",
  "User",
  "ClientConfig",
  "HomeContent",
  "InstitutionalPage",
  "MediaAsset",
  "ProjectCategory",
  "ServiceCategory",
  "LeadNotification",
  "PrivacyRequest",
  "DataRetention",
  "AuditLog",
] as const;

export type AuditAction = (typeof auditActionOptions)[number];
export type AuditEntity = (typeof auditEntityOptions)[number];

export const auditActionLabels: Record<AuditAction, string> = {
  CREATE: "Creación",
  DELETE: "Eliminación",
  EXPORT_ACTIVITY: "Exportación de actividad",
  EXPORT_LEADS: "Exportación de consultas",
  MARK_NOTIFICATIONS_READ: "Notificaciones leídas",
  PRIVACY_ERASURE: "Eliminación por privacidad",
  RETENTION_ERASURE: "Eliminación por retención",
  REQUEUE: "Reencolado",
  REQUEUE_BATCH: "Reencolado masivo",
  RESTORE_NOTIFICATIONS_UNREAD: "Lectura deshecha",
  UPDATE: "Actualización",
};

export const auditEntityLabels: Record<AuditEntity, string> = {
  Area: "Áreas",
  AuditLog: "Historial de actividad",
  BlogPost: "Blog",
  ClientConfig: "Configuración",
  DataRetention: "Retención de datos",
  EstimateConfig: "Configuración del estimador",
  EstimateRule: "Rangos del estimador",
  Faq: "FAQ",
  HomeContent: "Contenido de la home",
  InstitutionalPage: "Páginas institucionales",
  Lead: "Consultas",
  LeadAttachment: "Archivos de consultas",
  LeadAutomationDelivery: "Automatizaciones de leads",
  LeadEstimate: "Estimaciones de leads",
  LeadNote: "Notas comerciales",
  LegalPage: "Páginas legales",
  LeadNotification: "Notificaciones",
  MediaAsset: "Biblioteca visual",
  PrivacyRequest: "Solicitudes de privacidad",
  Project: "Proyectos",
  ProjectCategory: "Categorías de proyectos",
  Service: "Servicios",
  ServiceCategory: "Categorías de servicios",
  TeamMember: "Equipo",
  TechnicalVisit: "Visitas técnicas",
  Testimonial: "Testimonios",
  User: "Usuarios",
};

export const AUDIT_EXPORT_BATCH_SIZE = 250;
export const auditExportOrderBy = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
] satisfies Prisma.AuditLogOrderByWithRelationInput[];

export type AuditLogFilters = {
  action: AuditAction | null;
  entity: AuditEntity | null;
  query: string | null;
};

export const auditExportSelect = {
  action: true,
  createdAt: true,
  entity: true,
  entityId: true,
  id: true,
  summary: true,
  user: { select: { email: true, name: true } },
} satisfies Prisma.AuditLogSelect;

export type AuditExportRecord = Prisma.AuditLogGetPayload<{
  select: typeof auditExportSelect;
}>;

type FetchAuditPage = (request: {
  orderBy: Prisma.AuditLogOrderByWithRelationInput[];
  select: typeof auditExportSelect;
  take: number;
  where: Prisma.AuditLogWhereInput;
}) => Promise<AuditExportRecord[]>;

export function parseAuditLogFilters(searchParams: URLSearchParams): AuditLogFilters {
  const action = searchParams.get("accion")?.trim() || "";
  const entity = searchParams.get("entidad")?.trim() || "";
  const query = searchParams.get("q")?.trim() || null;

  return {
    action: auditActionOptions.includes(action as AuditAction)
      ? (action as AuditAction)
      : null,
    entity: auditEntityOptions.includes(entity as AuditEntity)
      ? (entity as AuditEntity)
      : null,
    query,
  };
}

export function buildAuditLogWhere(
  filters: AuditLogFilters,
): Prisma.AuditLogWhereInput {
  return {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.query
      ? {
          OR: [
            { summary: { contains: filters.query } },
            { entity: { contains: filters.query } },
            { action: { contains: filters.query } },
            { user: { is: { name: { contains: filters.query } } } },
            { user: { is: { email: { contains: filters.query } } } },
          ],
        }
      : {}),
  };
}

export async function* generateAuditExportCsv({
  batchSize = AUDIT_EXPORT_BATCH_SIZE,
  fetchPage,
  snapshotIds,
  snapshotBatches,
}: {
  batchSize?: number;
  fetchPage: FetchAuditPage;
  snapshotIds: string[];
  snapshotBatches?: () => AsyncIterable<string[]>;
}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("Export batch size must be a positive integer");
  }

  yield `\uFEFF${toCsvRow([
    "Fecha",
    "Accion",
    "Modulo",
    "Resumen",
    "Usuario",
    "Email usuario",
    "ID relacionado",
  ])}\r\n`;

  const batches = snapshotBatches
    ? snapshotBatches()
    : (async function* () {
        for (let offset = 0; offset < snapshotIds.length; offset += batchSize) {
          yield snapshotIds.slice(offset, offset + batchSize);
        }
      })();

  for await (const ids of batches) {
    const logs = await fetchPage({
      orderBy: auditExportOrderBy,
      select: auditExportSelect,
      take: batchSize,
      where: { id: { in: ids } },
    });
    if (!logs.length) continue;

    yield `${logs
      .map((log) =>
        toCsvRow([
          log.createdAt.toISOString(),
          log.action,
          log.entity,
          log.summary,
          log.user?.name || "Sistema",
          log.user?.email || "",
          log.entityId || "",
        ]),
      )
      .join("\r\n")}\r\n`;
  }
}

export function createAuditExportStream(
  options: Parameters<typeof generateAuditExportCsv>[0] & {
    onComplete?: () => Promise<void>;
  },
) {
  const { onComplete, ...generatorOptions } = options;
  const iterator = generateAuditExportCsv(generatorOptions);
  const encoder = new TextEncoder();
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await onComplete?.();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) {
          await cleanup();
          return controller.close();
        }
        controller.enqueue(encoder.encode(value));
      } catch (error) {
        await cleanup().catch(() => undefined);
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return?.();
      await cleanup();
    },
  });
}

export function buildAuditExportFilename(filters: AuditLogFilters) {
  const action = filters.action?.toLowerCase() || "todas";
  const entity = filters.entity?.toLowerCase() || "todos";
  return `arqvia-actividad-${entity}-${action}.csv`;
}
