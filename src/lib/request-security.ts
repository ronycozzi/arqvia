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

  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) return !options.requireSource;

    try {
      const refererUrl = new URL(referer);
      return matchesHost(refererUrl);
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    return (
      matchesHost(originUrl) &&
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
