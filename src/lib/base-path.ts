/**
 * Single source of truth for the sub-path the app is served under.
 *
 * `NEXT_PUBLIC_BASE_PATH` is a build-time variable (for example
 * "/arqvia-demo"). Empty or unset means the app lives at the domain root.
 * `next/link`, `redirect()` and the router already prepend `basePath`; every
 * other URL the app writes by hand (fetch, plain anchors, image sources,
 * manifest, cookies) has to go through these helpers.
 *
 * This module must stay free of imports: `next.config.ts` loads it too.
 */

export function normalizeBasePath(value: string | undefined | null) {
  const trimmed = (value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (!/^(?:\/[a-z0-9][a-z0-9._-]*)+$/i.test(trimmed)) {
    throw new Error(
      'NEXT_PUBLIC_BASE_PATH must look like "/segment" (letters, digits, ".", "_" or "-"), without a trailing slash.',
    );
  }
  return trimmed;
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

function isRootRelative(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

function hasBasePath(path: string, base: string) {
  return (
    path === base ||
    path.startsWith(`${base}/`) ||
    path.startsWith(`${base}?`) ||
    path.startsWith(`${base}#`)
  );
}

/**
 * Prefixes a root-relative path with the base path. Absolute URLs,
 * protocol-relative URLs, anchors, `data:`/`blob:` sources and paths that
 * already carry the prefix are returned untouched, so the call is idempotent.
 */
export function withBasePath(path: string, base: string = basePath) {
  if (!base || !isRootRelative(path) || hasBasePath(path, base)) return path;
  if (path === "/") return base;
  if (path.startsWith("/?") || path.startsWith("/#")) {
    return `${base}${path.slice(1)}`;
  }
  return `${base}${path}`;
}

/** Inverse of `withBasePath`: returns the app-relative path. */
export function stripBasePath(path: string, base: string = basePath) {
  if (!base || !hasBasePath(path, base)) return path;
  const rest = path.slice(base.length);
  if (!rest) return "/";
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** Cookie `Path` that confines a cookie to this app on a shared domain. */
export function cookiePath(base: string = basePath) {
  return base || "/";
}

/**
 * Joins the public site URL (which already contains the base path) with an
 * app-relative path. `new URL("/x", "https://host/base")` would drop "/base".
 */
export function joinSiteUrl(siteUrl: string, pathOrUrl: string) {
  if (!isRootRelative(pathOrUrl)) return new URL(pathOrUrl, siteUrl).toString();
  const site = new URL(siteUrl);
  const sitePath = site.pathname.replace(/\/+$/, "");
  if (!sitePath) return new URL(pathOrUrl, site.origin).toString();
  return new URL(withBasePath(pathOrUrl, sitePath), site.origin).toString();
}
