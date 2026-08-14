import type { Prisma } from "@prisma/client";
import { getLeadCommercialReading } from "@/lib/lead-utils";

export const LEAD_REPORTING_BATCH_SIZE = 500;

export const leadCommercialReportingSelect = {
  id: true,
  name: true,
  areaM2: true,
  budgetRange: true,
  city: true,
  createdAt: true,
  currentStatus: true,
  hasPlans: true,
  message: true,
  needsVisit: true,
  projectType: true,
  referenceLinks: true,
  startDate: true,
} satisfies Prisma.LeadSelect;

export type LeadCommercialReportingRecord = Prisma.LeadGetPayload<{
  select: typeof leadCommercialReportingSelect;
}>;

export type LeadCommercialReportingPageRequest = {
  cursor?: Prisma.LeadWhereUniqueInput;
  orderBy: Prisma.LeadOrderByWithRelationInput;
  select: typeof leadCommercialReportingSelect;
  skip?: number;
  take: number;
  where: Prisma.LeadWhereInput;
};

type FetchLeadCommercialReportingPage = (
  request: LeadCommercialReportingPageRequest,
) => Promise<LeadCommercialReportingRecord[]>;

type HighPriorityLead = {
  lead: LeadCommercialReportingRecord;
  reading: ReturnType<typeof getLeadCommercialReading>;
};

export async function summarizeLeadCommercialReport({
  batchSize = LEAD_REPORTING_BATCH_SIZE,
  fetchPage,
  where,
}: {
  batchSize?: number;
  fetchPage: FetchLeadCommercialReportingPage;
  where: Prisma.LeadWhereInput;
}) {
  assertBatchSize(batchSize);

  let cursorId: string | undefined;
  let evaluatedCount = 0;
  let highPriorityCount = 0;
  let scoreTotal = 0;
  const reasonCounts = new Map<string, number>();
  const highPriorityLeads: HighPriorityLead[] = [];

  while (true) {
    const leads = await fetchPage({
      where,
      orderBy: { id: "asc" },
      select: leadCommercialReportingSelect,
      take: batchSize,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    for (const lead of leads) {
      const reading = getLeadCommercialReading(lead);
      evaluatedCount += 1;
      scoreTotal += reading.score;

      for (const reason of reading.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      }

      if (reading.label === "Alta") {
        highPriorityCount += 1;
        highPriorityLeads.push({ lead, reading });
        highPriorityLeads.sort(compareHighPriorityLeads);
        if (highPriorityLeads.length > 5) highPriorityLeads.pop();
      }
    }

    if (leads.length < batchSize) break;
    cursorId = leads.at(-1)?.id;
    if (!cursorId) break;
  }

  return {
    averageScore: evaluatedCount ? Math.round(scoreTotal / evaluatedCount) : 0,
    evaluatedCount,
    highPriorityCount,
    highPriorityLeads,
    topReasons: Array.from(reasonCounts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es"))
      .slice(0, 5),
  };
}

function compareHighPriorityLeads(a: HighPriorityLead, b: HighPriorityLead) {
  return (
    b.reading.score - a.reading.score ||
    b.lead.createdAt.getTime() - a.lead.createdAt.getTime() ||
    a.lead.id.localeCompare(b.lead.id)
  );
}

function assertBatchSize(batchSize: number) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("Reporting batch size must be a positive integer");
  }
}
