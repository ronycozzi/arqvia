import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { getHomeContent } from "@/lib/home-data";
import { getInstitutionalPage } from "@/lib/institutional-data";
import { buildPageMetadata } from "@/lib/seo";
import { getPublicTeamMembers } from "@/lib/team-data";
import { buildWhatsAppUrl } from "@/lib/utils";

export async function generateMetadata() {
  const [config, page] = await Promise.all([
    getClientConfig(),
    getInstitutionalPage("nosotros"),
  ]);
  return buildPageMetadata(
    {
      canonical: "/nosotros",
      title: page.seoTitle,
      description: page.seoDescription,
    },
    config,
  );
}

export default async function AboutPage() {
  const [config, teamMembers, homeContent, page] = await Promise.all([
    getClientConfig(),
    getPublicTeamMembers(),
    getHomeContent(),
    getInstitutionalPage("nosotros"),
  ]);
  const contactHref = "/contacto?origen=%2Fnosotros";

  return (
    <>
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
              {page.eyebrow}
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl">
              {page.title}
            </h1>
          </div>
          <p className="text-lg leading-9 text-ink/75">
            {page.introduction}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-5 md:grid-cols-4">
          {homeContent.trustMetrics.map((metric) => (
            <div key={metric.label} className="premium-card p-6">
              <p className="font-serif text-4xl text-ink">{metric.value}</p>
              <p className="mt-2 text-sm text-ink/75">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          eyebrow={page.payload.decision.eyebrow}
          title={page.payload.decision.title}
          description={page.payload.decision.description}
        />
        <div className="grid gap-4 md:grid-cols-2">
          {page.payload.decision.items.map((item) => (
            <div key={item} className="premium-card p-5 text-sm leading-7 text-ink/75">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-mist py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionHeading
            eyebrow={page.payload.philosophy.eyebrow}
            title={page.payload.philosophy.title}
            description={page.payload.philosophy.description}
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {page.payload.philosophy.items.map((item) => (
              <article key={item.title} className="premium-card p-6">
                <h2 className="font-serif text-3xl text-ink">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-ink/75">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <SectionHeading
          eyebrow={page.payload.team.eyebrow}
          title={page.payload.team.title}
          description={page.payload.team.description}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {teamMembers.map((member) => (
            <article key={member.name} className="premium-card overflow-hidden">
              <div className="image-sheen relative aspect-[4/3]">
                <Image
                  src={member.imageUrl}
                  alt={`Retrato profesional de ${member.name}, responsable de ${member.role.toLowerCase()} en Arqvia.`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="font-serif text-3xl text-ink">{member.name}</h2>
                <p className="mt-1 text-sm font-semibold text-bronze">
                  {member.role}
                </p>
                <p className="mt-2 text-sm text-ink/75">{member.specialty}</p>
                <p className="mt-4 text-sm leading-7 text-ink/75">{member.bio}</p>
                {member.licenseNumber ? (
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-ink/75">
                    {member.licenseNumber}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ink py-12 text-paper md:py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <h2 className="max-w-3xl font-serif text-4xl leading-tight md:text-5xl">
            {page.finalCtaTitle}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-paper/78">
            {page.finalCtaDescription}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={contactHref}
              className="inline-flex h-12 items-center justify-center bg-bronze px-6 text-sm font-semibold text-paper"
            >
              {page.primaryCtaLabel}
            </Link>
            <TrackedAnchor
              href={buildWhatsAppUrl(
                page.whatsappMessage,
                config.whatsapp,
              )}
              eventName="whatsapp_click"
              eventParams={{ source: "about_final_cta" }}
              className="inline-flex h-12 items-center justify-center gap-2 border border-paper/20 px-6 text-sm font-semibold text-paper"
            >
              <MessageCircle className="size-4" />
              {page.secondaryCtaLabel}
            </TrackedAnchor>
          </div>
        </div>
      </section>
    </>
  );
}
