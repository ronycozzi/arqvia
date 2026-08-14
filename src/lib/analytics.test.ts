import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAnalyticsConsent,
  maintainAnalyticsRevocation,
  trackEvent,
} from "@/lib/analytics";

describe("trackEvent", () => {
  beforeEach(() => {
    vi.useRealTimers();
    window.dataLayer = [];
    window.gtag = undefined;
    window.__ARQVIA_ANALYTICS__ = undefined;
    window.__ARQVIA_CONSENT_DEFAULTED__ = undefined;
    document
      .querySelectorAll('script[src*="googletagmanager.com"]')
      .forEach((script) => script.remove());
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.slice(0, cookie.indexOf("=")).trim();
      if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  });

  it("does not retain or dispatch events before consent", () => {
    window.__ARQVIA_ANALYTICS__ = {
      consent: "unknown",
      id: "G-ARQVIA2026",
      provider: "ga4",
    };
    const listener = vi.fn();
    window.addEventListener("arqvia:analytics-event", listener);

    trackEvent("quote_form_start", { sourcePage: "/contacto" });

    expect(window.dataLayer).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener("arqvia:analytics-event", listener);
  });

  it("sends consented GA4 events with bounded parameters", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.__ARQVIA_ANALYTICS__ = {
      consent: "granted",
      id: "G-ARQVIA2026",
      provider: "ga4",
    };

    trackEvent("quote form success", {
      email: "persona@example.com",
      ignored: undefined,
      source: "x".repeat(200),
    });

    expect(gtag).toHaveBeenCalledWith("event", "quote_form_success", {
      source: "x".repeat(120),
    });
  });

  it("drops parameters outside the non-PII analytics contract", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.__ARQVIA_ANALYTICS__ = {
      consent: "granted",
      id: "G-ARQVIA2026",
      provider: "ga4",
    };

    trackEvent("generate_lead", {
      attachmentCount: 2,
      email: "persona@example.com",
      message: "Necesito remodelar mi casa",
      sourcePage: "/contacto",
    });

    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", {
      attachmentCount: 2,
      sourcePage: "/contacto",
    });
  });

  it("pushes GTM-compatible objects after consent", () => {
    window.__ARQVIA_ANALYTICS__ = {
      consent: "granted",
      id: "GTM-ARQ2026",
      provider: "gtm",
    };

    trackEvent("whatsapp_click", { source: "header" });

    expect(window.dataLayer).toEqual([
      { event: "whatsapp_click", source: "header" },
    ]);
  });

  it.each(["ga4", "gtm"] as const)(
    "revokes analytics consent for %s after it was granted",
    (provider) => {
      window.__ARQVIA_ANALYTICS__ = {
        consent: "granted",
        id: provider === "ga4" ? "G-ARQVIA2026" : "GTM-ARQ2026",
        provider,
      };
      applyAnalyticsConsent("granted");

      window.__ARQVIA_ANALYTICS__.consent = "denied";
      applyAnalyticsConsent("denied");
      const eventCount = (window.dataLayer || []).length;
      trackEvent("page_view", { page_path: "/proyectos" });

      expect(window.dataLayer).toContainEqual([
        "consent",
        "update",
        {
          ad_personalization: "denied",
          ad_storage: "denied",
          analytics_storage: "denied",
        },
      ]);
      expect(window.dataLayer).toHaveLength(eventCount);
    },
  );

  it("removes known Google Analytics cookies and disables an already loaded GA4 property", () => {
    document.cookie = "_ga=client-id; path=/";
    document.cookie = "_ga_ARQVIA2026=session-id; path=/";
    document.cookie = "_gid=day-id; path=/";
    document.cookie = "essential-preference=kept; path=/";
    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-ARQVIA2026";
    document.head.append(script);

    applyAnalyticsConsent("denied", "G-ARQVIA2026");

    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).not.toContain("_ga_ARQVIA2026=");
    expect(document.cookie).not.toContain("_gid=");
    expect(document.cookie).toContain("essential-preference=kept");
    expect(script.isConnected).toBe(false);
    expect(
      (window as unknown as Record<string, unknown>)[
        "ga-disable-G-ARQVIA2026"
      ],
    ).toBe(true);
  });

  it("sweeps cookies reinjected while analytics consent remains revoked", () => {
    vi.useFakeTimers();
    const stopGuard = maintainAnalyticsRevocation();

    document.cookie = "_ga=re-injected; path=/";
    vi.advanceTimersByTime(1_000);

    expect(document.cookie).not.toContain("_ga=");
    stopGuard();

    document.cookie = "_ga=after-guard; path=/";
    vi.advanceTimersByTime(1_000);
    expect(document.cookie).toContain("_ga=after-guard");
  });
});
