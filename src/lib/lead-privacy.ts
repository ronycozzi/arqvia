import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { leadAutomationProcessingLeaseMs } from "@/lib/lead-automation-policy";
import {
  dispatchPrivateObjectDeletion,
  enqueuePrivateObjectDeletion,
} from "@/lib/private-object-deletion";

export const leadPrivacyAudit = {
  action: "PRIVACY_ERASURE",
  entity: "PrivacyRequest",
  summary: "Consulta eliminada por solicitud del titular.",
} as const;

export type LeadErasureAudit = {
  action: string;
  entity: string;
  summary: string;
};

export type LeadErasureResult = {
  deletedObjects: number;
  pendingObjectDeletions: number;
  queuedObjectDeletions: number;
};

const maxEraseAttempts = 3;

const privacyLeadSelect = {
  id: true,
  lastActivityAt: true,
  privacyErasureRequestedAt: true,
  status: true,
  updatedAt: true,
  attachments: { select: { id: true, storageKey: true } },
  notes: { select: { id: true } },
  technicalVisit: { select: { id: true } },
  estimate: { select: { id: true } },
  automationDeliveries: {
    select: { id: true, lastAttemptAt: true, status: true },
  },
} satisfies Prisma.LeadSelect;

type PrivacyLeadSnapshot = Prisma.LeadGetPayload<{
  select: typeof privacyLeadSelect;
}>;

type LeadErasureEligibility = {
  lastActivityBefore: Date;
  status: "LOST";
};

export class LeadPrivacyNotFoundError extends Error {
  constructor() {
    super("Lead not found for privacy erasure.");
    this.name = "LeadPrivacyNotFoundError";
  }
}

export class LeadPrivacyAutomationBusyError extends Error {
  constructor() {
    super("A lead automation delivery is still processing.");
    this.name = "LeadPrivacyAutomationBusyError";
  }
}

class LeadPrivacySnapshotChangedError extends Error {}

function relatedAuditEntityIds(lead: PrivacyLeadSnapshot) {
  return Array.from(
    new Set([
      lead.id,
      ...lead.attachments.map(({ id }) => id),
      ...lead.notes.map(({ id }) => id),
      ...lead.automationDeliveries.map(({ id }) => id),
      ...(lead.technicalVisit ? [lead.technicalVisit.id] : []),
      ...(lead.estimate ? [lead.estimate.id] : []),
    ]),
  );
}

function isSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function eligibilityWhere(eligibility?: LeadErasureEligibility) {
  return eligibility
    ? {
        lastActivityAt: { lt: eligibility.lastActivityBefore },
        status: eligibility.status,
      }
    : {};
}

function remainsEligible(
  lead: PrivacyLeadSnapshot,
  eligibility?: LeadErasureEligibility,
) {
  return (
    !eligibility ||
    (lead.status === eligibility.status &&
      lead.lastActivityAt < eligibility.lastActivityBefore)
  );
}

async function withSerializableRetry<T>(operation: () => Promise<T>) {
  for (let attempt = 1; attempt <= maxEraseAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt < maxEraseAttempts && isSerializableConflict(error)) continue;
      throw error;
    }
  }
  throw new LeadPrivacySnapshotChangedError();
}

async function fenceLeadForErasure(
  leadId: string,
  eligibility?: LeadErasureEligibility,
) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const snapshot = await tx.lead.findUnique({
          where: { id: leadId },
          select: privacyLeadSelect,
        });
        if (!snapshot) throw new LeadPrivacyNotFoundError();
        if (!remainsEligible(snapshot, eligibility)) {
          throw new LeadPrivacySnapshotChangedError();
        }

        if (!snapshot.privacyErasureRequestedAt) {
          const claimed = await tx.lead.updateMany({
            where: {
              id: leadId,
              privacyErasureRequestedAt: null,
              updatedAt: snapshot.updatedAt,
              ...eligibilityWhere(eligibility),
            },
            data: { privacyErasureRequestedAt: new Date() },
          });
          if (claimed.count !== 1) throw new LeadPrivacySnapshotChangedError();
        }

        const expiredBefore = new Date(
          Date.now() - leadAutomationProcessingLeaseMs,
        );
        await tx.leadAutomationDelivery.updateMany({
          where: {
            leadId,
            lastAttemptAt: { lt: expiredBefore },
            status: "PROCESSING",
          },
          data: {
            claimToken: null,
            lastErrorCode: "PRIVACY_ERASURE",
            payloadJson: "{}",
            status: "DEAD",
          },
        });
        await tx.leadAutomationDelivery.updateMany({
          where: {
            leadId,
            status: { in: ["PENDING", "FAILED", "DEAD"] },
          },
          data: {
            claimToken: null,
            lastErrorCode: "PRIVACY_ERASURE",
            payloadJson: "{}",
            status: "DEAD",
          },
        });
        await tx.leadAutomationDelivery.updateMany({
          where: { leadId, status: "DELIVERED" },
          data: { payloadJson: "{}" },
        });

        const current = await tx.lead.findUnique({
          where: { id: leadId },
          select: privacyLeadSelect,
        });
        if (!current) throw new LeadPrivacyNotFoundError();
        return current;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

async function finalizeLeadErasure({
  actorUserId,
  audit,
  eligibility,
  leadId,
}: {
  actorUserId: string | null;
  audit: LeadErasureAudit;
  eligibility?: LeadErasureEligibility;
  leadId: string;
}) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const lead = await tx.lead.findUnique({
          where: { id: leadId },
          select: privacyLeadSelect,
        });
        if (!lead) throw new LeadPrivacyNotFoundError();
        if (!lead.privacyErasureRequestedAt || !remainsEligible(lead, eligibility)) {
          throw new LeadPrivacySnapshotChangedError();
        }
        if (
          lead.automationDeliveries.some(
            (delivery) => delivery.status === "PROCESSING",
          )
        ) {
          throw new LeadPrivacyAutomationBusyError();
        }

        const deletionJobs = await Promise.all(
          lead.attachments.map(({ storageKey }) =>
            enqueuePrivateObjectDeletion(tx, storageKey),
          ),
        );
        const auditEntityIds = relatedAuditEntityIds(lead);

        await tx.lead.delete({ where: { id: leadId } });
        await tx.auditLog.deleteMany({
          where: { entityId: { in: auditEntityIds } },
        });
        await tx.auditLog.create({
          data: {
            ...audit,
            entityId: null,
            userId: actorUserId,
          },
        });

        return deletionJobs.map(({ id }) => id);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

export async function eraseLeadForPrivacy({
  actorUserId,
  leadId,
}: {
  actorUserId: string;
  leadId: string;
}) {
  return eraseLeadData({ actorUserId, audit: leadPrivacyAudit, leadId });
}

export async function eraseLeadData({
  actorUserId,
  audit,
  eligibility,
  leadId,
}: {
  actorUserId: string | null;
  audit: LeadErasureAudit;
  eligibility?: LeadErasureEligibility;
  leadId: string;
}): Promise<LeadErasureResult> {
  const fenced = await fenceLeadForErasure(leadId, eligibility);
  if (
    fenced.automationDeliveries.some(
      (delivery) => delivery.status === "PROCESSING",
    )
  ) {
    throw new LeadPrivacyAutomationBusyError();
  }

  const deletionJobIds = await finalizeLeadErasure({
    actorUserId,
    audit,
    eligibility,
    leadId,
  });
  const attempts = await Promise.allSettled(
    deletionJobIds.map((id) => dispatchPrivateObjectDeletion(id)),
  );
  const outcomes = attempts.map((attempt) =>
    attempt.status === "fulfilled" ? attempt.value : "failed",
  );

  return {
    deletedObjects: outcomes.filter((outcome) => outcome === "deleted").length,
    pendingObjectDeletions: outcomes.filter((outcome) => outcome !== "deleted")
      .length,
    queuedObjectDeletions: deletionJobIds.length,
  };
}
