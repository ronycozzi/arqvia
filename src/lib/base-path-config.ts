/**
 * Build-time pieces of the base path setup used by `next.config.ts`.
 * Kept free of `@/` imports so the config file can load it directly.
 */

type OutsideRedirect = {
  basePath: false;
  destination: string;
  permanent: true;
  source: string;
};

function parsePublicSiteUrl(basePath: string, publicSiteUrl: string) {
  if (!basePath || !publicSiteUrl) return null;

  let site: URL;
  try {
    site = new URL(publicSiteUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid URL when NEXT_PUBLIC_BASE_PATH is set.");
  }

  if (site.pathname.replace(/\/+$/, "") !== basePath) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must end with the base path "${basePath}" when NEXT_PUBLIC_BASE_PATH is set (for example https://example.com${basePath}).`,
    );
  }

  return site;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * Redirects (308) for requests that reach the deployment outside its base
 * path, to the same path under the public site URL:
 *
 *   https://project.vercel.app/servicios -> https://example.com/base/servicios
 *
 * Nothing under the base path matches, so the app itself (pages, `/_next`,
 * `/api`) and the upstream rewrite never loop. Platform paths (`/_vercel`,
 * `/.well-known`) are left alone.
 */
export function outsideBasePathRedirects(
  basePath: string,
  publicSiteUrl: string,
): OutsideRedirect[] {
  const site = parsePublicSiteUrl(basePath, publicSiteUrl);
  if (!site) return [];

  const target = `${site.origin}${basePath}`;
  const firstSegment = basePath.split("/")[1];
  const excluded = [escapeRegex(firstSegment), "_vercel", "\\.well-known"]
    .map((segment) => `${segment}(?:/|$)`)
    .join("|");

  return [
    { basePath: false, destination: target, permanent: true, source: "/" },
    {
      basePath: false,
      destination: `${target}/:path`,
      permanent: true,
      source: `/:path((?!${excluded}).+)`,
    },
  ];
}

/**
 * Hosts allowed to invoke Server Actions besides the deployment host: the
 * public host of a base path deployment and its www/apex sibling. At the
 * domain root nothing is added and Next keeps its same-origin rule.
 */
export function serverActionAllowedOrigins(
  basePath: string,
  publicSiteUrl: string,
) {
  const site = parsePublicSiteUrl(basePath, publicSiteUrl);
  if (!site) return [];

  const host = site.host.toLowerCase();
  const sibling = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const isNamedHost = /[a-z]/.test(site.hostname) && site.hostname.includes(".");

  return isNamedHost ? [host, sibling] : [host];
}
