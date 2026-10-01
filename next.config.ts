import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";
import {
  outsideBasePathRedirects,
  serverActionAllowedOrigins,
} from "./src/lib/base-path-config";

const isDevelopment = process.env.NODE_ENV === "development";
// Sub-path the app is served under (for example "/arqvia-demo"); empty = root.
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
const allowedActionOrigins = serverActionAllowedOrigins(basePath, publicSiteUrl);
const mediaPublicUrl = (() => {
  if (!process.env.S3_PUBLIC_BASE_URL) return null;

  try {
    const url = new URL(process.env.S3_PUBLIC_BASE_URL);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
})();
const mediaImageSource = mediaPublicUrl ? ` ${mediaPublicUrl.origin}` : "";
const analyticsProvider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || "none";
const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID || "";
const googleAnalyticsEnabled =
  (analyticsProvider === "ga4" && /^G-[A-Z0-9]{4,20}$/i.test(analyticsId)) ||
  (analyticsProvider === "gtm" && /^GTM-[A-Z0-9]{4,20}$/i.test(analyticsId));
const googleScriptSource = googleAnalyticsEnabled
  ? " https://www.googletagmanager.com"
  : "";
const googleConnectSources = googleAnalyticsEnabled
  ? " https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com"
  : "";
const googleImageSource = googleAnalyticsEnabled
  ? " https://www.google-analytics.com"
  : "";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  {
    key: "Strict-Transport-Security",
    // Under a base path the response is served on somebody else's domain: the
    // app must not opt that whole domain into the browser preload list.
    value: basePath
      ? "max-age=63072000; includeSubDomains"
      : "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "form-action 'self'",
      `img-src 'self' data: blob:${mediaImageSource}${googleImageSource}`,
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}${googleScriptSource}`,
      "worker-src 'self'",
      "manifest-src 'self'",
      `connect-src 'self'${googleConnectSources}`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  ...(allowedActionOrigins.length
    ? {
        experimental: {
          // Behind the rewrite the browser sends the public Origin while the
          // app sees its own deployment host; Server Actions would be rejected.
          serverActions: { allowedOrigins: allowedActionOrigins },
        },
      }
    : {}),
  async redirects() {
    // Old addresses: with a base path, anything outside the prefix on this
    // deployment (https://<project>.vercel.app/servicios) moves to the public
    // URL, keeping the path.
    return outsideBasePathRedirects(basePath, publicSiteUrl);
  },
  images: {
    qualities: [75, 88],
    ...(mediaPublicUrl
      ? {
        remotePatterns: [
          {
            hostname: mediaPublicUrl.hostname,
            pathname: `${mediaPublicUrl.pathname.replace(/\/$/, "") || ""}/**`,
            port: mediaPublicUrl.port,
            protocol: "https",
          },
        ],
      }
      : {}),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; connect-src 'self'",
          },
          // Never widen the worker scope to the host root on a shared domain.
          ...(basePath ? [] : [{ key: "Service-Worker-Allowed", value: "/" }]),
        ],
      },
      {
        source: "/offline.html",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
