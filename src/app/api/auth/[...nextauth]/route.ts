import { NextRequest } from "next/server";
import { handlers } from "../../../../../auth";
import { basePath, withBasePath } from "@/lib/base-path";

/**
 * Under a base path Next hands route handlers a URL without the prefix, while
 * Auth.js matches its actions against the full path taken from AUTH_URL
 * (`<base path>/api/auth`). The prefix is put back before delegating; at the
 * domain root the handlers are used as they are.
 */
function underBasePath(
  handler: (request: NextRequest) => Promise<Response>,
) {
  if (!basePath) return handler;

  return (request: NextRequest) => {
    const url = new URL(request.url);
    url.pathname = withBasePath(url.pathname);
    return handler(new NextRequest(url, request));
  };
}

export const GET = underBasePath(handlers.GET);
export const POST = underBasePath(handlers.POST);
