import { getInfrastructureReadiness } from "@/lib/infrastructure-readiness";
import { readLeadAutomationConfig } from "@/lib/lead-automation-config";
import { readLeadRetentionConfig } from "@/lib/lead-retention-config";
import { getMediaStorageStatus } from "@/lib/media-storage";

type Environment = Record<string, string | undefined>;

export type SystemReadinessState = "attention" | "disabled" | "ready";

export type SystemReadinessCheck = {
  detail: string;
  href: string;
  id: string;
  label: string;
  state: SystemReadinessState;
};

export type SystemReadiness = {
  attentionCount: number;
  checks: SystemReadinessCheck[];
  databaseProvider: "PostgreSQL" | "SQLite" | "Sin identificar";
  environmentLabel: string;
  readyCount: number;
  summary: string;
};

function isDeployedProduction(env: Environment) {
  let publicUrlReady = false;
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || "");
    publicUrlReady =
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname) &&
      !url.hostname.endsWith(".local");
  } catch {
    publicUrlReady = false;
  }

  return (
    env.VERCEL_ENV === "production" ||
    env.RENDER === "true" ||
    env.RAILWAY_ENVIRONMENT === "production" ||
    (env.NODE_ENV === "production" && publicUrlReady)
  );
}

function approvalRecorded(env: Environment, prefix: string) {
  const approvedBy = env[`${prefix}_APPROVED_BY`]?.trim() || "";
  const approvedAt = Date.parse(env[`${prefix}_APPROVED_AT`]?.trim() || "");
  return approvedBy.length >= 3 && Number.isFinite(approvedAt) && approvedAt <= Date.now();
}

function databaseProvider(env: Environment): SystemReadiness["databaseProvider"] {
  const url = env.DATABASE_URL?.trim().toLowerCase() || "";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return "PostgreSQL";
  }
  if (url.startsWith("file:")) return "SQLite";
  return "Sin identificar";
}

function analyticsState(env: Environment): SystemReadinessState {
  const provider = env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim().toLowerCase() || "none";
  const id = env.NEXT_PUBLIC_ANALYTICS_ID?.trim() || "";

  if (provider === "none") return "disabled";
  if (provider === "ga4" && /^G-[A-Z0-9]{4,20}$/i.test(id)) return "ready";
  if (provider === "gtm" && /^GTM-[A-Z0-9]{4,20}$/i.test(id)) return "ready";
  return "attention";
}

export function buildSystemReadiness({
  databaseConnected,
  env = process.env,
}: {
  databaseConnected: boolean;
  env?: Environment;
}): SystemReadiness {
  const infrastructure = getInfrastructureReadiness(env);
  const storage = getMediaStorageStatus(env);
  const automation = readLeadAutomationConfig(env);
  const retention = readLeadRetentionConfig(env);
  const production = isDeployedProduction(env);
  const productionBuild = env.NODE_ENV === "production";
  const analytics = analyticsState(env);
  const strictUrl = env.ARQVIA_STRICT_PUBLIC_URL === "true";
  const provider = databaseProvider(env);
  const retentionApproved = approvalRecorded(env, "ARQVIA_RETENTION");
  const backupRestoreApproved = approvalRecorded(
    env,
    "ARQVIA_BACKUP_RESTORE",
  );

  const checks: SystemReadinessCheck[] = [
    {
      id: "database-connection",
      label: "Conexión de base de datos",
      state: databaseConnected ? "ready" : "attention",
      detail: databaseConnected
        ? "La aplicación puede consultar la base y sus tablas esenciales."
        : "La base no respondió. Revisá DATABASE_URL, disponibilidad y migraciones.",
      href: "/admin/activity",
    },
    {
      id: "database-persistence",
      label: "Persistencia de producción",
      state: infrastructure.productionDatabaseReady ? "ready" : "attention",
      detail: infrastructure.productionDatabaseReady
        ? "PostgreSQL está configurado para concurrencia y persistencia en hosting."
        : "SQLite sirve para desarrollo local; antes de publicar, migrá a PostgreSQL.",
      href: "/admin/settings",
    },
    {
      id: "media-storage",
      label: "Almacenamiento de imágenes",
      state: infrastructure.persistentMediaStorageReady ? "ready" : "attention",
      detail: infrastructure.persistentMediaStorageReady
        ? "La biblioteca usa almacenamiento persistente compatible con S3."
        : `El proveedor actual es ${storage.provider}; los archivos locales no sobreviven a todos los despliegues.`,
      href: "/admin/media",
    },
    {
      id: "abuse-protection",
      label: "Protección distribuida",
      state:
        infrastructure.distributedRateLimitReady && infrastructure.trustedProxyReady
          ? "ready"
          : "attention",
      detail:
        infrastructure.distributedRateLimitReady && infrastructure.trustedProxyReady
          ? "El límite de solicitudes comparte estado y reconoce un proxy confiable."
          : "Configurá rate limit en base y el proveedor de proxy antes de recibir tráfico real.",
      href: "/admin/settings",
    },
    {
      id: "public-url-guard",
      label: "Guardia de URL pública",
      state: strictUrl ? "ready" : production ? "attention" : "disabled",
      detail: strictUrl
        ? "El despliegue bloquea URLs locales en canonical, autenticación y metadatos."
        : production
          ? "ARQVIA_STRICT_PUBLIC_URL debe estar activo en producción."
          : "Desactivada en desarrollo local; debe activarse al publicar.",
      href: "/admin/settings",
    },
    {
      id: "analytics",
      label: "Analítica consentida",
      state: analytics,
      detail:
        analytics === "ready"
          ? "El proveedor de analítica tiene un identificador válido y respeta el consentimiento."
          : analytics === "disabled"
            ? "La analítica está desactivada; el sitio funciona sin medición comercial."
            : "El proveedor está seleccionado, pero su identificador no es válido.",
      href: "/admin/settings",
    },
    {
      id: "automations",
      label: "Automatizaciones de leads",
      state: automation.dispatchReady
        ? "ready"
        : automation.dispatchEnabled
          ? "attention"
          : "disabled",
      detail: automation.dispatchReady
        ? `Los envíos están listos${automation.endpointHost ? ` hacia ${automation.endpointHost}` : ""}.`
        : automation.dispatchEnabled
          ? "Los envíos están habilitados, pero falta completar webhook, firma o cron."
          : automation.captureEnabled
            ? "La captura está activa y los envíos externos permanecen pausados."
            : "La integración externa está desactivada.",
      href: "/admin/automations",
    },
    {
      id: "retention",
      label: "Retención de consultas",
      state: retention.enabled
        ? retention.ready && retentionApproved
          ? "ready"
          : "attention"
        : "disabled",
      detail: retention.enabled
        ? retention.ready && retentionApproved
          ? `La retención está aprobada y procesa hasta ${retention.batchSize} consultas LOST con más de ${retention.days} días.`
          : "La retención está habilitada, pero falta secreto de cron o aprobación legal y operativa."
        : "La eliminación programada está apagada, que es el estado seguro inicial.",
      href: "/admin/activity",
    },
    {
      id: "backup-restore",
      label: "Backup y restauración",
      state: backupRestoreApproved ? "ready" : production ? "attention" : "disabled",
      detail: backupRestoreApproved
        ? "Existe una aprobación registrada para el último ensayo de restauración."
        : production
          ? "Falta registrar un restore real del proveedor antes de abrir campañas."
          : "Los ensayos locales no reemplazan el restore del proveedor de producción.",
      href: "/admin/activity",
    },
  ];

  const readyCount = checks.filter((check) => check.state === "ready").length;
  const attentionCount = checks.filter(
    (check) => check.state === "attention",
  ).length;

  return {
    attentionCount,
    checks,
    databaseProvider: provider,
    environmentLabel: production
      ? "Producción"
      : productionBuild
        ? "Build de producción local"
        : "Desarrollo local",
    readyCount,
    summary:
      attentionCount === 0
        ? "Los controles técnicos activos están listos."
        : `${attentionCount} control${attentionCount === 1 ? " requiere" : "es requieren"} atención antes de publicar.`,
  };
}
