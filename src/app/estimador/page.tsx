import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { InvestmentEstimator } from "@/components/investment-estimator";
import { JsonLd } from "@/components/json-ld";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { getPublicEstimatorData } from "@/lib/estimator-data";
import { buildPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { absoluteUrl, buildWhatsAppUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [{ config, rules }, clientConfig] = await Promise.all([
    getPublicEstimatorData(),
    getClientConfig(),
  ]);
  const enabled = config.enabled && rules.length > 0;
  const metadata = buildPageMetadata(
    enabled
      ? {
          title: "Estimador de inversión para obras en Córdoba",
          description:
            "Calculá un rango orientativo en USD para obra nueva, remodelación, ampliación, interiores, locales y oficinas en Córdoba.",
          canonical: "/estimador",
        }
      : {
          title: "Evaluación inicial de proyectos en Córdoba",
          description:
            "Compartí ubicación, superficie, etapa y prioridades para recibir orientación profesional sobre tu proyecto.",
          canonical: "/estimador",
        },
    clientConfig,
  );

  return { ...metadata, robots: { index: false, follow: true } };
}

export default async function EstimatorPage() {
  const [{ config, rules }, clientConfig] = await Promise.all([
    getPublicEstimatorData(),
    getClientConfig(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      {config.enabled && rules.length ? (
        <JsonLd
          data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: `Estimador de inversión ${clientConfig.companyName}`,
          description:
            "Herramienta orientativa para estimar rangos de inversión en obras, remodelaciones e interiores.",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "es-AR",
          provider: {
            "@type": "HomeAndConstructionBusiness",
            name: clientConfig.companyName,
            url: siteConfig.url,
          },
          url: absoluteUrl("/estimador", siteConfig.url),
          }}
        />
      ) : null}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Inicio",
              item: siteConfig.url,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Estimador de inversión",
              item: absoluteUrl("/estimador", siteConfig.url),
            },
          ],
        }}
      />
      {config.enabled && rules.length ? (
        <InvestmentEstimator config={config} rules={rules} />
      ) : (
        <section className="border border-ink/10 bg-paper p-5 shadow-premium sm:p-7 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Evaluación personalizada
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl">
            Cada proyecto necesita un alcance antes de estimar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/72">
            Contanos superficie, ubicación, etapa y prioridades. El equipo puede preparar una primera orientación con el contexto correcto.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contacto?origen=%2Festimador"
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze"
            >
              Solicitar presupuesto <ArrowRight className="size-4" />
            </Link>
            <TrackedAnchor
              href={buildWhatsAppUrl(
                `Hola, quiero recibir una orientación inicial para mi proyecto con ${clientConfig.companyName}.`,
                clientConfig.whatsapp,
              )}
              eventName="whatsapp_click"
              eventParams={{ source: "estimator_unavailable" }}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-ink/15 px-6 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              <MessageCircle className="size-4" /> Consultar por WhatsApp
            </TrackedAnchor>
          </div>
        </section>
      )}
    </div>
  );
}
