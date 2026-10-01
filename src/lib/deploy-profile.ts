/**
 * Deploy profile.
 *
 * `ARQVIA_DEPLOY_PROFILE=demo` declares that this deployment is a showcase
 * served under a sub-path of somebody else's domain (for example
 * https://cozziinteractive.com/arqvia-demo), not a client launch. A demo keeps
 * the regular build: it does not need S3, analytics, legal approvals or the
 * client's real WhatsApp number.
 *
 * The profile is only honoured when the deployment really is a sub-path one:
 * `NEXT_PUBLIC_BASE_PATH` must be set and `NEXT_PUBLIC_SITE_URL` must be an
 * https URL whose path is exactly that base path. A client site on its own
 * domain lives at the root, so it can never qualify by accident and the
 * release gate keeps applying to it.
 *
 * No imports on purpose: build scripts and `public-env` both load this file.
 */

export type DeployProfileEnv = Record<string, string | undefined>;

function cleanPath(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function demoProfileRequested(env: DeployProfileEnv = process.env) {
  return env.ARQVIA_DEPLOY_PROFILE?.trim().toLowerCase() === "demo";
}

export function isDemoDeployProfile(env: DeployProfileEnv = process.env) {
  if (!demoProfileRequested(env)) return false;

  const basePath = cleanPath(env.NEXT_PUBLIC_BASE_PATH || "");
  if (!basePath.startsWith("/") || basePath.length < 2) return false;

  try {
    const site = new URL(env.NEXT_PUBLIC_SITE_URL?.trim() || "");
    return (
      site.protocol === "https:" &&
      !site.username &&
      !site.password &&
      !site.search &&
      !site.hash &&
      cleanPath(site.pathname) === basePath
    );
  } catch {
    return false;
  }
}

/**
 * True when `value` is a URL on the demo's public origin and inside its base
 * path (the site URL itself, or AUTH_URL = `<site>/api/auth`).
 */
export function isUrlInsideDemoBasePath(
  value: string | undefined,
  env: DeployProfileEnv = process.env,
) {
  if (!isDemoDeployProfile(env)) return false;

  try {
    const url = new URL(value?.trim() || "");
    const site = new URL(env.NEXT_PUBLIC_SITE_URL!.trim());
    const basePath = cleanPath(site.pathname);
    const pathname = cleanPath(url.pathname);
    return (
      url.origin === site.origin &&
      (pathname === basePath || pathname.startsWith(`${basePath}/`))
    );
  } catch {
    return false;
  }
}
