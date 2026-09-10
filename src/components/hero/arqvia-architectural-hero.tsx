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
    /*
     * La portada abría como las otras demos del estudio: un enunciado grande
     * a la izquierda y la foto detrás, oscurecida por un degradado que se
     * comía media obra. En arquitectura eso es al revés: lo que convence es
     * la obra, y el texto acompaña.
     *
     * Ahora la fotografía ocupa la pantalla sin velo lateral y el discurso baja
     * a una banda al pie, como el epígrafe de una revista del rubro: eyebrow,
     * enunciado en una medida corta, acciones y credenciales en una sola
     * lectura. El degradado sólo cubre esa banda, lo justo para que el texto
     * tenga contraste.
     */
    <section className="relative isolate flex min-h-[calc(92svh-80px)] flex-col justify-end overflow-hidden bg-[#0f100c] text-paper">
      <div className="absolute inset-0 z-0 scale-[1.01] motion-reduce:transform-none">
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
          <img
            {...mobileImageProps}
            srcSet={mobileSrcSet}
            alt={imageAlt}
            data-testid="hero-architectural-image"
            className="absolute inset-0 size-full object-cover object-[54%_38%] brightness-[1.24] contrast-[1.06] saturate-[0.98] md:object-[60%_42%]"
          />
        </picture>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 h-[54%] bg-[linear-gradient(180deg,rgba(15,16,12,0)_0%,rgba(15,16,12,0.30)_28%,rgba(15,16,12,0.74)_60%,rgba(15,16,12,0.95)_100%)]" />
      <div className="absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[#0f100c]/55 to-transparent" />

      <div className="relative z-20 mx-auto w-full max-w-7xl px-5 pb-12 pt-24 [text-shadow:0_1px_16px_rgba(15,16,12,0.55)] md:px-8 md:pb-14">
        <p className="hero-reveal mb-5 inline-flex items-center gap-4 text-xs font-bold uppercase tracking-[0.26em] text-bronze-light">
          <span className="h-px w-12 bg-bronze-light" />
          {eyebrow}
        </p>

        <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end">
          <h1 className="hero-reveal font-serif text-[2.625rem] font-medium leading-[1.02] text-paper [animation-delay:120ms] sm:text-5xl md:text-6xl md:leading-[1] lg:text-[3.6rem]">
            {config.heroTitle}
          </h1>

          <div className="hero-reveal [animation-delay:240ms]">
            <p className="max-w-xl text-base leading-7 text-paper/78 md:text-lg">
              {config.heroSubtitle}
            </p>

            <div className="hero-actions-reveal mt-6 flex flex-col gap-3 [animation-delay:360ms] sm:flex-row">
              <Link
                href="/contacto"
                className="inline-flex h-12 self-start items-center justify-center gap-2 bg-paper px-5 text-sm font-bold text-ink shadow-[0_18px_48px_rgba(201,155,98,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-bronze-light sm:h-14 sm:self-auto sm:px-7"
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
          </div>
        </div>

        <div className="hero-reveal mt-8 hidden flex-wrap gap-x-8 gap-y-3 border-t border-paper/12 pt-5 text-sm font-semibold text-paper/90 [animation-delay:480ms] sm:flex">
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
    </section>
  );
}
