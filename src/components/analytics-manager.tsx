"use client";

import { BarChart3, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
  applyAnalyticsConsent,
  maintainAnalyticsRevocation,
  trackEvent,
} from "@/lib/analytics";
import type { PublicAnalyticsConfig } from "@/lib/analytics-config";

const consentStorageKey = "arqvia-analytics-consent-v1";
export const openCookiePreferencesEvent = "arqvia:open-cookie-preferences";

type Consent = "denied" | "granted" | "unknown";

export function AnalyticsManager({ config }: { config: PublicAnalyticsConfig }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>("unknown");
  const [ready, setReady] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!config.enabled) return;

    let storedConsent: Consent = "unknown";
    try {
      const value = window.localStorage.getItem(consentStorageKey);
      if (value === "granted" || value === "denied") storedConsent = value;
    } catch {
      storedConsent = "unknown";
    }

    const hydrationTimer = window.setTimeout(() => {
      setConsent(storedConsent);
      setPreferencesOpen(storedConsent === "unknown");
      setReady(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [config.enabled]);

  useEffect(() => {
    if (!config.enabled) return;

    const openPreferences = () => setPreferencesOpen(true);
    window.addEventListener(openCookiePreferencesEvent, openPreferences);
    return () =>
      window.removeEventListener(openCookiePreferencesEvent, openPreferences);
  }, [config.enabled]);

  useEffect(() => {
    if (!config.enabled || !ready) return;

    window.__ARQVIA_ANALYTICS__ = {
      consent,
      id: config.id,
      provider: config.provider,
    };
    applyAnalyticsConsent(consent, config.id);

    if (consent !== "granted") {
      return;
    }

    if (config.provider === "ga4") {
      window.gtag?.("js", new Date());
      window.gtag?.("config", config.id, {
        anonymize_ip: true,
        send_page_view: false,
      });
    } else if (config.provider === "gtm") {
      window.dataLayer?.push({
        "gtm.start": Date.now(),
        event: "gtm.js",
      });
    }
  }, [config, consent, ready]);

  useEffect(() => {
    if (!config.enabled || !ready || consent === "granted") return;
    return maintainAnalyticsRevocation();
  }, [config.enabled, consent, ready]);

  useEffect(() => {
    if (!config.enabled || consent !== "granted") return;
    trackEvent("page_view", { page_path: pathname });
  }, [config.enabled, consent, pathname]);

  if (!config.enabled) return null;

  function saveConsent(nextConsent: Exclude<Consent, "unknown">) {
    try {
      window.localStorage.setItem(consentStorageKey, nextConsent);
    } catch {
      // Consent still applies to the current page when storage is unavailable.
    }
    setConsent(nextConsent);
    setPreferencesOpen(false);
  }

  const scriptSource =
    config.provider === "ga4"
      ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.id)}`
      : `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.id)}`;

  return (
    <>
      {consent === "granted" ? (
        <Script
          id={`arqvia-${config.provider}-analytics`}
          src={scriptSource}
          strategy="afterInteractive"
        />
      ) : null}

      {ready && preferencesOpen ? (
        <section
          aria-label="Preferencias de medición"
          className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-3xl border border-paper/15 bg-graphite p-5 text-paper shadow-[0_28px_90px_rgb(0_0_0/0.46)] md:inset-x-6 md:bottom-6 md:p-6"
          role="region"
          style={{ zIndex: 100 }}
        >
          <button
            type="button"
            onClick={() => setPreferencesOpen(false)}
            className="absolute right-3 top-3 grid size-11 place-items-center text-paper/70 transition hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-light"
            aria-label="Cerrar preferencias de medición"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="flex gap-4 pr-10">
            <span className="grid size-11 shrink-0 place-items-center border border-bronze-light/35 bg-paper/[0.04] text-bronze-light">
              <BarChart3 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-light">
                Privacidad y medición
              </p>
              <h2 className="mt-2 font-serif text-3xl leading-tight">
                Vos decidís si medimos la navegación.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/75">
                Las funciones esenciales operan siempre. La medición opcional nos ayuda a entender qué páginas y acciones resultan útiles, sin enviar datos del formulario.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => saveConsent("granted")}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-bronze px-6 text-sm font-semibold text-paper transition hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-light"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              Permitir medición
            </button>
            <button
              type="button"
              onClick={() => saveConsent("denied")}
              className="inline-flex min-h-12 items-center justify-center border border-paper/20 px-6 text-sm font-semibold text-paper transition hover:border-paper/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-light"
            >
              Solo esenciales
            </button>
            <Link
              href="/cookies"
              className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-paper/72 underline decoration-bronze-light underline-offset-4 transition hover:text-paper"
            >
              Ver política de cookies
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(openCookiePreferencesEvent))}
      className="text-left transition hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-light"
    >
      Preferencias de cookies
    </button>
  );
}
