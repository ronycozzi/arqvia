import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { readBoundedRequest } from "@/lib/bounded-request";
import { prisma } from "@/lib/db";
import { calculateEstimate } from "@/lib/estimator";
import { leadAttachmentMaxRequestBytes } from "@/lib/lead-attachment-config";
import {
  removeStoredLeadAttachments,
  storeLeadAttachmentFiles,
  type StoredLeadAttachment,
} from "@/lib/lead-attachments";
import {
  normalizeLeadEmail,
  normalizeLeadPhone,
} from "@/lib/lead-identity";
import { readLeadAutomationConfig } from "@/lib/lead-automation-config";
import { logServerError } from "@/lib/logger";
import {
  buildRateLimitKey,
  getClientIp,
  rateLimit,
  releaseRateLimitReservation,
  type RateLimitResult,
} from "@/lib/rate-limit";
import {
  isJsonRequest,
  isMultipartRequest,
  isSameOriginRequest,
} from "@/lib/request-security";
import { revalidateLeadSurfaces } from "@/lib/revalidation";
import { leadSchema, type LeadInput } from "@/lib/validations";

const duplicateWindowMs = 30 * 24 * 60 * 60 * 1000;
const leadIpLimit = 8;
const leadIdentityLimit = 3;
const leadJsonMaxRequestBytes = 64 * 1024;

type RateLimitCompensationReason =
  | "attachment_store_failed"
  | "estimate_version_conflict"
  | "persistence_failed"
  | "result_missing";

const rateLimitHeaders = (
  limit: number,
  remaining: number,
  retryAfterSeconds?: number,
) => ({
  "X-RateLimit-Limit": String(limit),
  "X-RateLimit-Remaining": String(remaining),
  ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
});

function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

type LeadEstimateSnapshot = {
  ruleId: string;
  projectTypeKey: string;
  projectTypeLabel: string;
  finishTier: NonNullable<LeadInput["estimateTier"]>;
  areaM2: number;
  rateMinUsdM2: number;
  rateMaxUsdM2: number;
  totalMinUsd: number;
  totalMaxUsd: number;
  configVersion: number;
};

function buildLeadAutomationPayload({
  attachmentCount,
  email,
  estimate,
  leadData,
  leadId,
  status,
}: {
  attachmentCount: number;
  email: string;
  estimate: LeadEstimateSnapshot | null;
  leadData: LeadInput;
  leadId: string;
  status: string;
}) {
  return JSON.stringify({
    lead: {
      id: leadId,
      name: leadData.name,
      email,
      phone: leadData.phone,
      city: leadData.city,
      clientType: cleanOptional(leadData.clientType),
      projectType: leadData.projectType,
      currentStatus: cleanOptional(leadData.currentStatus),
      areaM2: cleanOptional(leadData.areaM2),
      budgetRange: cleanOptional(leadData.budgetRange),
      startDate: cleanOptional(leadData.startDate),
      needsVisit: leadData.needsVisit,
      hasPlans: leadData.hasPlans,
      referenceLinks: cleanOptional(leadData.referenceLinks),
      message: leadData.message,
      sourcePage: leadData.sourcePage,
      status,
      newAttachmentCount: attachmentCount,
    },
    estimate,
    technicalVisit: leadData.needsVisit
      ? {
          requestedDate: cleanOptional(leadData.visitPreferredDate),
          preferredWindow: leadData.visitPreferredWindow,
          address: cleanOptional(leadData.visitAddress),
          requestNotes: cleanOptional(leadData.visitNotes),
        }
      : null,
  });
}

class EstimateVersionConflictError extends Error {}

async function resolveLeadEstimate(
  tx: Prisma.TransactionClient,
  data: LeadInput,
): Promise<LeadEstimateSnapshot | null> {
  if (
    !data.estimateRuleId ||
    !data.estimateTier ||
    !data.estimateAreaM2 ||
    !data.estimateConfigVersion
  ) {
    return null;
  }

  const [config, rule] = await Promise.all([
    tx.estimateConfig.findUnique({ where: { id: "arqvia-estimator" } }),
    tx.estimateRule.findUnique({ where: { id: data.estimateRuleId } }),
  ]);

  if (
    !config?.enabled ||
    !rule?.active ||
    config.version !== data.estimateConfigVersion
  ) {
    throw new EstimateVersionConflictError();
  }

  const result = calculateEstimate(
    rule,
    data.estimateAreaM2,
    data.estimateTier,
    {
      ESSENTIAL: config.essentialMultiplier,
      BALANCED: config.balancedMultiplier,
      PREMIUM: config.premiumMultiplier,
    },
  );

  return {
    ruleId: rule.id,
    projectTypeKey: rule.key,
    projectTypeLabel: rule.label,
    finishTier: data.estimateTier,
    areaM2: result.areaM2,
    rateMinUsdM2: result.rateMinUsdM2,
    rateMaxUsdM2: result.rateMaxUsdM2,
    totalMinUsd: result.totalMinUsd,
    totalMaxUsd: result.totalMaxUsd,
    configVersion: config.version,
  };
}

function rateLimitResponse(limit: RateLimitResult, maxRequests: number) {
  return NextResponse.json(
    { message: "Demasiadas consultas. Intentá nuevamente en unos minutos." },
    {
      status: 429,
      headers: rateLimitHeaders(
        maxRequests,
        limit.remaining,
        Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000)),
      ),
    },
  );
}

async function releaseAcceptedRateLimitReservations(
  reservationKeys: string[],
  compensationReason: RateLimitCompensationReason,
) {
  const releases = await Promise.allSettled(
    reservationKeys.map((key) => releaseRateLimitReservation(key)),
  );

  releases.forEach((release, index) => {
    if (release.status === "rejected") {
      logServerError("lead.rate_limit_release_failed", release.reason, {
        compensationReason,
        failedReservationIndex: index,
        reservationCount: reservationKeys.length,
      });
    }
  });
}

async function parseLeadRequest(request: Request) {
  if (isJsonRequest(request)) {
    return {
      body: await request.json().catch(() => null),
      files: [] as File[],
    };
  }

  if (!isMultipartRequest(request)) return null;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > leadAttachmentMaxRequestBytes) {
    return {
      error: NextResponse.json(
        { message: "La consulta y sus archivos no pueden superar 13 MB." },
        { status: 413 },
      ),
    };
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return {
      error: NextResponse.json(
        { message: "No pudimos leer los archivos adjuntos." },
        { status: 400 },
      ),
    };
  }

  const rawPayload = formData.get("payload");
  const attachmentEntries = formData.getAll("attachments");
  if (
    typeof rawPayload !== "string" ||
    attachmentEntries.some((entry) => !(entry instanceof File))
  ) {
    return {
      error: NextResponse.json(
        { message: "El formulario contiene datos o archivos inválidos." },
        { status: 400 },
      ),
    };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawPayload);
  } catch {
    return {
      error: NextResponse.json(
        { message: "Los datos del formulario no tienen un formato válido." },
        { status: 400 },
      ),
    };
  }

  return {
    body,
    files: (attachmentEntries as File[]).filter((file) => file.size > 0),
  };
}

function attachmentData(leadId: string, attachments: StoredLeadAttachment[]) {
  return attachments.map((attachment) => ({
    leadId,
    fileName: attachment.fileName,
    originalName: attachment.originalName,
    storageKey: attachment.storageKey,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  }));
}

function technicalVisitRequestData(leadId: string, data: LeadInput) {
  return {
    leadId,
    requestedDate: cleanOptional(data.visitPreferredDate),
    preferredWindow: data.visitPreferredWindow,
    address: cleanOptional(data.visitAddress),
    requestNotes: cleanOptional(data.visitNotes),
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request, { requireSource: true })) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const ipRateLimitKey = buildRateLimitKey("lead:ip", ip);
  const ipLimit = await rateLimit(
    ipRateLimitKey,
    leadIpLimit,
    60_000,
  );
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit, leadIpLimit);
  const acceptedRateLimitReservations = [ipRateLimitKey];

  const jsonRequest = isJsonRequest(request);
  const boundedRequest = await readBoundedRequest(
    request,
    jsonRequest ? leadJsonMaxRequestBytes : leadAttachmentMaxRequestBytes,
  );
  if (!boundedRequest) {
    return NextResponse.json(
      {
        message: jsonRequest
          ? "Los datos de la consulta no pueden superar 64 KB."
          : "La consulta y sus archivos no pueden superar 13 MB.",
      },
      { status: 413 },
    );
  }

  const requestPayload = await parseLeadRequest(boundedRequest).catch(() => null);
  if (!requestPayload) {
    return NextResponse.json(
      { message: "El formulario debe enviarse como JSON o multipart/form-data." },
      { status: 415 },
    );
  }
  if ("error" in requestPayload && requestPayload.error) {
    return requestPayload.error;
  }

  const parsed = leadSchema.safeParse(requestPayload.body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Revisá los datos del formulario",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const email = normalizeLeadEmail(parsed.data.email);
  const phoneDigits = normalizeLeadPhone(parsed.data.phone);
  const emailRateLimitKey = buildRateLimitKey("lead:email", email);
  const emailLimit = await rateLimit(
    emailRateLimitKey,
    leadIdentityLimit,
    10 * 60_000,
  );
  if (!emailLimit.allowed) {
    return rateLimitResponse(emailLimit, leadIdentityLimit);
  }
  acceptedRateLimitReservations.push(emailRateLimitKey);

  if (phoneDigits.length >= 7) {
    const phoneRateLimitKey = buildRateLimitKey("lead:phone", phoneDigits);
    const phoneLimit = await rateLimit(
      phoneRateLimitKey,
      leadIdentityLimit,
      10 * 60_000,
    );
    if (!phoneLimit.allowed) {
      return rateLimitResponse(phoneLimit, leadIdentityLimit);
    }
    acceptedRateLimitReservations.push(phoneRateLimitKey);
  }

  const storedResult = await storeLeadAttachmentFiles(requestPayload.files);
  if (!storedResult.ok) {
    if (storedResult.status >= 500) {
      await releaseAcceptedRateLimitReservations(
        acceptedRateLimitReservations,
        "attachment_store_failed",
      );
    }
    return NextResponse.json(
      { message: storedResult.message },
      { status: storedResult.status },
    );
  }

  const storedAttachments = storedResult.attachments;
  const leadData: LeadInput = {
    ...parsed.data,
    hasPlans: parsed.data.hasPlans || storedAttachments.length > 0,
  };
  const duplicateSince = new Date(Date.now() - duplicateWindowMs);
  const automationCaptureEnabled = readLeadAutomationConfig().captureEnabled;
  let result: {
    deduped: boolean;
    leadId: string;
    estimate: LeadEstimateSnapshot | null;
  } | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      result = await prisma.$transaction(
        async (tx) => {
          const estimate = await resolveLeadEstimate(tx, leadData);
          const emailCandidates = await tx.lead.findMany({
            where: {
              createdAt: { gte: duplicateSince },
              OR: [{ normalizedEmail: email }, { email }],
            },
            orderBy: { updatedAt: "desc" },
            take: 10,
            select: {
              id: true,
              name: true,
              normalizedPhone: true,
              phone: true,
              status: true,
            },
          });
          const existingLead =
            phoneDigits.length >= 7
              ? emailCandidates.find(
                  (lead) =>
                    (lead.normalizedPhone || normalizeLeadPhone(lead.phone)) ===
                    phoneDigits,
                ) || null
              : null;

          const createdLead = await tx.lead.create({
            data: {
              name: leadData.name,
              email,
              phone: leadData.phone,
              normalizedEmail: email,
              normalizedPhone: phoneDigits || null,
              city: leadData.city,
              clientType: cleanOptional(leadData.clientType),
              projectType: leadData.projectType,
              currentStatus: cleanOptional(leadData.currentStatus),
              areaM2: cleanOptional(leadData.areaM2),
              budgetRange: cleanOptional(leadData.budgetRange),
              startDate: cleanOptional(leadData.startDate),
              needsVisit: leadData.needsVisit,
              hasPlans: leadData.hasPlans,
              referenceLinks: cleanOptional(leadData.referenceLinks),
              message: leadData.message,
              sourcePage: leadData.sourcePage,
              lastActivityAt: new Date(),
              possibleDuplicateOfId: existingLead?.id || null,
            },
          });

          if (leadData.needsVisit) {
            await tx.technicalVisit.create({
              data: technicalVisitRequestData(createdLead.id, leadData),
            });
            await tx.auditLog.create({
              data: {
                action: "CREATE",
                entity: "TechnicalVisit",
                entityId: createdLead.id,
                summary: `Solicitó una visita técnica para ${createdLead.name}`,
              },
            });
          }

          if (estimate) {
            await tx.leadEstimate.create({
              data: { leadId: createdLead.id, ...estimate },
            });
            await tx.auditLog.create({
              data: {
                action: "CREATE",
                entity: "LeadEstimate",
                entityId: createdLead.id,
                summary: `Registró una estimación para ${createdLead.name}: USD ${estimate.totalMinUsd}-${estimate.totalMaxUsd} (v${estimate.configVersion})`,
              },
            });
          }

          if (storedAttachments.length) {
            await tx.leadAttachment.createMany({
              data: attachmentData(createdLead.id, storedAttachments),
            });
          }

          await tx.auditLog.create({
            data: {
              action: "CREATE",
              entity: "Lead",
              entityId: createdLead.id,
              summary: existingLead
                ? `Posible reconsulta web de ${createdLead.name} por ${createdLead.projectType} desde ${createdLead.sourcePage}`
                : `Nueva consulta web de ${createdLead.name} por ${createdLead.projectType} desde ${createdLead.sourcePage}`,
            },
          });

          if (automationCaptureEnabled) {
            await tx.leadAutomationDelivery.create({
                data: {
                  event: existingLead ? "LEAD_RECONSULTED" : "LEAD_CREATED",
                  leadId: createdLead.id,
                  payloadJson: buildLeadAutomationPayload({
                    attachmentCount: storedAttachments.length,
                    email,
                    estimate,
                    leadData,
                    leadId: createdLead.id,
                    status: createdLead.status,
                  }),
                },
              });
          }

          return {
            deduped: Boolean(existingLead),
            leadId: createdLead.id,
            estimate,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      break;
    } catch (error) {
      if (error instanceof EstimateVersionConflictError) {
        await removeStoredLeadAttachments(storedAttachments);
        await releaseAcceptedRateLimitReservations(
          acceptedRateLimitReservations,
          "estimate_version_conflict",
        );
        return NextResponse.json(
          {
            message:
              "Los valores del estimador se actualizaron. Volvé a calcular el rango antes de enviar la consulta.",
          },
          { status: 409 },
        );
      }
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3;
      if (canRetry) continue;

      await removeStoredLeadAttachments(storedAttachments);
      logServerError("lead.persist_failed", error, { attempt });
      await releaseAcceptedRateLimitReservations(
        acceptedRateLimitReservations,
        "persistence_failed",
      );
      return NextResponse.json(
        {
          message:
            "No pudimos registrar la consulta en este momento. Reintentá en unos segundos.",
        },
        { status: 503 },
      );
    }
  }

  if (!result) {
    await removeStoredLeadAttachments(storedAttachments);
    await releaseAcceptedRateLimitReservations(
      acceptedRateLimitReservations,
      "result_missing",
    );
    return NextResponse.json(
      { message: "No pudimos registrar la consulta. Reintentá en unos segundos." },
      { status: 503 },
    );
  }

  revalidateLeadSurfaces(result.leadId);

  return NextResponse.json(
    {
      ok: true,
      attachmentCount: storedAttachments.length,
      estimate: result.estimate
        ? {
            projectTypeLabel: result.estimate.projectTypeLabel,
            finishTier: result.estimate.finishTier,
            areaM2: result.estimate.areaM2,
            totalMinUsd: result.estimate.totalMinUsd,
            totalMaxUsd: result.estimate.totalMaxUsd,
            configVersion: result.estimate.configVersion,
          }
        : null,
    },
    {
      status: 201,
      headers: rateLimitHeaders(leadIpLimit, ipLimit.remaining),
    },
  );
}
