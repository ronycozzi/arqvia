import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { preload } from "react-dom";
import type { PublicClientConfig } from "@/lib/client-config";
import { imageKit } from "@/lib/content";

export function ArqviaArchitecturalHero({
  config,
  eyebrow,
  imageAlt,
  trustItems,
}: {
  config: PublicClientConfig;
  eyebrow: string;
  imageAlt: string;
  trustItems: string[];
}) {
  const mobileHeroImage =
    config.heroImage === imageKit.hero ? imageKit.heroMobile : config.heroImage;
  const commonImageProps = {
    alt: imageAlt,
    fetchPriority: "high" as const,
    loading: "eager" as const,
    sizes: "100vw",
  };
  const {
    props: { src: desktopSrc, srcSet: desktopSrcSet },
  } = getImageProps({
    ...commonImageProps,
    src: config.heroImage,
    width: 3840,
    height: 2160,
    quality: 88,
  });
  const {
    props: { srcSet: mobileSrcSet, ...mobileImageProps },
  } = getImageProps({
    ...commonImageProps,
    src: mobileHeroImage,
    width: 1122,
    height: 1402,
    quality: 75,
  });

  preload(desktopSrc, {
    as: "image",
    fetchPriority: "high",
    imageSizes: "100vw",
    imageSrcSet: desktopSrcSet,
    media: "(min-width: 768px)",
  });
  preload(mobileImageProps.src, {
    as: "image",
    fetchPriority: "high",
    imageSizes: "100vw",
    imageSrcSet: mobileSrcSet,
    media: "(max-width: 767px)",
  });

  return (
    <section className="relative isolate min-h-[calc(92svh-80px)] overflow-hidden bg-[#0f100c] text-paper">
      <div className="absolute inset-0 z-0 scale-[1.01] motion-reduce:transform-none">
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
          <img
            {...mobileImageProps}
            srcSet={mobileSrcSet}
            alt={imageAlt}
            data-testid="hero-architectural-image"
            className="absolute inset-0 size-full object-cover object-[54%_center] brightness-[1.14] contrast-[1.04] saturate-[0.96] md:object-[66%_center]"
          />
        </picture>
      </div>

      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,#0f100c_0%,rgba(15,16,12,0.93)_22%,rgba(15,16,12,0.48)_43%,rgba(15,16,12,0.06)_70%,rgba(15,16,12,0)_100%)] max-md:bg-[linear-gradient(90deg,rgba(15,16,12,0.92)_0%,rgba(15,16,12,0.76)_58%,rgba(15,16,12,0.48)_100%)]" />
      <div className="absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-[#0f100c]/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 h-64 bg-gradient-to-t from-[#0f100c]/84 to-transparent" />

      <div className="relative z-20 mx-auto flex min-h-[calc(92svh-80px)] max-w-7xl items-start px-5 pb-20 pt-14 md:items-center md:px-8 lg:pb-12 lg:pt-12">
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

          <div className="hero-reveal mt-5 hidden flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-paper/90 [animation-delay:480ms] sm:flex">
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

      </div>
    </section>
  );
}
