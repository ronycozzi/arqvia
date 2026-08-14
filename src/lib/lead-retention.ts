import "server-only";

import { prisma } from "@/lib/db";
import { eraseLeadData } from "@/lib/lead-privacy";
import { readLeadRetentionConfig } from "@/lib/lead-retention-config";
import { logServerError } from "@/lib/logger";

export {
  leadRetentionDefaults,
  readLeadRetentionConfig,
} from "@/lib/lead-retention-config";

export const leadRetentionAudit = {
  action: "RETENTION_ERASURE",
  entity: "DataRetention",
  summary: "Consulta eliminada por política de retención.",
} as const;

export async function processLeadRetentionBatch(now = new Date()) {
  const config = readLeadRetentionConfig();
  if (!config.ready) {
    return {
      configuration: config.enabled ? "invalid" : "disabled",
      deleted: 0,
      failed: 0,
      processed: 0,
    } as const;
  }

  const cutoff = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1_000);
  const candidates = await prisma.lead.findMany({
    where: {
      lastActivityAt: { lt: cutoff },
      status: "LOST",
    },
    orderBy: [{ lastActivityAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: config.batchSize,
  });

  let deleted = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      await eraseLeadData({
        actorUserId: null,
        audit: leadRetentionAudit,
        leadId: candidate.id,
      });
      deleted += 1;
    } catch (error) {
      failed += 1;
      logServerError("lead.retention_erasure_failed", error);
    }
  }

  return {
    configuration: "ready" as const,
    deleted,
    failed,
    processed: candidates.length,
  };
}
