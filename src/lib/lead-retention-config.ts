export const leadRetentionDefaults = {
  batchSize: 25,
  days: 730,
} as const;

export function readLeadRetentionConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const enabled = env.LEAD_RETENTION_ENABLED?.trim().toLowerCase() === "true";
  const days = boundedInteger(
    env.LEAD_RETENTION_DAYS,
    leadRetentionDefaults.days,
    90,
    3_650,
  );
  const batchSize = boundedInteger(
    env.LEAD_RETENTION_BATCH_SIZE,
    leadRetentionDefaults.batchSize,
    1,
    100,
  );
  const cronSecret = env.DATA_RETENTION_CRON_SECRET?.trim() || "";
  const ready = enabled && cronSecret.length >= 32;

  return {
    batchSize,
    cronSecret,
    days,
    enabled,
    issues:
      enabled && cronSecret.length < 32
        ? ["DATA_RETENTION_CRON_SECRET debe tener al menos 32 caracteres."]
        : [],
    ready,
  };
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}
