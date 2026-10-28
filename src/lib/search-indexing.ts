import type { Metadata } from "next";

/** Preview and local installations must not compete with the public site. */
export function isSearchIndexable(siteUrl: string, env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") return false;
  try {
    const host = new URL(siteUrl).hostname.toLowerCase();
    return !["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(host) && !host.endsWith(".local");
  } catch {
    return false;
  }
}

export function publicSearchRobots(siteUrl: string, env: Record<string, string | undefined> = process.env): Metadata["robots"] {
  return isSearchIndexable(siteUrl, env)
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
    : { index: false, follow: true };
}
