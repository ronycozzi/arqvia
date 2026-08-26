import { fileURLToPath } from "node:url";
import path from "node:path";

const forbiddenPublicPhrases = [
  "campo editable",
  "cta contextual",
  "datos demo",
  "hero seleccionado",
  "lead listo",
  "marca demo",
  "pagina preparada para seo",
  "página preparada para seo",
  "reemplazar antes de publicar",
  "template premium",
  "texto editable",
];

const ignoredPathPrefixes = ["/_next", "/admin", "/api"];

export type PublicPageAudit = {
  canonical: string;
  issues: string[];
  links: string[];
  pathname: string;
  title: string;
};

export function resolveAuditOrigin(args: string[], environmentValue?: string) {
  let value = environmentValue || "http://localhost:3000";

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--url") {
      value = args[index + 1] || "";
      if (!value || value.startsWith("--")) {
        throw new Error("--url requires an HTTP(S) origin.");
      }
      index += 1;
      continue;
    }
    if (argument.startsWith("--url=")) {
      value = argument.slice("--url=".length);
      if (!value) throw new Error("--url requires an HTTP(S) origin.");
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Audit URL must be an HTTP(S) origin without credentials or query strings.");
  }

  return url.origin;
}

export function parseSitemapUrls(xml: string, origin: string) {
  const auditedOrigin = new URL(origin);
  const urls = Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi), (match) =>
    decodeHtml(match[1].trim()),
  );

  return urls
    .map((value) => new URL(value, origin))
    .filter(
      (url) =>
        url.origin === auditedOrigin.origin ||
        (url.hostname === auditedOrigin.hostname &&
          ["http:", "https:"].includes(url.protocol)),
    )
    .map((url) => url.pathname)
    .filter(isPublicPagePath);
}

export function auditPublicDocument({
  contentType,
  finalUrl,
  html,
  origin,
  requestedPath,
  status,
}: {
  contentType: string;
  finalUrl: string;
  html: string;
  origin: string;
  requestedPath: string;
  status: number;
}): PublicPageAudit {
  const issues: string[] = [];
  const visibleText = toVisibleText(html);
  const title = extractTagText(html, "title");
  const h1Count = countTags(removeNonRenderedContent(html), "h1");
  const canonical = extractLinkHref(html, "canonical");
  const robots = extractMetaContent(html, "robots").toLowerCase();
  const openGraphTitle = extractMetaContent(html, "og:title", "property");
  const openGraphImage = extractMetaContent(html, "og:image", "property");
  const noindex = robots.includes("noindex");
  const final = new URL(finalUrl, origin);

  if (status !== 200) issues.push(`expected HTTP 200, received ${status}`);
  if (!contentType.toLowerCase().includes("text/html")) {
    issues.push(`expected HTML, received ${contentType || "unknown content type"}`);
  }
  if (final.origin !== origin) issues.push(`redirected outside the audited origin to ${final.origin}`);
  if (!title) issues.push("missing document title");
  if (title && !normalizeText(title).includes("arqvia")) {
    issues.push("document title does not include Arqvia");
  }
  if (h1Count !== 1) issues.push(`expected exactly one H1, received ${h1Count}`);
  if (!openGraphTitle) issues.push("missing Open Graph title");
  if (openGraphTitle && !normalizeText(openGraphTitle).includes("arqvia")) {
    issues.push("Open Graph title does not include Arqvia");
  }
  if (!openGraphImage) issues.push("missing Open Graph image");
  if (!noindex && !canonical) issues.push("missing canonical URL");

  if (canonical) {
    const canonicalUrl = new URL(canonical, origin);
    if (canonicalUrl.origin !== origin) issues.push("canonical points to another origin");
    if (normalizePath(canonicalUrl.pathname) !== normalizePath(final.pathname)) {
      issues.push(`canonical path ${canonicalUrl.pathname} does not match ${final.pathname}`);
    }
  }

  const normalizedVisibleText = normalizeText(visibleText);
  for (const phrase of forbiddenPublicPhrases) {
    if (normalizedVisibleText.includes(normalizeText(phrase))) {
      issues.push(`contains forbidden public phrase: ${phrase}`);
    }
  }

  if (/\b[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)*example(?:\.com)?\b/i.test(visibleText)) {
    issues.push("contains an example-domain contact email");
  }
  if (/\+?54\s*351\s*000[-\s]?0000/.test(visibleText)) {
    issues.push("contains the blocked placeholder phone number");
  }

  return {
    canonical,
    issues,
    links: extractPublicLinks(html, origin),
    pathname: requestedPath,
    title,
  };
}

function extractPublicLinks(html: string, origin: string) {
  const links = Array.from(
    html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>/gi),
    (match) => decodeHtml(match[1] || match[2] || ""),
  );

  return Array.from(
    new Set(
      links.flatMap((value) => {
        if (!value || value.startsWith("#")) return [];
        try {
          const url = new URL(value, origin);
          return url.origin === origin && isPublicPagePath(url.pathname)
            ? [url.pathname]
            : [];
        } catch {
          return [];
        }
      }),
    ),
  );
}

function isPublicPagePath(pathname: string) {
  return !ignoredPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) && !/\.[a-z0-9]{2,8}$/i.test(pathname);
}

function normalizePath(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function extractTagText(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeHtml(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() : "";
}

function extractLinkHref(html: string, rel: string) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const relValue = extractAttribute(tag, "rel");
    if (relValue.toLowerCase().split(/\s+/).includes(rel.toLowerCase())) {
      return decodeHtml(extractAttribute(tag, "href"));
    }
  }
  return "";
}

function extractMetaContent(
  html: string,
  name: string,
  attribute: "name" | "property" = "name",
) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (extractAttribute(tag, attribute).toLowerCase() === name.toLowerCase()) {
      return decodeHtml(extractAttribute(tag, "content"));
    }
  }
  return "";
}

function countTags(html: string, tagName: string) {
  return (html.match(new RegExp(`<${tagName}\\b`, "gi")) || []).length;
}

function extractAttribute(tag: string, attribute: string) {
  const match = tag.match(
    new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match?.[1] || match?.[2] || "";
}

function toVisibleText(html: string) {
  return decodeHtml(
    removeNonRenderedContent(html)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function removeNonRenderedContent(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template>/gi, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url: string, accept: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, {
      cache: "no-store",
      headers: { Accept: accept, "User-Agent": "ArqviaPublicAudit/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function auditPaths(origin: string, paths: string[]) {
  const results: PublicPageAudit[] = [];
  const concurrency = 6;

  for (let index = 0; index < paths.length; index += concurrency) {
    const batch = paths.slice(index, index + concurrency);
    const audited = await Promise.all(
      batch.map(async (pathname) => {
        try {
          const response = await fetchWithTimeout(`${origin}${pathname}`, "text/html");
          const html = await response.text();
          return auditPublicDocument({
            contentType: response.headers.get("content-type") || "",
            finalUrl: response.url,
            html,
            origin,
            requestedPath: pathname,
            status: response.status,
          });
        } catch (error) {
          return {
            canonical: "",
            issues: [
              `request failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
            links: [],
            pathname,
            title: "",
          };
        }
      }),
    );
    results.push(...audited);
  }

  return results;
}

async function main() {
  const origin = resolveAuditOrigin(
    process.argv.slice(2),
    process.env.PUBLIC_AUDIT_BASE_URL,
  );
  const sitemapResponse = await fetchWithTimeout(`${origin}/sitemap.xml`, "application/xml");
  if (!sitemapResponse.ok) {
    throw new Error(`Sitemap returned HTTP ${sitemapResponse.status}.`);
  }

  const sitemapPaths = parseSitemapUrls(await sitemapResponse.text(), origin);
  if (!sitemapPaths.length) throw new Error("Sitemap did not contain public URLs.");

  const firstPass = await auditPaths(origin, Array.from(new Set(["/", ...sitemapPaths])));
  const discoveredPaths = Array.from(
    new Set(firstPass.flatMap((result) => result.links)),
  ).filter((pathname) => !firstPass.some((result) => result.pathname === pathname));
  const secondPass = await auditPaths(origin, discoveredPaths.slice(0, 200));
  const results = [...firstPass, ...secondPass];

  const notFoundResponse = await fetchWithTimeout(
    `${origin}/auditoria-ruta-inexistente-arqvia`,
    "text/html",
  );
  const globalIssues: string[] = [];
  if (notFoundResponse.status !== 404) {
    globalIssues.push(`unknown route returned HTTP ${notFoundResponse.status} instead of 404`);
  }

  const titles = new Map<string, string[]>();
  for (const result of results) {
    if (!result.title) continue;
    const key = normalizeText(result.title);
    titles.set(key, [...(titles.get(key) || []), result.pathname]);
  }
  for (const [title, paths] of titles) {
    if (paths.length > 1) {
      globalIssues.push(`duplicate title "${title}" on ${paths.join(", ")}`);
    }
  }

  const failures = results.filter((result) => result.issues.length);
  for (const result of failures) {
    for (const issue of result.issues) {
      console.log(`BLOCK  ${result.pathname}  ${issue}`);
    }
  }
  for (const issue of globalIssues) console.log(`BLOCK  site  ${issue}`);

  if (failures.length || globalIssues.length) {
    console.error(
      `Public audit failed: ${results.length} routes checked, ${failures.length + globalIssues.length} route/global issue groups.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS  public site  ${results.length} routes checked, sitemap and 404 verified.`,
  );
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(
      "Public audit could not complete:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
