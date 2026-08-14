import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { getInstitutionalPage } from "@/lib/institutional-data";
import { buildPageMetadata } from "@/lib/seo";
import { buildWhatsAppUrl } from "@/lib/utils";

export async function generateMetadata() {
  const [config, page] = await Promise.all([
    getClientConfig(),
    getInstitutionalPage("proceso"),
  ]);
  return buildPageMetadata(
    {
      canonical: "/proceso",
      title: page.seoTitle,
      description: page.seoDescription,
    },
    config,
  );
}

export default async function ProcessPage() {
  const contactHref = "/contacto?origen=%2Fproceso";
  const [config, page] = await Promise.all([
    getClientConfig(),
    getInstitutionalPage("proceso"),
  ]);
  const whatsappHref = buildWhatsAppUrl(
    page.whatsappMessage,
    config.whatsapp,
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16" aria-labelledby="process-page-title">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
        {page.eyebrow}
      </p>
      <h1 id="process-page-title" className="mt-4 max-w-4xl font-serif text-4xl leading-tight text-ink md:text-6xl">
        {page.title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/75">
        {page.introduction}
      </p>
      <ol className="mt-10 grid gap-px border border-ink/10 bg-ink/10 md:grid-cols-2" aria-label="Etapas del proceso">
        {page.payload.steps.map((step, index) => (
          <li
            key={step.title}
            className="grid min-h-[210px] gap-5 bg-paper p-6 md:grid-cols-[64px_1fr] md:p-7"
          >
            <p className="font-serif text-4xl text-bronze">
              {String(index + 1).padStart(2, "0")}
            </p>
            <div>
              <h2 className="font-serif text-2xl text-ink md:text-3xl">{step.title}</h2>
              <p className="mt-3 max-w-3xl text-base leading-8 text-ink/75">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <section className="mt-12 bg-ink p-7 text-paper md:flex md:items-center md:justify-between md:gap-10 md:p-9" aria-labelledby="process-contact-title">
        <div className="max-w-2xl">
          <h2 id="process-contact-title" className="font-serif text-3xl md:text-4xl">{page.finalCtaTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-paper/72">
            {page.finalCtaDescription}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0 md:shrink-0">
          <Link
            href={contactHref}
            className="inline-flex min-h-12 items-center justify-center bg-bronze px-6 text-sm font-semibold text-paper transition hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
          >
            {page.primaryCtaLabel}
          </Link>
          <TrackedAnchor
            href={whatsappHref}
            eventName="whatsapp_click"
            eventParams={{ source: "process_final_cta" }}
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-paper/20 px-5 text-sm font-semibold text-paper transition hover:border-bronze-light hover:text-bronze-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze-light"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {page.secondaryCtaLabel}
          </TrackedAnchor>
        </div>
      </section>
    </section>
  );
}
