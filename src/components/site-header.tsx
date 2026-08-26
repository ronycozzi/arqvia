"use client";

import Link from "next/link";
import { Menu, Phone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import type { PublicClientConfig } from "@/lib/client-config";
import { siteConfig } from "@/lib/site-config";
import {
  buildContactHref,
  buildContextualWhatsAppMessage,
  buildWhatsAppUrl,
  cn,
} from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export function SiteHeader({
  config,
}: {
  config: PublicClientConfig;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = "mobile-site-menu";
  const whatsappUrl = buildWhatsAppUrl(
    buildContextualWhatsAppMessage({
      companyName: config.companyName,
      fallback: siteConfig.whatsappMessage,
      pathname,
    }),
    config.whatsapp,
  );
  const contactHref = buildContactHref(pathname);
  const navItems = siteConfig.nav;
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    let frame: number | null = null;

    const updateScrollState = () => {
      frame = null;
      const nextScrolled = window.scrollY > 16;
      setScrolled((current) =>
        current === nextScrolled ? current : nextScrolled,
      );
    };

    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusTimer = window.setTimeout(() => {
      const firstFocusable = mobileMenuRef.current?.querySelector<HTMLElement>(
        focusableSelector,
      );
      firstFocusable?.focus();
    }, 80);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        mobileMenuRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || [],
      ).filter((element) => !element.hasAttribute("disabled"));

      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)] text-paper backdrop-blur-xl transition duration-300",
        scrolled
          ? "border-paper/14 bg-graphite/96 shadow-[0_18px_60px_rgb(0_0_0/0.26)]"
          : "border-paper/8 bg-graphite/88 shadow-[0_12px_42px_rgb(0_0_0/0.14)]",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3"
        >
          <BrandMark
            companyName={config.companyName}
            logoUrl={config.logoUrl}
            className="transition duration-300 group-hover:border-bronze-light group-hover:bg-bronze/22"
          />
          <span>
            <span className="block font-serif text-2xl leading-none text-paper">
              {config.companyName}
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-paper/68">
              {siteConfig.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 xl:gap-7 lg:flex" aria-label="Principal">
          {navItems.slice(1, -1).map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium transition after:absolute after:bottom-1 after:left-0 after:h-px after:bg-bronze-light after:transition-[width] after:duration-300",
                  active
                    ? "text-paper after:w-full"
                    : "text-paper/72 after:w-0 hover:text-bronze-light hover:after:w-full focus-visible:text-bronze-light focus-visible:after:w-full",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={whatsappUrl}
            onClick={() => trackEvent("whatsapp_click", { source: "header" })}
            className="inline-flex h-11 items-center gap-2 border border-paper/15 px-4 text-sm font-semibold text-paper transition duration-200 hover:-translate-y-0.5 hover:border-bronze-light hover:text-bronze-light"
          >
            <Phone className="size-4" aria-hidden="true" />
            WhatsApp
          </a>
          <Link
            href={contactHref}
            className="inline-flex h-11 min-w-[170px] items-center justify-center whitespace-nowrap bg-bronze px-5 text-sm font-semibold text-paper shadow-[0_16px_38px_rgb(139_94_46/0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-paper hover:text-ink focus:outline-none focus:ring-2 focus:ring-bronze-light focus:ring-offset-2 focus:ring-offset-graphite"
          >
            {config.primaryCtaLabel}
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            className="grid size-11 place-items-center border border-paper/15 text-paper"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls={mobileMenuId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id={mobileMenuId}
        ref={mobileMenuRef}
        aria-hidden={!open}
        inert={open ? undefined : true}
        className={cn(
          "grid border-t border-paper/10 bg-graphite text-paper transition-all lg:hidden",
          open ? "grid-rows-[1fr]" : "invisible pointer-events-none grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "max-h-[calc(100dvh-5rem-env(safe-area-inset-top))] overflow-x-hidden overflow-y-auto overscroll-contain transition duration-300 motion-reduce:transform-none motion-reduce:transition-none",
            open
              ? "translate-y-0 opacity-100"
              : "-translate-y-2 opacity-0",
          )}
        >
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-5" aria-label="Mobile">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "border-b py-4 text-base font-medium transition-colors",
                    active
                      ? "border-bronze-light text-bronze-light"
                      : "border-paper/10 text-paper hover:text-bronze-light",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <a
              href={whatsappUrl}
              onClick={() => trackEvent("whatsapp_click", { source: "mobile_menu" })}
              className="mt-5 inline-flex h-12 items-center justify-center bg-bronze px-5 text-sm font-semibold text-paper"
            >
              {siteConfig.ctas.whatsapp}
            </a>
            <Link
              href={contactHref}
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex h-12 items-center justify-center border border-paper/18 px-5 text-sm font-semibold text-paper"
            >
              {config.primaryCtaLabel}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
