import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { auth } from "@/auth";
import { getPublicArea } from "@/lib/area-data";
import { stripBasePath, withBasePath } from "@/lib/base-path";
import { getPublicBlogPost } from "@/lib/blog-data";
import { getContentRedirectDestination } from "@/lib/content-redirects";
import { getPublicProject } from "@/lib/project-data";
import { getPublicService } from "@/lib/service-data";
import { safeDecodeURIComponent } from "@/lib/safe-uri";

type PublicContentKind = "blog" | "proyectos" | "servicios" | "zonas";

const contentRedirectTypes = {
  blog: "BLOG_POST",
  proyectos: "PROJECT",
  servicios: "SERVICE",
  zonas: "AREA",
} as const;

async function publicContentExists(kind: PublicContentKind, slug: string) {
  switch (kind) {
    case "proyectos":
      return Boolean(await getPublicProject(slug));
    case "servicios":
      return Boolean(await getPublicService(slug));
    case "blog":
      return Boolean(await getPublicBlogPost(slug));
    case "zonas":
      return Boolean(await getPublicArea(slug));
  }
}

/**
 * Builds a URL inside the app from the incoming request, so the response keeps
 * the base path and the public origin instead of a hand-assembled host.
 *
 * Next's own `nextUrl` knows the base path and prefixes `pathname` by itself.
 * The request Auth.js hands to its callback is rebuilt without the Next config
 * (its `nextUrl.basePath` is empty and `pathname` still carries the prefix),
 * so there the prefix is added here.
 */
function appUrl(request: NextRequest, path: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = url.basePath ? path : withBasePath(path);
  url.search = search;
  url.hash = "";
  return url;
}

/** App-relative pathname, whichever flavour of `nextUrl` the request carries. */
function appPathname(request: NextRequest) {
  const { basePath, pathname } = request.nextUrl;
  return basePath ? pathname : stripBasePath(pathname);
}

const protectAdmin = auth(async (request: NextAuthRequest, _event: NextFetchEvent) => {
  void _event;
  const pathname = appPathname(request);
  const { search } = request.nextUrl;
  const isAdminApi = pathname.startsWith("/api/admin");

  if (pathname === "/admin/login") return NextResponse.next();

  if (!request.auth?.user) {
    if (isAdminApi) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    // callbackUrl stays app-relative: the router adds the base path again.
    const loginUrl = appUrl(request, "/admin/login");
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = appPathname(request);
  const contentMatch = pathname.match(
    /^\/(proyectos|servicios|blog|zonas)\/([^/]+)\/?$/,
  );

  if (!contentMatch) return protectAdmin(request, event);

  const [, kind, encodedSlug] = contentMatch;
  const slug = safeDecodeURIComponent(encodedSlug);
  if (!slug) return notFoundResponse(request);

  const contentKind = kind as PublicContentKind;
  if (await publicContentExists(contentKind, slug)) {
    return NextResponse.next();
  }

  const destination = await getContentRedirectDestination(
    pathname.replace(/\/$/, ""),
    contentRedirectTypes[contentKind],
  );
  if (destination) {
    const [destinationPath, destinationQuery = ""] = destination.split("?");
    return NextResponse.redirect(
      appUrl(
        request,
        destinationPath,
        destinationQuery ? `?${destinationQuery}` : "",
      ),
      308,
    );
  }

  return notFoundResponse(request);
}

function notFoundResponse(request: NextRequest) {
  const response = NextResponse.rewrite(appUrl(request, "/_not-found"), {
    status: 404,
  });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/proyectos/:slug",
    "/servicios/:slug",
    "/blog/:slug",
    "/zonas/:slug",
  ],
};
