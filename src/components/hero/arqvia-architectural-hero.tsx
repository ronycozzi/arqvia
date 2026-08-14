import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import type { PublicClientConfig } from "@/lib/client-config";
import type { PublicProject } from "@/types/project";

export function ArqviaArchitecturalHero({
  config,
  eyebrow,
  featuredProject,
  imageAlt,
  trustItems,
}: {
  config: PublicClientConfig;
  eyebrow: string;
  featuredProject?: PublicProject;
  imageAlt: string;
  trustItems: string[];
}) {
  const project = featuredProject || null;

  return (
    <section className="relative isolate min-h-[calc(92svh-80px)] overflow-hidden bg-[#0f100c] text-paper">
      <div className="absolute inset-0 z-0 scale-[1.01] motion-reduce:transform-none">
        <Image
          src={config.heroImage}
          alt={imageAlt}
          data-testid="hero-architectural-image"
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-[60%_center] brightness-[1.14] contrast-[1.04] saturate-[0.96] md:object-[66%_center]"
        />
      </div>

      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,#0f100c_0%,rgba(15,16,12,0.93)_22%,rgba(15,16,12,0.48)_43%,rgba(15,16,12,0.06)_70%,rgba(15,16,12,0)_100%)] max-md:bg-[linear-gradient(90deg,rgba(15,16,12,0.92)_0%,rgba(15,16,12,0.76)_58%,rgba(15,16,12,0.48)_100%)]" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_76%_38%,transparent_0%,rgba(15,16,12,0)_44%,rgba(15,16,12,0.34)_100%)]" />
      <div className="absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-[#0f100c]/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 h-64 bg-gradient-to-t from-[#0f100c]/84 to-transparent" />
      <div className="absolute inset-0 z-20 opacity-[0.028] mix-blend-soft-light [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.8)_1px,transparent_0)] [background-size:18px_18px]" />

      <div className="pointer-events-none absolute right-[4.5%] top-[14%] z-20 hidden h-[64%] w-[50%] border border-white/[0.075] lg:block" />
      <div className="pointer-events-none absolute right-[9%] top-[19%] z-20 hidden h-[52%] w-[36%] border border-bronze-light/[0.10] lg:block" />

      <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
        <div className="line-draw absolute bottom-[16%] left-[10%] h-px w-[80%] origin-left bg-white/[0.12]" />
        <div className="absolute bottom-[16%] left-[10%] flex w-[80%] justify-between">
          <span className="h-2 w-px bg-white/22" />
          <span className="h-2 w-px bg-white/12" />
          <span className="h-2 w-px bg-white/12" />
          <span className="h-2 w-px bg-white/12" />
          <span className="h-2 w-px bg-white/22" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
        <TechnicalCallout className="right-[41%] top-[24%]">
          Volumen principal
        </TechnicalCallout>
        <TechnicalCallout className="right-[8%] top-[34%] [animation-delay:650ms]">
          Materialidad
        </TechnicalCallout>
        <TechnicalCallout className="bottom-[28%] right-[37%] [animation-delay:780ms]">
          Interiores integrados
        </TechnicalCallout>
      </div>

      <div className="relative z-40 mx-auto grid min-h-[calc(92svh-80px)] max-w-7xl items-start gap-12 px-5 pb-20 pt-14 md:items-center md:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:pb-12 lg:pt-12">
        <div className="max-w-3xl">
          <p className="hero-reveal mb-4 inline-flex items-center gap-4 text-xs font-bold uppercase tracking-[0.26em] text-bronze-light">
            <span className="h-px w-12 bg-bronze-light" />
            {eyebrow}
          </p>

          <h1 className="hero-reveal max-w-[46rem] font-serif text-5xl font-medium leading-[1] text-paper [animation-delay:120ms] md:text-6xl lg:text-[3.75rem] xl:text-[4.15rem]">
            {config.heroTitle}
          </h1>

          <p className="hero-reveal mt-5 max-w-xl text-base leading-7 text-paper/78 [animation-delay:240ms] md:text-lg">
            {config.heroSubtitle}
          </p>

          <div className="hero-actions-reveal mt-6 flex flex-col gap-3 [animation-delay:360ms] sm:flex-row">
            <Link
              href="/contacto"
              className="inline-flex h-14 items-center justify-center gap-2 bg-paper px-7 text-sm font-bold text-ink shadow-[0_18px_48px_rgba(201,155,98,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-bronze-light"
            >
              {config.primaryCtaLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/proyectos"
              className="inline-flex h-14 items-center justify-center border border-paper/18 bg-paper/[0.04] px-7 text-sm font-bold text-paper backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-bronze-light hover:text-bronze-light"
            >
              {config.secondaryCtaLabel}
            </Link>
          </div>

          <div className="hero-reveal mt-5 hidden flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-paper/78 [animation-delay:480ms] sm:flex">
            {trustItems.map(
              (badge) => (
                <span key={badge} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-bronze-light" aria-hidden="true" />
                  {badge}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="relative hidden min-h-[480px] lg:block">
          {project ? (
            <div className="hero-project-reveal absolute bottom-[7%] right-3 w-[310px] border border-paper/[0.13] bg-graphite/62 p-5 shadow-[0_28px_82px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between border-b border-paper/12 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-paper/58">
              <span>{project.location}</span>
              <span>{project.areaM2} m²</span>
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-bronze-light">
              Proyecto destacado
            </p>
            <h2 className="font-serif text-3xl font-medium leading-tight text-paper">
              {project.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-paper/72">
              {project.servicePerformed} en {project.location}.
            </p>
            <Link
              href={`/proyectos/${project.slug}`}
              className="architectural-link mt-5 inline-flex text-sm font-semibold text-bronze-light"
            >
              Ver caso de estudio
            </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TechnicalCallout({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`hero-callout absolute text-xs font-bold uppercase tracking-[0.22em] text-bronze-light ${className}`}
    >
      <span className="mb-2 block h-px w-28 origin-left bg-bronze-light/55" />
      {children}
    </div>
  );
}
