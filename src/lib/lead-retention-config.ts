export const leadRetentionDefaults = {
  batchSize: 25,
  days: 730,
} as const;

const requiredLeadRetentionEnvironment = [
  "LEAD_RETENTION_ENABLED",
  "LEAD_RETENTION_DAYS",
  "LEAD_RETENTION_BATCH_SIZE",
  "DATA_RETENTION_CRON_SECRET",
] as const;

export function hasExplicitLeadRetentionEnvironment(
  env: Record<string, string | undefined>,
) {
  return requiredLeadRetentionEnvironment.every(
    (name) =>
      Object.prototype.hasOwnProperty.call(env, name) && env[name] !== undefined,
  );
}

function recordedApproval(
  env: Record<string, string | undefined>,
  prefix: string,
) {
  const approvedBy = env[`${prefix}_APPROVED_BY`]?.trim() || "";
  const approvedAt = env[`${prefix}_APPROVED_AT`]?.trim() || "";
  const timestamp = Date.parse(approvedAt);

  return (
    approvedBy.length >= 3 &&
    Number.isFinite(timestamp) &&
    timestamp <= Date.now()
  );
}

export function readLeadRetentionConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const enabledValue = env.LEAD_RETENTION_ENABLED?.trim().toLowerCase();
  const enabled = enabledValue === "true";
  const enabledValid =
    enabledValue === undefined ||
    enabledValue === "" ||
    enabledValue === "true" ||
    enabledValue === "false";
  const daysResult = strictBoundedInteger(
    env.LEAD_RETENTION_DAYS,
    leadRetentionDefaults.days,
    90,
    3_650,
  );
  const batchSizeResult = strictBoundedInteger(
    env.LEAD_RETENTION_BATCH_SIZE,
    leadRetentionDefaults.batchSize,
    1,
    100,
  );
  const cronSecret = env.DATA_RETENTION_CRON_SECRET?.trim() || "";
  const approvalReady = recordedApproval(env, "ARQVIA_RETENTION");
  const issues = [
    ...(!enabledValid
      ? ["LEAD_RETENTION_ENABLED debe ser true o false."]
      : []),
    ...(!daysResult.valid
      ? ["LEAD_RETENTION_DAYS debe ser un entero entre 90 y 3650."]
      : []),
    ...(!batchSizeResult.valid
      ? ["LEAD_RETENTION_BATCH_SIZE debe ser un entero entre 1 y 100."]
      : []),
    ...(enabled && cronSecret.length < 32
      ? ["DATA_RETENTION_CRON_SECRET debe tener al menos 32 caracteres."]
      : []),
    ...(enabled && !approvalReady
      ? [
          "La retención habilitada requiere ARQVIA_RETENTION_APPROVED_BY y ARQVIA_RETENTION_APPROVED_AT válidos.",
        ]
      : []),
  ];
  const ready = enabled && issues.length === 0;

  return {
    approvalReady,
    batchSize: batchSizeResult.value,
    cronSecret,
    days: daysResult.value,
    enabled,
    issues,
    ready,
  };
}

function strictBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (value === undefined) return { valid: true, value: fallback };

  const normalized = value.trim();
  const parsed = Number(normalized);
  const valid =
    normalized.length > 0 &&
    Number.isInteger(parsed) &&
    parsed >= minimum &&
    parsed <= maximum;

  return { valid, value: valid ? parsed : fallback };
}
