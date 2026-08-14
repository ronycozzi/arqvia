import { siteConfig } from "@/lib/site-config";
import { absoluteUrl } from "@/lib/utils";

type BreadcrumbInput = {
  name: string;
  path: string;
};

export function breadcrumbJsonLd(items: BreadcrumbInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, siteConfig.url),
    })),
  };
}
