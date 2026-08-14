import type { LeadStatus, Prisma } from "@prisma/client";
import { buildLeadInactivityWhere } from "@/lib/lead-activity";
import { getLeadCommercialReading, leadStatusLabels } from "@/lib/lead-utils";

export const LEAD_EXPORT_BATCH_SIZE = 250;
export const leadExportOrderBy = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
] satisfies Prisma.LeadOrderByWithRelationInput[];

export const leadExportHeaders = [
  "Nombre",
  "Email",
  "WhatsApp",
  "Ciudad",
  "Tipo de cliente",
  "Tipo de proyecto",
  "Estado actual",
  "Superficie",
  "Presupuesto",
  "Estimacion minima USD",
  "Estimacion maxima USD",
  "Nivel estimado",
  "Version estimador",
  "Estado automatizacion",
  "Intentos automatizacion",
  "Entrega automatizacion",
  "Inicio ideal",
  "Necesita visita",
  "Tiene planos o imagenes",
  "Estado comercial",
  "Responsable comercial",
  "Proximo seguimiento",
  "Presupuesto enviado USD",
  "Valor ganado USD",
  "Motivo de perdida",
  "Score comercial",
  "Prioridad comercial",
  "Resumen comercial",
  "Razones de prioridad",
  "Origen",
  "Mensaje",
  "Ultima nota",
  "Fecha de ingreso",
  "Ultima actividad",
];

export const leadExportSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  city: true,
  clientType: true,
  projectType: true,
  currentStatus: true,
  areaM2: true,
  budgetRange: true,
  startDate: true,
  needsVisit: true,
  hasPlans: true,
  referenceLinks: true,
  status: true,
  assignedUserId: true,
  nextFollowUpAt: true,
  quotedAmountUsd: true,
  wonAmountUsd: true,
  lostReason: true,
  sourcePage: true,
  message: true,
  createdAt: true,
  lastActivityAt: true,
  assignedUser: {
    select: { email: true, name: true },
  },
  estimate: {
    select: {
      totalMinUsd: true,
      totalMaxUsd: true,
      finishTier: true,
      configVersion: true,
    },
  },
  automationDeliveries: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      status: true,
      attempts: true,
      deliveredAt: true,
    },
  },
  notes: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { body: true },
  },
} satisfies Prisma.LeadSelect;

export type LeadExportRecord = Prisma.LeadGetPayload<{
  select: typeof leadExportSelect;
}>;

export type LeadExportPageRequest = {
  cursor?: Prisma.LeadWhereUniqueInput;
  orderBy: Prisma.LeadOrderByWithRelationInput[];
  select: typeof leadExportSelect;
  skip?: number;
  take: number;
  where: Prisma.LeadWhereInput;
};

type FetchLeadExportPage = (
  request: LeadExportPageRequest,
) => Promise<LeadExportRecord[]>;

export type LeadExportFollowUp =
  | "vencidos"
  | "mios"
  | "sin-responsable"
  | "sin-contactar"
  | "sin-notas"
  | "reconsultas";

export type LeadExportFilters = {
  days: number | null;
  followUp: LeadExportFollowUp | null;
  query: string | null;
  snapshotAt: Date;
  status?: LeadStatus;
};

export function parseLeadExportFilters(
  searchParams: URLSearchParams,
  snapshotAt = new Date(),
): LeadExportFilters {
  const rawStatus = searchParams.get("estado")?.trim();
  const query = searchParams.get("q")?.trim() || null;

  return {
    days: parseDays(searchParams.get("dias")),
    followUp: parseFollowUp(searchParams.get("seguimiento")),
    query,
    snapshotAt,
    status: isLeadStatus(rawStatus) ? rawStatus : undefined,
  };
}

export function buildLeadExportWhere(
  filters: LeadExportFilters,
  currentUserId?: string,
): Prisma.LeadWhereInput {
  const andWhere: Prisma.LeadWhereInput[] = [
    {
      createdAt: {
        ...(filters.days
          ? {
              gte: new Date(
                filters.snapshotAt.getTime() - filters.days * 24 * 60 * 60 * 1000,
              ),
            }
          : {}),
        lte: filters.snapshotAt,
      },
    },
  ];

  if (filters.status) andWhere.push({ status: filters.status });

  const followUpWhere = getFollowUpWhere(
    filters.followUp,
    new Date(filters.snapshotAt.getTime() - 48 * 60 * 60 * 1000),
    filters.snapshotAt,
    currentUserId,
  );
  if (followUpWhere) andWhere.push(followUpWhere);

  if (filters.query) {
    andWhere.push({
      OR: [
        { name: { contains: filters.query } },
        { email: { contains: filters.query } },
        { phone: { contains: filters.query } },
        { city: { contains: filters.query } },
        { projectType: { contains: filters.query } },
        { message: { contains: filters.query } },
      ],
    });
  }

  return { AND: andWhere };
}

export async function* generateLeadExportCsv({
  batchSize = LEAD_EXPORT_BATCH_SIZE,
  fetchPage,
  snapshotIds,
  snapshotBatches,
  where,
}: {
  batchSize?: number;
  fetchPage: FetchLeadExportPage;
  snapshotIds?: string[];
  snapshotBatches?: () => AsyncIterable<string[]>;
  where: Prisma.LeadWhereInput;
}) {
  assertBatchSize(batchSize);
  yield `\uFEFF${toCsvRow(leadExportHeaders)}\r\n`;

  if (snapshotBatches) {
    for await (const batchIds of snapshotBatches()) {
      const leads = await fetchPage({
        where: { id: { in: batchIds } },
        orderBy: leadExportOrderBy,
        select: leadExportSelect,
        take: batchIds.length,
      });
      if (leads.length) yield `${leads.map(toLeadCsvRow).join("\r\n")}\r\n`;
    }
    return;
  }

  if (snapshotIds) {
    for (let offset = 0; offset < snapshotIds.length; offset += batchSize) {
      const batchIds = snapshotIds.slice(offset, offset + batchSize);
      const leads = await fetchPage({
        where: { id: { in: batchIds } },
        orderBy: leadExportOrderBy,
        select: leadExportSelect,
        take: batchSize,
      });

      if (leads.length) {
        yield `${leads.map(toLeadCsvRow).join("\r\n")}\r\n`;
      }
    }
    return;
  }

  let cursorId: string | undefined;

  while (true) {
    const leads = await fetchPage({
      where,
      orderBy: leadExportOrderBy,
      select: leadExportSelect,
      take: batchSize,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    if (leads.length) {
      yield `${leads.map(toLeadCsvRow).join("\r\n")}\r\n`;
    }

    if (leads.length < batchSize) break;
    cursorId = leads.at(-1)?.id;
    if (!cursorId) break;
  }
}

export function createLeadExportStream(
  options: Parameters<typeof generateLeadExportCsv>[0] & {
    onComplete?: () => Promise<void>;
  },
) {
  const { onComplete, ...generatorOptions } = options;
  const iterator = generateLeadExportCsv(generatorOptions);
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
          controller.close();
          return;
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

export function buildLeadExportFilename(filters: LeadExportFilters) {
  const period = filters.days ? `${filters.days}d` : "historico";
  const statusPart = filters.status ? filters.status.toLowerCase() : "todos";
  const followUpPart = filters.followUp ? `-${filters.followUp}` : "";

  return `arqvia-leads-${period}-${statusPart}${followUpPart}.csv`;
}

export function toCsvRow(values: Array<string | number | boolean>) {
  return values
    .map((value) => {
      const text = escapeSpreadsheetFormula(String(value ?? ""));
      return `"${text.replace(/"/g, '""')}"`;
    })
    .join(",");
}

function toLeadCsvRow(lead: LeadExportRecord) {
  const reading = getLeadCommercialReading(lead);
  const automation = lead.automationDeliveries[0];

  return toCsvRow([
    lead.name,
    lead.email,
    lead.phone,
    lead.city,
    lead.clientType || "",
    lead.projectType,
    lead.currentStatus || "",
    lead.areaM2 || "",
    lead.budgetRange || "",
    lead.estimate?.totalMinUsd || "",
    lead.estimate?.totalMaxUsd || "",
    lead.estimate?.finishTier || "",
    lead.estimate?.configVersion || "",
    automation?.status || "",
    automation?.attempts || "",
    automation?.deliveredAt?.toISOString() || "",
    lead.startDate || "",
    lead.needsVisit ? "Si" : "No",
    lead.hasPlans ? "Si" : "No",
    leadStatusLabels[lead.status],
    lead.assignedUser?.name || lead.assignedUser?.email || "",
    lead.nextFollowUpAt?.toISOString() || "",
    lead.quotedAmountUsd ?? "",
    lead.wonAmountUsd ?? "",
    lead.lostReason || "",
    reading.score,
    reading.label,
    reading.summary,
    reading.reasons.join(" | "),
    lead.sourcePage,
    lead.message,
    lead.notes[0]?.body || "",
    lead.createdAt.toISOString(),
    lead.lastActivityAt.toISOString(),
  ]);
}

function escapeSpreadsheetFormula(value: string) {
  const trimmedStart = value.trimStart();
  return /^[=+\-@\t\r]/.test(trimmedStart) ? `'${value}` : value;
}

function isLeadStatus(value?: string | null): value is LeadStatus {
  return Boolean(value && value in leadStatusLabels);
}

function parseDays(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 3650) return null;
  return parsed;
}

function parseFollowUp(value: string | null): LeadExportFollowUp | null {
  return value === "vencidos" ||
    value === "mios" ||
    value === "sin-responsable" ||
    value === "sin-contactar" ||
    value === "sin-notas" ||
    value === "reconsultas"
    ? value
    : null;
}

function getFollowUpWhere(
  followUp: LeadExportFollowUp | null,
  staleSince: Date,
  snapshotAt: Date,
  currentUserId?: string,
): Prisma.LeadWhereInput | null {
  const openStatuses: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"];

  if (followUp === "vencidos") {
    return {
      nextFollowUpAt: { lte: snapshotAt },
      status: { in: openStatuses },
    };
  }

  if (followUp === "mios") {
    return {
      assignedUserId: currentUserId || "__usuario-no-disponible__",
      status: { in: openStatuses },
    };
  }

  if (followUp === "sin-responsable") {
    return {
      assignedUserId: null,
      status: { in: openStatuses },
    };
  }

  if (followUp === "sin-contactar") {
    return {
      ...buildLeadInactivityWhere(staleSince),
      status: "NEW",
    };
  }

  if (followUp === "sin-notas") {
    return { notes: { none: {} } };
  }

  if (followUp === "reconsultas") {
    return { possibleDuplicateOfId: { not: null } };
  }

  return null;
}

function assertBatchSize(batchSize: number) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("Export batch size must be a positive integer");
  }
}
