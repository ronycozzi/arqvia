import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { auth } from "@/auth";
import { getPublicArea } from "@/lib/area-data";
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

const protectAdmin = auth(async (request: NextAuthRequest, _event: NextFetchEvent) => {
  void _event;
  const { pathname, search } = request.nextUrl;
  const isAdminApi = pathname.startsWith("/api/admin");

  if (pathname === "/admin/login") return NextResponse.next();

  if (!request.auth?.user) {
    if (isAdminApi) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
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
    return NextResponse.redirect(new URL(destination, request.url), 308);
  }

  return notFoundResponse(request);
}

function notFoundResponse(request: NextRequest) {
  const response = NextResponse.rewrite(new URL("/_not-found", request.url), {
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
