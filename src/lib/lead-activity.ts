import type { Prisma } from "@prisma/client";

export class LeadPrivacyLockedError extends Error {
  constructor() {
    super("Lead is locked for privacy erasure.");
    this.name = "LeadPrivacyLockedError";
  }
}

export function getLatestLeadActivityAt(
  dates: Array<Date | null | undefined>,
) {
  const timestamps = dates
    .filter((date): date is Date => date instanceof Date)
    .map((date) => date.getTime());

  if (!timestamps.length) {
    throw new RangeError("At least one lead activity date is required");
  }

  return new Date(Math.max(...timestamps));
}

export function buildLeadInactivityWhere(
  staleSince: Date,
): Prisma.LeadWhereInput {
  return { lastActivityAt: { lte: staleSince } };
}

export async function touchLeadActivity(
  tx: Pick<Prisma.TransactionClient, "lead">,
  leadId: string,
  lastActivityAt: Date,
) {
  return updateLeadUnlessPrivacyLocked(tx, leadId, { lastActivityAt });
}

export async function updateLeadUnlessPrivacyLocked(
  tx: Pick<Prisma.TransactionClient, "lead">,
  leadId: string,
  data: Prisma.LeadUpdateManyMutationInput,
) {
  const updated = await tx.lead.updateMany({
    where: { id: leadId, privacyErasureRequestedAt: null },
    data,
  });
  if (updated.count !== 1) throw new LeadPrivacyLockedError();
  return { id: leadId };
}
