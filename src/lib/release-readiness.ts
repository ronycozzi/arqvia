import type { PublicClientConfig } from "@/lib/client-config";
import { readLeadAutomationConfig } from "@/lib/lead-automation-config";
import {
  hasExplicitLeadRetentionEnvironment,
  readLeadRetentionConfig,
} from "@/lib/lead-retention-config";

type Environment = Record<string, string | undefined>;

export type ReleaseContentSnapshot = {
  areas: number;
  blogPosts: number;
  clientConfigs: number;
  faqs: number;
  homeContents: number;
  institutionalPages: number;
  leadIdentityBacklog: number;
  privateObjectDeletionBacklog: number;
  privacyErasureBacklog: number;
  localMedia: number;
  legalLatestUpdatedAt: string | null;
  legalPages: number;
  legalPageSlugs: string[];
  projects: number;
  publicMedia: number;
  seedMedia: number;
  services: number;
  teamMembers: number;
  testimonials: number;
  technicalVisitBacklog: number;
  unapprovedPublicMedia: number;
  untrackedPublicMedia: number;
};

export type ReleaseGateInput = {
  config: PublicClientConfig;
  content: ReleaseContentSnapshot;
  env: Environment;
  estimator: { enabled: boolean; version: number } | null;
};

export type ReleaseCheck = {
  detail: string;
  id: string;
  label: string;
  ok: boolean;
};

export type ReleaseGateResult = {
  checks: ReleaseCheck[];
  failed: ReleaseCheck[];
  ready: boolean;
};

const blockedHosts = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

const placeholderPhones = new Set([
  "543515551234",
  "543510000000",
  "5493510000000",
  "5493515551234",
]);

const placeholderSecrets = [
  "change-me",
  "changeme",
  "replace-with",
  "development-secret",
  "ci-production-secret",
];

function finalOrigin(value: string | undefined) {
  try {
    const url = new URL(value || "");
    const hostname = url.hostname.toLowerCase();
    const blocked =
      url.protocol !== "https:" ||
      blockedHosts.has(hostname) ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".invalid") ||
      hostname.includes("example") ||
      Boolean(url.username || url.password || url.search || url.hash);

    return blocked ? null : url.origin;
  } catch {
    return null;
  }
}

function phoneDigits(value: string | undefined) {
  return (value || "").replace(/\D/g, "");
}

function realPhone(value: string | undefined) {
  const digits = phoneDigits(value);
  return digits.length >= 10 && digits.length <= 15 && !placeholderPhones.has(digits);
}

function strongSecret(value: string | undefined) {
  const secret = value?.trim() || "";
  const normalized = secret.toLowerCase();
  return (
    secret.length >= 32 &&
    !placeholderSecrets.some((placeholder) => normalized.includes(placeholder))
  );
}

function approved(env: Environment, prefix: string) {
  const by = env[`${prefix}_APPROVED_BY`]?.trim() || "";
  const rawDate = env[`${prefix}_APPROVED_AT`]?.trim() || "";
  const timestamp = Date.parse(rawDate);

  return by.length >= 3 && Number.isFinite(timestamp) && timestamp <= Date.now();
}

function approvedAfter(
  env: Environment,
  prefix: string,
  latestChange: string | null,
) {
  if (!approved(env, prefix) || !latestChange) return false;
  const approvedAt = Date.parse(env[`${prefix}_APPROVED_AT`]?.trim() || "");
  const changedAt = Date.parse(latestChange);
  return Number.isFinite(changedAt) && approvedAt >= changedAt;
}

function check(
  id: string,
  label: string,
  ok: boolean,
  detail: string,
): ReleaseCheck {
  return { detail, id, label, ok };
}

export function buildReleaseGate({
  config,
  content,
  env,
  estimator,
}: ReleaseGateInput): ReleaseGateResult {
  const siteOrigin = finalOrigin(env.NEXT_PUBLIC_SITE_URL);
  const authOrigin = finalOrigin(env.AUTH_URL);
  const envWhatsapp = phoneDigits(env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  const configWhatsapp = phoneDigits(config.whatsapp);
  const databaseUrl = env.DATABASE_URL?.trim().toLowerCase() || "";
  const publicMediaUrl = finalOrigin(env.S3_PUBLIC_BASE_URL);
  const automation = readLeadAutomationConfig(env);
  const retention = readLeadRetentionConfig(env);
  const analyticsProvider = env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim() || "none";
  const analyticsId = env.NEXT_PUBLIC_ANALYTICS_ID?.trim() || "";
  const analyticsReady =
    (analyticsProvider === "ga4" && /^G-[A-Z0-9]{4,20}$/i.test(analyticsId)) ||
    (analyticsProvider === "gtm" && /^GTM-[A-Z0-9]{4,20}$/i.test(analyticsId));
  const approvedEstimatorVersion = Number(
    env.ARQVIA_ESTIMATOR_APPROVED_VERSION,
  );
  const contentMinimumsOk =
    content.projects >= 3 &&
    content.services >= 4 &&
    content.blogPosts >= 3 &&
    content.faqs >= 5 &&
    content.areas >= 1 &&
    content.teamMembers >= 1 &&
    content.testimonials >= 1;
  const contactOk =
    realPhone(config.whatsapp) &&
    envWhatsapp === configWhatsapp &&
    realPhone(config.phone) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email) &&
    !config.email.toLowerCase().includes("example") &&
    !config.email.toLowerCase().endsWith(".local") &&
    config.address.trim().length >= 8 &&
    config.businessHours.trim().length >= 8;
  const mediaRightsApproved = approved(env, "ARQVIA_MEDIA_RIGHTS");
  const requiredLegalSlugs = [
    "aviso-presupuestos",
    "cookies",
    "privacidad",
    "terminos",
  ];
  const legalSlugsReady = requiredLegalSlugs.every((slug) =>
    content.legalPageSlugs.includes(slug),
  );
  const mediaRightsDetail = [
    content.unapprovedPublicMedia > 0
      ? `${content.unapprovedPublicMedia} de ${content.publicMedia} recurso(s) visual(es) público(s) no tienen aprobación válida.`
      : "",
    content.untrackedPublicMedia > 0
      ? `${content.untrackedPublicMedia} referencia(s) pública(s) no tienen ficha en la biblioteca visual.`
      : "",
    !mediaRightsApproved
      ? "Falta registrar la revisión global de derechos."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const checks = [
    check(
      "RG-ENV-001",
      "Dominio final",
      env.ARQVIA_STRICT_PUBLIC_URL === "true" &&
        Boolean(siteOrigin) &&
        siteOrigin === authOrigin,
      "Activa el modo estricto y usa el mismo origen HTTPS final en NEXT_PUBLIC_SITE_URL y AUTH_URL.",
    ),
    check(
      "RG-SECRET-001",
      "Secretos y bootstrap",
      strongSecret(env.AUTH_SECRET) &&
        env.ARQVIA_ALLOW_PRODUCTION_SEED !== "true" &&
        !env.ADMIN_PASSWORD,
      "Usa AUTH_SECRET robusto, desactiva el seed productivo y retira ADMIN_PASSWORD del runtime.",
    ),
    check(
      "RG-CONTACT-001",
      "Contacto comercial",
      contactOk && approved(env, "ARQVIA_CONTACT"),
      "WhatsApp, teléfono, email, dirección y horarios deben ser reales, coincidir y tener aprobación registrada.",
    ),
    check(
      "RG-DB-001",
      "Base productiva",
      databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"),
      "Configura DATABASE_URL con PostgreSQL y aplica las migraciones revisadas.",
    ),
    check(
      "RG-DATA-001",
      "Backfills operativos",
      content.leadIdentityBacklog === 0 &&
        content.technicalVisitBacklog === 0 &&
        content.privateObjectDeletionBacklog === 0 &&
        content.privacyErasureBacklog === 0,
      `Completá los trabajos de datos antes de publicar: ${content.leadIdentityBacklog} identidad(es), ${content.technicalVisitBacklog} visita(s), ${content.privacyErasureBacklog} borrado(s) de lead y ${content.privateObjectDeletionBacklog} objeto(s) privado(s) pendientes.`,
    ),
    check(
      "RG-STORAGE-001",
      "Medios persistentes",
      env.MEDIA_STORAGE_PROVIDER === "s3" &&
        Boolean(env.S3_BUCKET?.trim()) &&
        Boolean(env.S3_REGION?.trim()) &&
        Boolean(env.S3_ACCESS_KEY_ID?.trim()) &&
        Boolean(env.S3_SECRET_ACCESS_KEY?.trim()) &&
        strongSecret(env.PRIVATE_OBJECT_DELETION_CRON_SECRET) &&
        Boolean(publicMediaUrl) &&
        content.localMedia === 0 &&
        approved(env, "ARQVIA_STORAGE"),
      "Configura storage S3 compatible, el worker de borrado privado, elimina uploads locales y registra un smoke test real de subida, lectura y borrado.",
    ),
    check(
      "RG-ANALYTICS-001",
      "Medición consentida",
      analyticsReady,
      "Configura GA4 o Google Tag Manager con un identificador válido; el frontend pedirá consentimiento antes de cargarlo.",
    ),
    check(
      "RG-ABUSE-001",
      "Protección distribuida",
      env.RATE_LIMIT_STORE === "database" &&
        ["cloudflare", "vercel"].includes(
          env.TRUST_PROXY_PROVIDER || "",
        ),
      "Usa rate limit en base y declara el proveedor de proxy confiable.",
    ),
    check(
      "RG-CONTENT-001",
      "Contenido publicado",
      contentMinimumsOk &&
        content.clientConfigs === 1 &&
        content.homeContents === 1 &&
        content.institutionalPages === 2 &&
        content.seedMedia === 0 &&
        approved(env, "ARQVIA_CONTENT"),
      "Conserva una sola configuración, una sola home y las dos páginas institucionales administrables; cumple los mínimos editoriales, reemplaza medios seed y registra la aprobación de contenido.",
    ),
    check(
      "RG-MEDIA-001",
      "Derechos por recurso",
      content.unapprovedPublicMedia === 0 &&
        content.untrackedPublicMedia === 0 &&
        mediaRightsApproved,
      mediaRightsDetail ||
        "Cada recurso visual público debe tener ficha, evidencia de derechos, responsable y fecha de aprobación.",
    ),
    check(
      "RG-LEGAL-001",
      "Revisión legal",
      content.legalPages === requiredLegalSlugs.length &&
        legalSlugsReady &&
        approvedAfter(env, "ARQVIA_LEGAL", content.legalLatestUpdatedAt),
      "Publicá exactamente privacidad, términos, cookies y aviso de presupuestos; la aprobación debe ser posterior a la última modificación legal.",
    ),
    check(
      "RG-EST-001",
      "Estimador comercial",
      !estimator?.enabled ||
        (approved(env, "ARQVIA_ESTIMATOR") &&
          approvedEstimatorVersion === estimator.version),
      `El estimador versión ${estimator?.version ?? "sin configurar"} debe permanecer apagado o tener aprobación comercial vigente para esa misma versión.`,
    ),
    check(
      "RG-AUTOMATION-001",
      "Despacho de automatizaciones",
      !automation.dispatchEnabled ||
        (automation.dispatchReady && approved(env, "ARQVIA_AUTOMATION")),
      "La captura durable puede permanecer activa; para habilitar el despacho configura webhook, secretos, cron y la aprobación del smoke test externo.",
    ),
    check(
      "RG-RETENTION-001",
      "Retención de datos",
      hasExplicitLeadRetentionEnvironment(env) &&
        retention.issues.length === 0 &&
        (!retention.enabled || retention.ready),
      !hasExplicitLeadRetentionEnvironment(env)
        ? "Declará explícitamente LEAD_RETENTION_ENABLED, LEAD_RETENTION_DAYS, LEAD_RETENTION_BATCH_SIZE y DATA_RETENTION_CRON_SECRET en el entorno de despliegue."
        : retention.enabled && retention.issues.length
        ? retention.issues.join(" ")
        : "La retención puede permanecer apagada; para habilitarla exige parámetros válidos, un secreto de cron robusto y aprobación legal y operativa registrada.",
    ),
    check(
      "RG-OPS-001",
      "Operación y recuperación",
      approved(env, "ARQVIA_BACKUP_RESTORE") &&
        approved(env, "ARQVIA_PWA"),
      "Registra un ensayo de restauración y la validación PWA sobre HTTPS/dispositivos reales.",
    ),
  ];
  const failed = checks.filter((item) => !item.ok);

  return { checks, failed, ready: failed.length === 0 };
}
