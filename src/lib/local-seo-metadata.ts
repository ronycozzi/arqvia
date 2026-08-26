import type { Metadata } from "next";
import type { PublicClientConfig } from "@/lib/client-config";
import { getClientConfig } from "@/lib/client-config";
import type { LocalSeoPage } from "@/lib/local-seo";
import { defaultOgImage } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { metadataTitle } from "@/lib/utils";

export function buildLocalSeoMetadata(
  page: LocalSeoPage,
  brand?: Pick<PublicClientConfig, "companyName" | "heroImage">,
): Metadata {
  const companyName = brand?.companyName || siteConfig.name;
  const ogImage = brand?.heroImage
    ? { url: brand.heroImage, alt: `Proyecto de arquitectura de ${companyName}` }
    : defaultOgImage;
  const resolvedTitle = metadataTitle(page.title, companyName);
  const socialTitle = resolvedTitle.absolute;

  return {
    title: resolvedTitle,
    description: page.description,
    alternates: {
      canonical: `/${page.slug}`,
    },
    openGraph: {
      title: socialTitle,
      description: page.description,
      url: `/${page.slug}`,
      type: "website",
      locale: "es_AR",
      siteName: companyName,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: page.description,
      images: [ogImage.url],
    },
  };
}

export function createLocalSeoMetadata(page: LocalSeoPage) {
  return async function generateMetadata(): Promise<Metadata> {
    const config = await getClientConfig();
    return buildLocalSeoMetadata(page, config);
  };
}
