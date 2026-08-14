import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deletePrivateMediaObject } from "@/lib/media-storage";

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

const maxEraseAttempts = 3;

const privacyLeadSelect = {
  id: true,
  attachments: { select: { id: true, storageKey: true } },
  notes: { select: { id: true } },
  technicalVisit: { select: { id: true } },
  estimate: { select: { id: true } },
  automationDeliveries: { select: { id: true } },
} satisfies Prisma.LeadSelect;

type PrivacyLeadSnapshot = Prisma.LeadGetPayload<{
  select: typeof privacyLeadSelect;
}>;

export class LeadPrivacyNotFoundError extends Error {
  constructor() {
    super("Lead not found for privacy erasure.");
    this.name = "LeadPrivacyNotFoundError";
  }
}

export class LeadPrivacyStorageError extends Error {
  constructor() {
    super("A private attachment could not be deleted.");
    this.name = "LeadPrivacyStorageError";
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

function hasUndeletedAttachments(
  current: PrivacyLeadSnapshot,
  deletedStorageKeys: Set<string>,
) {
  return current.attachments.some(
    ({ storageKey }) => !deletedStorageKeys.has(storageKey),
  );
}

function isSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
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
  leadId,
}: {
  actorUserId: string | null;
  audit: LeadErasureAudit;
  leadId: string;
}) {
  for (let attempt = 1; attempt <= maxEraseAttempts; attempt += 1) {
    const snapshot = await prisma.lead.findUnique({
      where: { id: leadId },
      select: privacyLeadSelect,
    });
    if (!snapshot) throw new LeadPrivacyNotFoundError();

    try {
      for (const attachment of snapshot.attachments) {
        await deletePrivateMediaObject(attachment.storageKey);
      }
    } catch {
      throw new LeadPrivacyStorageError();
    }

    const deletedStorageKeys = new Set(
      snapshot.attachments.map(({ storageKey }) => storageKey),
    );

    try {
      await prisma.$transaction(
        async (tx) => {
          const current = await tx.lead.findUnique({
            where: { id: leadId },
            select: privacyLeadSelect,
          });
          if (!current) throw new LeadPrivacyNotFoundError();

          if (hasUndeletedAttachments(current, deletedStorageKeys)) {
            throw new LeadPrivacySnapshotChangedError();
          }

          const auditEntityIds = relatedAuditEntityIds(current);

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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return;
    } catch (error) {
      const canRetry =
        attempt < maxEraseAttempts &&
        (error instanceof LeadPrivacySnapshotChangedError ||
          isSerializableConflict(error));
      if (canRetry) continue;
      throw error;
    }
  }
}
