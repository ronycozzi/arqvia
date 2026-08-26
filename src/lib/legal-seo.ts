import type { Metadata } from "next";
import type { PublicClientConfig } from "@/lib/client-config";
import type { PublicLegalPage } from "@/lib/legal-data";
import { buildPageMetadata } from "@/lib/seo";

export function buildLegalPageMetadata(
  page: PublicLegalPage,
  brand?: Pick<PublicClientConfig, "companyName" | "heroImage">,
): Metadata {
  const metadata = buildPageMetadata(
    {
      canonical: `/${page.slug}`,
      description: page.seoDescription,
      title: page.seoTitle,
    },
    brand,
  );

  if (page.isApproved) return metadata;

  return {
    ...metadata,
    robots: {
      follow: false,
      index: false,
    },
  };
}
