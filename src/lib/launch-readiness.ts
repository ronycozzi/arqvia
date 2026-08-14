import type { PublicClientConfig } from "@/lib/client-config";

export type LaunchReadinessCheck = {
  action: string;
  detail: string;
  href: string;
  label: string;
  ok: boolean;
  weight: number;
};

export type LaunchReadinessResult = {
  checks: LaunchReadinessCheck[];
  label: string;
  nextActions: LaunchReadinessCheck[];
  score: number;
  status: "ready" | "review" | "blocked";
  summary: string;
};

export type LaunchReadinessInput = {
  config: PublicClientConfig;
  distributedRateLimitReady?: boolean;
  homeContentReady?: boolean;
  institutionalPagesReady?: boolean;
  legalPagesReady?: boolean;
  persistentMediaStorageReady?: boolean;
  productionDatabaseReady?: boolean;
  trustedProxyReady?: boolean;
  siteUrl: string;
  strictPublicUrlEnabled?: boolean;
};

const placeholderPhones = new Set([
  "5493510000000",
  "543510000000",
  "5493515551234",
]);

function isPublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "::1" &&
      hostname !== "0.0.0.0" &&
      !hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function isRealWhatsApp(value: string) {
  const digits = cleanPhone(value);

  return digits.length >= 10 && !placeholderPhones.has(digits);
}

function isCommercialEmail(value: string) {
  const email = value.trim().toLowerCase();

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    !email.endsWith(".local") &&
    !email.includes("example.") &&
    !email.includes("test@")
  );
}

function ratioScore(checks: LaunchReadinessCheck[]) {
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const passed = checks.reduce(
    (sum, check) => sum + (check.ok ? check.weight : 0),
    0,
  );

  return total ? Math.round((passed / total) * 100) : 0;
}

export function buildLaunchReadiness({
  config,
  distributedRateLimitReady = false,
  homeContentReady = false,
  institutionalPagesReady = false,
  legalPagesReady = false,
  persistentMediaStorageReady = false,
  productionDatabaseReady = false,
  trustedProxyReady = false,
  siteUrl,
  strictPublicUrlEnabled = false,
}: LaunchReadinessInput): LaunchReadinessResult {
  const whatsappDigits = cleanPhone(config.whatsapp);
  const checks: LaunchReadinessCheck[] = [
    {
      label: "Dominio publico",
      ok: isPublicHttpsUrl(siteUrl),
      detail: isPublicHttpsUrl(siteUrl)
        ? `El sitio usa ${siteUrl} para canonical, Open Graph, JSON-LD y sitemap.`
        : "Configura NEXT_PUBLIC_SITE_URL con el dominio https final antes de publicar.",
      href: "/admin/settings",
      action: "Revisar dominio",
      weight: 20,
    },
    {
      label: "Bloqueo anti-localhost",
      ok: strictPublicUrlEnabled,
      detail: strictPublicUrlEnabled
        ? "El entorno puede bloquear despliegues con URL local."
        : "Activa ARQVIA_STRICT_PUBLIC_URL=true en hosting para evitar publicar canonical de desarrollo.",
      href: "/admin/settings",
      action: "Activar guardrail",
      weight: 12,
    },
    {
      label: "WhatsApp comercial",
      ok: isRealWhatsApp(config.whatsapp),
      detail: isRealWhatsApp(config.whatsapp)
        ? `WhatsApp configurado con ${whatsappDigits.length} digitos.`
        : "Reemplaza el numero inicial por el WhatsApp comercial del cliente.",
      href: "/admin/settings",
      action: "Configurar WhatsApp",
      weight: 16,
    },
    {
      label: "Email de contacto",
      ok: isCommercialEmail(config.email),
      detail: isCommercialEmail(config.email)
        ? `Email visible: ${config.email}.`
        : "Usa un email comercial real; evita dominios .local, example o cuentas de prueba.",
      href: "/admin/settings",
      action: "Actualizar email",
      weight: 12,
    },
    {
      label: "Contacto completo",
      ok:
        cleanPhone(config.phone).length >= 8 &&
        config.address.trim().length >= 8 &&
        config.businessHours.trim().length >= 8,
      detail:
        cleanPhone(config.phone).length >= 8 &&
        config.address.trim().length >= 8 &&
        config.businessHours.trim().length >= 8
          ? "Telefono, zona/direccion y horarios estan visibles."
          : "Completa telefono, zona/direccion y horarios para sostener confianza.",
      href: "/admin/settings",
      action: "Completar contacto",
      weight: 12,
    },
    {
      label: "Primera pantalla",
      ok:
        config.companyName.trim().length >= 2 &&
        config.heroTitle.trim().length >= 18 &&
        config.heroSubtitle.trim().length >= 40 &&
        config.heroImage.trim().length >= 8,
      detail:
        config.companyName.trim().length >= 2 &&
        config.heroTitle.trim().length >= 18 &&
        config.heroSubtitle.trim().length >= 40 &&
        config.heroImage.trim().length >= 8
          ? "Nombre, titular, bajada e imagen principal estan definidos."
          : "Completa nombre, titular, bajada e imagen principal de la home.",
      href: "/admin/settings",
      action: "Revisar hero",
      weight: 14,
    },
    {
      label: "Contenido de la home",
      ok: homeContentReady,
      detail: homeContentReady
        ? "Métricas, secciones, proceso, cierre y SEO se administran desde el CMS."
        : "Inicializa y revisa el contenido estructurado de la home antes de publicar.",
      href: "/admin/home",
      action: "Revisar home",
      weight: 10,
    },
    {
      label: "Páginas institucionales",
      ok: institutionalPagesReady,
      detail: institutionalPagesReady
        ? "Nosotros y Proceso están inicializadas y administradas desde el CMS."
        : "Inicializa y revisa Nosotros y Proceso antes del lanzamiento.",
      href: "/admin/pages",
      action: "Revisar páginas",
      weight: 8,
    },
    {
      label: "Acciones de conversion",
      ok:
        config.primaryCtaLabel.trim().length >= 6 &&
        config.secondaryCtaLabel.trim().length >= 6,
      detail:
        config.primaryCtaLabel.trim().length >= 6 &&
        config.secondaryCtaLabel.trim().length >= 6
          ? `CTAs activos: ${config.primaryCtaLabel} / ${config.secondaryCtaLabel}.`
          : "Define CTA principal y secundario claros para la home.",
      href: "/admin/settings",
      action: "Ajustar CTAs",
      weight: 14,
    },
    {
      label: "Base de datos de produccion",
      ok: productionDatabaseReady,
      detail: productionDatabaseReady
        ? "La operacion usa PostgreSQL, apto para persistencia y concurrencia en hosting."
        : "Migra DATABASE_URL a PostgreSQL y ejecuta migraciones antes de recibir consultas reales.",
      href: "/admin/settings",
      action: "Preparar PostgreSQL",
      weight: 15,
    },
    {
      label: "Documentos legales",
      ok: legalPagesReady,
      detail: legalPagesReady
        ? "Privacidad, terminos, cookies y aviso de presupuestos estan publicados desde el CMS."
        : "Revisa y publica los cuatro documentos institucionales antes del lanzamiento.",
      href: "/admin/legal",
      action: "Revisar legales",
      weight: 10,
    },
    {
      label: "Imagenes persistentes",
      ok: persistentMediaStorageReady,
      detail: persistentMediaStorageReady
        ? "La biblioteca visual usa almacenamiento S3 compatible con URLs estables."
        : "Configura MEDIA_STORAGE_PROVIDER=s3 para que las imagenes sobrevivan a cada despliegue.",
      href: "/admin/media",
      action: "Configurar storage",
      weight: 10,
    },
    {
      label: "Proteccion antiabuso distribuida",
      ok: distributedRateLimitReady,
      detail: distributedRateLimitReady
        ? "El limite de consultas se comparte entre instancias mediante la base de datos."
        : "Configura RATE_LIMIT_STORE=database en produccion para compartir limites entre instancias.",
      href: "/admin/settings",
      action: "Distribuir rate limit",
      weight: 8,
    },
    {
      label: "Proxy de confianza",
      ok: trustedProxyReady,
      detail: trustedProxyReady
        ? "La aplicacion solo interpreta cabeceras de IP del proxy configurado."
        : "Configura TRUST_PROXY_PROVIDER para que los limites por IP no acepten cabeceras falsificadas.",
      href: "/admin/settings",
      action: "Configurar proxy",
      weight: 7,
    },
  ];

  const score = ratioScore(checks);
  const criticalInfrastructureReady =
    productionDatabaseReady &&
    persistentMediaStorageReady &&
    distributedRateLimitReady &&
    trustedProxyReady;
  const status =
    score >= 86 && criticalInfrastructureReady
      ? "ready"
      : score >= 64
        ? "review"
        : "blocked";

  return {
    checks,
    label:
      status === "ready"
        ? "Publicacion lista"
        : status === "review"
          ? "Faltan ajustes de publicacion"
          : "No publicar todavia",
    nextActions: checks.filter((check) => !check.ok).slice(0, 4),
    score,
    status,
    summary:
      status === "ready"
        ? "La configuracion publica esta preparada para salir a produccion con dominio, contacto y CTAs consistentes."
        : status === "review"
          ? "El sitio puede seguir revisandose internamente, pero conviene resolver estos puntos antes de publicar."
          : "Hay riesgos de publicacion que pueden afectar SEO, confianza o conversion.",
  };
}
