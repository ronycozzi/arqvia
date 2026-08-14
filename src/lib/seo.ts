import type { Metadata } from "next";
import type { PublicClientConfig } from "@/lib/client-config";
import { getClientConfig } from "@/lib/client-config";
import { siteConfig } from "@/lib/site-config";
import { metadataTitle } from "@/lib/utils";

export const defaultOgImage = {
  url: "/images/arqvia-hero-concrete-pool-generated-3840x2160.webp",
  width: 3840,
  height: 2160,
  alt: "Casa contemporánea de hormigón, vidrio y piscina diseñada por Arqvia",
};

export function buildPageMetadata({
  canonical,
  description,
  title,
}: {
  canonical: string;
  description: string;
  title: string;
}, brand?: Pick<PublicClientConfig, "companyName" | "heroImage">): Metadata {
  const companyName = brand?.companyName || siteConfig.name;
  const ogImage = brand?.heroImage
    ? {
        url: brand.heroImage,
        alt: `Proyecto de arquitectura de ${companyName}`,
      }
    : defaultOgImage;
  const resolvedTitle = metadataTitle(title, companyName);
  const socialTitle =
    typeof resolvedTitle === "string" ? resolvedTitle : resolvedTitle.absolute;

  return {
    title: resolvedTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      type: "website",
      locale: "es_AR",
      siteName: companyName,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [ogImage.url],
    },
  };
}

export function createPageMetadata(
  input: Parameters<typeof buildPageMetadata>[0],
) {
  return async function generateMetadata(): Promise<Metadata> {
    const config = await getClientConfig();
    return buildPageMetadata(input, config);
  };
}
