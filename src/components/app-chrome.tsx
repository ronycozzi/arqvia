"use client";

import { usePathname } from "next/navigation";
import { AnalyticsManager } from "@/components/analytics-manager";
import { FloatingCta } from "@/components/floating-cta";
import { PwaManager } from "@/components/pwa-manager";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { PublicArea } from "@/lib/area-data";
import type { PublicAnalyticsConfig } from "@/lib/analytics-config";
import type { PublicClientConfig } from "@/lib/client-config";
import type { PublicService } from "@/types/service";

export function AppChrome({
  analytics,
  areas,
  children,
  config,
  services,
}: {
  analytics: PublicAnalyticsConfig;
  areas: Pick<PublicArea, "name" | "slug">[];
  children: React.ReactNode;
  config: PublicClientConfig;
  services: Pick<PublicService, "slug" | "title">[];
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <>
      <a
        href="#contenido-principal"
        className="sr-only fixed left-4 top-4 z-[120] bg-paper px-4 py-3 text-sm font-semibold text-ink shadow-premium focus:not-sr-only"
      >
        Saltar al contenido principal
      </a>
      <PwaManager />
      <AnalyticsManager config={analytics} />
      <SiteHeader config={config} />
      <main
        id="contenido-principal"
        tabIndex={-1}
        className="flex-1 scroll-pb-[calc(5.5rem+env(safe-area-inset-bottom))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] focus:outline-none md:scroll-pb-0 md:pb-0"
      >
        {children}
      </main>
      <SiteFooter
        analyticsEnabled={analytics.enabled}
        areas={areas}
        config={config}
        services={services}
      />
      <FloatingCta config={config} />
    </>
  );
}
