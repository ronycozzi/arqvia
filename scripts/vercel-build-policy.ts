export type VercelBuildTarget = "preview" | "production";

export type BuildPolicyEnv = Record<string, string | undefined>;

/**
 * La compuerta de release (`build:release`) verifica lo que hace falta para
 * publicarle el sitio a un cliente: dominio propio, almacenamiento S3 con
 * credenciales, analítica con consentimiento, política de retención y la
 * revisión legal aprobada en base de datos.
 *
 * Nada de eso aplica mientras el proyecto vive en su subdominio de Vercel: ahí
 * no hay dominio final que proteger y la compuerta bloquea cada despliegue.
 * Por eso la condición no es un interruptor que haya que acordarse de activar
 * —se olvidaría justo el día del lanzamiento— sino el dominio publicado: en
 * cuanto `NEXT_PUBLIC_SITE_URL` deja de ser un `*.vercel.app`, la compuerta
 * vuelve a exigirse sola.
 */
function publicationHostname(env: BuildPolicyEnv) {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      return url.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  return null;
}

export function releaseGateApplies(env: BuildPolicyEnv = process.env) {
  const hostname = publicationHostname(env);
  // Sin host reconocible se falla cerrado: la compuerta se exige.
  if (!hostname) return true;
  return !hostname.endsWith(".vercel.app");
}

export function resolveVercelBuildScript(
  target: string | undefined,
  env: BuildPolicyEnv = process.env,
): "build:postgres" | "build:release" {
  if (target === "preview") return "build:postgres";
  if (target === "production") {
    return releaseGateApplies(env) ? "build:release" : "build:postgres";
  }

  throw new Error(
    "VERCEL_ENV must be preview or production before running the Vercel build.",
  );
}
