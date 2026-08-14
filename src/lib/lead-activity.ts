import type { Prisma } from "@prisma/client";

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
  return tx.lead.update({
    where: { id: leadId },
    data: { lastActivityAt },
    select: { id: true },
  });
}
