type AnalyticsEvent = {
  name: string;
  params?: Record<string, string | number | boolean | undefined>;
};

type AnalyticsRuntime = {
  consent: "denied" | "granted" | "unknown";
  id: string;
  provider: "ga4" | "gtm" | "none";
};

const googleAnalyticsCookiePatterns = [
  /^_ga(?:_.+)?$/i,
  /^_gid$/i,
  /^_gat(?:_.+)?$/i,
  /^_gac_(?:gb_)?\S+$/i,
  /^_dc_gtm_\S+$/i,
  /^_gcl_au$/i,
  /^amp_token$/i,
  /^__utm(?:a|b|c|t|v|z)$/i,
];

const analyticsCookieSweepIntervalMs = 1_000;
const allowedAnalyticsParameterNames = new Set([
  "areaBucket",
  "attachmentCount",
  "configVersion",
  "fromEstimator",
  "hasEstimate",
  "page_path",
  "placement",
  "ruleKey",
  "source",
  "sourcePage",
  "status",
  "tier",
]);

declare global {
  interface Window {
    __ARQVIA_ANALYTICS__?: AnalyticsRuntime;
    __ARQVIA_CONSENT_DEFAULTED__?: boolean;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isGoogleAnalyticsCookie(name: string) {
  return googleAnalyticsCookiePatterns.some((pattern) => pattern.test(name));
}

function analyticsCookiePaths() {
  const paths = new Set(["/"]);
  const segments = window.location.pathname.split("/").filter(Boolean);

  for (let index = 1; index <= segments.length; index += 1) {
    paths.add(`/${segments.slice(0, index).join("/")}`);
  }

  return [...paths];
}

function analyticsCookieDomains() {
  const hostname = window.location.hostname.replace(/^\./, "");
  if (!hostname || hostname === "localhost" || /^[\d.:]+$/.test(hostname)) {
    return [];
  }

  const labels = hostname.split(".");
  return labels
    .slice(0, -1)
    .map((_, index) => labels.slice(index).join("."));
}

export function clearGoogleAnalyticsCookies() {
  if (typeof document === "undefined") return;

  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.slice(0, cookie.indexOf("=")).trim())
    .filter((name) => name && isGoogleAnalyticsCookie(name));

  const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0";
  const domains = analyticsCookieDomains();

  for (const name of cookieNames) {
    for (const path of analyticsCookiePaths()) {
      document.cookie = `${name}=; ${expires}; path=${path}; SameSite=Lax`;
      for (const domain of domains) {
        document.cookie = `${name}=; ${expires}; path=${path}; domain=${domain}; SameSite=Lax`;
      }
    }
  }
}

function removeGoogleAnalyticsScripts() {
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((script) => {
    const source = new URL(script.src, window.location.href);
    if (
      source.hostname === "www.googletagmanager.com" &&
      (source.pathname === "/gtag/js" || source.pathname === "/gtm.js")
    ) {
      script.remove();
    }
  });
}

export function maintainAnalyticsRevocation() {
  if (typeof window === "undefined") return () => undefined;

  const sweep = () => {
    clearGoogleAnalyticsCookies();
    removeGoogleAnalyticsScripts();
  };
  const timer = window.setInterval(sweep, analyticsCookieSweepIntervalMs);

  sweep();
  window.addEventListener("pageshow", sweep);
  document.addEventListener("visibilitychange", sweep);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("pageshow", sweep);
    document.removeEventListener("visibilitychange", sweep);
  };
}

export function applyAnalyticsConsent(
  consent: AnalyticsRuntime["consent"],
  analyticsId?: string,
) {
  if (typeof window === "undefined") return;

  if (analyticsId?.startsWith("G-")) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${analyticsId}`] =
      consent !== "granted";
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  if (!window.__ARQVIA_CONSENT_DEFAULTED__) {
    window.gtag("consent", "default", {
      ad_personalization: "denied",
      ad_storage: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });
    window.__ARQVIA_CONSENT_DEFAULTED__ = true;
  }

  window.gtag("consent", "update", {
    ad_personalization: "denied",
    ad_storage: "denied",
    analytics_storage: consent === "granted" ? "granted" : "denied",
  });

  if (consent !== "granted") {
    clearGoogleAnalyticsCookies();
    removeGoogleAnalyticsScripts();
  }
}

export function trackEvent(name: string, params?: AnalyticsEvent["params"]) {
  if (typeof window === "undefined") return;
  const runtime = window.__ARQVIA_ANALYTICS__;
  if (!runtime || runtime.consent !== "granted" || runtime.provider === "none") {
    return;
  }

  const safeName = name.trim().replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
  if (!safeName) return;

  const safeParams = Object.fromEntries(
    Object.entries(params || {})
      .filter(
        ([key, value]) =>
          value !== undefined && allowedAnalyticsParameterNames.has(key),
      )
      .map(([key, value]) => [
        key.slice(0, 40),
        typeof value === "string" ? value.slice(0, 120) : value,
      ]),
  );

  window.dispatchEvent(
    new CustomEvent("arqvia:analytics-event", {
      detail: { name: safeName, params: safeParams },
    }),
  );

  if (runtime.provider === "ga4" && window.gtag) {
    window.gtag("event", safeName, safeParams);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: safeName, ...safeParams });
}
