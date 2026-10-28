type OriginEnv = Record<string, string | undefined>;

/**
 * Origins that may send state-changing requests besides the one in the Host
 * header.
 *
 * When the app is served through a reverse proxy or a rewrite from another
 * domain (https://cozziinteractive.com/arqvia-demo -> *.vercel.app), the
 * browser sends `Origin: https://cozziinteractive.com` while the app sees its
 * own deployment host. The public origin is taken from `NEXT_PUBLIC_SITE_URL`,
 * an explicit operator setting: forwarded headers such as `x-forwarded-host`
 * are client-controllable and are deliberately not trusted here.
 */
export function trustedOrigins(env: OriginEnv = process.env) {
  const origins = new Set<string>();

  try {
    const site = new URL(env.NEXT_PUBLIC_SITE_URL?.trim() || "");
    if (
      (site.protocol === "https:" || site.protocol === "http:") &&
      !site.username &&
      !site.password
    ) {
      origins.add(site.origin.toLowerCase());
    }
  } catch {
    // No usable public URL: only the Host header is accepted.
  }

  return origins;
}

export function isTrustedOrigin(origin: string, env: OriginEnv = process.env) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return trustedOrigins(env).has(url.origin.toLowerCase());
  } catch {
    return false;
  }
}

export function isSameOriginRequest(
  request: Request,
  options: { requireSource?: boolean } = {},
) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!host) return false;

  const matchesHost = (url: URL) => {
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    try {
      return (
        url.host.toLowerCase() ===
        new URL(`${url.protocol}//${host}`).host.toLowerCase()
      );
    } catch {
      return false;
    }
  };
  const isAllowed = (url: URL) => matchesHost(url) || isTrustedOrigin(url.origin);

  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) return !options.requireSource;

    try {
      const refererUrl = new URL(referer);
      return isAllowed(refererUrl);
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    return (
      isAllowed(originUrl) &&
      originUrl.pathname === "/" &&
      !originUrl.search &&
      !originUrl.hash
    );
  } catch {
    return false;
  }
}

export function isJsonRequest(request: Request) {
  return requestMediaType(request) === "application/json";
}

export function isMultipartRequest(request: Request) {
  return requestMediaType(request) === "multipart/form-data";
}

function requestMediaType(request: Request) {
  return (request.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}
