import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { isSearchIndexable } from "@/lib/search-indexing";

export default function robots(): MetadataRoute.Robots {
  if (!isSearchIndexable(siteConfig.url)) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
