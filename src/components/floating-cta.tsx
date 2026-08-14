"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import type { PublicClientConfig } from "@/lib/client-config";
import { siteConfig } from "@/lib/site-config";
import {
  buildContactHref,
  buildContextualWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export function FloatingCta({ config }: { config: PublicClientConfig }) {
  const pathname = usePathname();
  const hiddenOnCurrentPage =
    pathname === "/contacto" ||
    pathname === "/gracias" ||
    pathname.startsWith("/admin");
  const contactHref = buildContactHref(pathname);

  if (hiddenOnCurrentPage) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex gap-2 md:hidden"
      aria-label="Acciones rápidas"
    >
      <a
        href={buildWhatsAppUrl(
          buildContextualWhatsAppMessage({
            companyName: config.companyName,
            fallback: siteConfig.whatsappMessage,
            pathname,
          }),
          config.whatsapp,
        )}
        onClick={() => trackEvent("whatsapp_click", { source: "floating_mobile" })}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 bg-graphite px-4 text-sm font-semibold text-paper shadow-premium"
      >
        <MessageCircle className="size-4" />
        WhatsApp
      </a>
      <Link
        href={contactHref}
        className="inline-flex h-12 flex-1 items-center justify-center bg-bronze px-4 text-sm font-semibold text-paper shadow-premium"
      >
        Presupuesto
      </Link>
    </nav>
  );
}
