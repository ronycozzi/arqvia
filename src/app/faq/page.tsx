import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { FaqAccordion } from "@/components/faq-accordion";
import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { getPublicFaqs } from "@/lib/faq-data";
import { createPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { buildWhatsAppUrl } from "@/lib/utils";

export const generateMetadata = createPageMetadata({
  title: "Preguntas frecuentes",
  description:
    "Respuestas frecuentes sobre arquitectura, construcción, remodelaciones, presupuestos y visitas técnicas.",
  canonical: "/faq",
});

export default async function FaqPage() {
  const [config, faqs] = await Promise.all([getClientConfig(), getPublicFaqs()]);
  const contactHref = "/contacto?origen=%2Ffaq";

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />
      <SectionHeading
        as="h1"
        eyebrow="FAQ"
        title="Respuestas para avanzar con más claridad."
        description="Presupuesto, documentación, visitas técnicas, etapas y formas de trabajo."
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="premium-card-dark p-6 text-paper">
            <h2 className="font-serif text-3xl">¿Seguís con dudas?</h2>
            <p className="mt-3 text-sm leading-7 text-paper/78">
              Contanos ubicación, tipo de proyecto y etapa actual. Te orientamos
              con el camino más conveniente para avanzar.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href={contactHref}
                className="inline-flex h-12 items-center justify-center gap-2 bg-bronze px-5 text-sm font-semibold text-paper transition duration-300 hover:bg-paper hover:text-ink"
              >
                Solicitar orientación <ArrowRight className="size-4" />
              </Link>
              <TrackedAnchor
                href={buildWhatsAppUrl(siteConfig.whatsappMessage, config.whatsapp)}
                eventName="whatsapp_click"
                eventParams={{ source: "faq_cta" }}
                className="inline-flex h-12 items-center justify-center gap-2 border border-paper/20 px-5 text-sm font-semibold text-paper transition duration-300 hover:border-bronze-light hover:text-bronze-light"
              >
                <MessageCircle className="size-4" />
                Consultar por WhatsApp
              </TrackedAnchor>
            </div>
          </div>
        </aside>
        <div>
          <FaqAccordion items={faqs} />
        </div>
      </div>
    </section>
  );
}
