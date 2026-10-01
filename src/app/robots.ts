import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/base-path";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Crawlers only read robots.txt at the host root. Under a base path
        // this file is served from the prefix and is informational: the rules
        // are kept coherent with the real URLs, and the binding policy for
        // private routes remains the X-Robots-Tag header set in next.config.
        allow: withBasePath("/"),
        disallow: [withBasePath("/admin"), withBasePath("/api/admin")],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
