"use client";

import Link from "next/link";
import {
  ChevronDown,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { CookiePreferencesButton } from "@/components/analytics-manager";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { BrandMark } from "@/components/brand-mark";
import type { PublicClientConfig } from "@/lib/client-config";
import type { PublicArea } from "@/lib/area-data";
import { siteConfig } from "@/lib/site-config";
import {
  buildContactHref,
  buildContextualWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/lib/utils";
import type { PublicService } from "@/types/service";

export function SiteFooter({
  analyticsEnabled,
  areas,
  config,
  services,
}: {
  analyticsEnabled: boolean;
  areas: Pick<PublicArea, "name" | "slug">[];
  config: PublicClientConfig;
  services: Pick<PublicService, "slug" | "title">[];
}) {
  const pathname = usePathname();
  const contactHref = buildContactHref(pathname);
  const whatsappUrl = buildWhatsAppUrl(
    buildContextualWhatsAppMessage({
      companyName: config.companyName,
      fallback: siteConfig.whatsappMessage,
      pathname,
    }),
    config.whatsapp,
  );
  const socialLinks = [
    { label: "Instagram", href: config.instagramUrl },
    { label: "LinkedIn", href: config.linkedinUrl },
    { label: "Facebook", href: config.facebookUrl },
  ].filter((item) => item.href);

  return (
    <footer
      className="architectural-grid min-w-0 border-t border-paper/15 bg-graphite pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-paper md:pb-0"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 md:px-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div className="min-w-0">
          <Link href="/" className="inline-flex min-w-0 items-center gap-3">
            <BrandMark companyName={config.companyName} logoUrl={config.logoUrl} />
            <span className="min-w-0">
              <span className="block font-serif text-3xl leading-none">
                {config.companyName}
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-paper/78">
                {siteConfig.tagline}
              </span>
            </span>
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-7 text-paper/78">
            Arquitectura, obra e interiores para proyectos residenciales,
            comerciales y remodelaciones con planificación, criterio técnico y
            seguimiento profesional.
          </p>
          <address className="mt-6 space-y-3 text-sm not-italic text-paper/78">
            <p>
              <a
                href={`tel:${config.phone.replace(/[^+\d]/g, "")}`}
                className="flex min-w-0 items-center gap-2 transition hover:text-paper focus-visible:text-paper"
              >
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">{config.phone}</span>
              </a>
            </p>
            <p>
              <a
                href={`mailto:${config.email}`}
                className="flex min-w-0 items-center gap-2 transition hover:text-paper focus-visible:text-paper"
              >
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">{config.email}</span>
              </a>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{config.address}</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{config.businessHours}</span>
            </p>
          </address>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              href={contactHref}
              className="inline-flex h-12 items-center justify-center bg-bronze px-5 text-sm font-semibold text-paper transition duration-300 hover:-translate-y-0.5 hover:bg-paper hover:text-ink"
            >
              {config.primaryCtaLabel}
            </Link>
            <TrackedAnchor
              href={whatsappUrl}
              eventName="whatsapp_click"
              eventParams={{ source: "footer_cta" }}
              className="inline-flex h-12 items-center justify-center gap-2 border border-paper/20 px-5 text-sm font-semibold text-paper transition duration-300 hover:-translate-y-0.5 hover:border-bronze-light hover:text-bronze-light"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </TrackedAnchor>
          </div>
          {socialLinks.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 border border-paper/15 px-3 text-xs font-semibold text-paper/78 transition duration-300 hover:-translate-y-0.5 hover:border-bronze-light hover:text-bronze-light"
                >
                  {item.label === "LinkedIn" ? <ExternalLink className="size-3.5" /> : null}
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}
          <div className="mt-7 border-t border-paper/12 pt-5">
            <LanguageSwitcher theme="dark" />
          </div>
        </div>

        <div className="grid min-w-0 content-start gap-0 lg:contents">
          <FooterList title="Servicios">
            {services
              .slice(0, 6)
              .map((service) => (
                <Link key={service.slug} href={`/servicios/${service.slug}`}>
                  {service.title}
                </Link>
              ))}
          </FooterList>

          <FooterList title="Áreas">
            {areas.map((area) => (
              <Link key={area.slug} href={`/zonas/${area.slug}`}>
                {area.name}
              </Link>
            ))}
          </FooterList>

          <FooterList title="Recursos">
            <Link href="/proceso">Cómo trabajamos</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/faq">Preguntas frecuentes</Link>
            <Link href="/proyectos">Ver proyectos</Link>
            <Link href={contactHref}>Solicitar presupuesto</Link>
            <TrackedAnchor
              href={whatsappUrl}
              eventName="whatsapp_click"
              eventParams={{ source: "footer_resources" }}
            >
              WhatsApp
            </TrackedAnchor>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/cookies">Cookies</Link>
            {analyticsEnabled ? <CookiePreferencesButton /> : null}
            <Link href="/aviso-presupuestos">Aviso sobre presupuestos</Link>
          </FooterList>
        </div>
      </div>
      <div className="border-t border-paper/10 px-5 py-5 text-xs">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-paper/78">
            {config.companyName} · {siteConfig.tagline} · Córdoba, Argentina.
          </p>
        </div>
      </div>
      <style>{`
        .arqvia-footer-mobile-group {
          display: block;
        }

        .arqvia-footer-desktop-group {
          display: none;
        }

        @media (min-width: 64rem) {
          .arqvia-footer-mobile-group {
            display: none;
          }

          .arqvia-footer-desktop-group {
            display: block;
          }
        }
      `}</style>
    </footer>
  );
}

function FooterList({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const linksClassName =
    "flex flex-col gap-3 text-sm text-paper/78 [&_a]:transition [&_a:hover]:text-paper";

  return (
    <div className="min-w-0" data-footer-group={title}>
      <details className="arqvia-footer-mobile-group group border-t border-paper/15">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light transition-colors hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-light [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown
            className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className={`${linksClassName} pb-6 pl-1`}>{children}</div>
      </details>

      <div className="arqvia-footer-desktop-group">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-bronze-light">
          {title}
        </h2>
        <div className={linksClassName}>{children}</div>
      </div>
    </div>
  );
}
