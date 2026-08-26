import type { MetadataRoute } from "next";
import { getPublicAreas } from "@/lib/area-data";
import { getPublicBlogPosts } from "@/lib/blog-data";
import { getApprovedPublicLegalPages } from "@/lib/legal-data";
import { localSeoPages } from "@/lib/local-seo";
import { getPublicProjects } from "@/lib/project-data";
import { getPublicServices } from "@/lib/service-data";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, blogPosts, legalPages, projects, services] = await Promise.all([
    getPublicAreas(),
    getPublicBlogPosts(),
    getApprovedPublicLegalPages(),
    getPublicProjects(),
    getPublicServices(),
  ]);
  const base = siteConfig.url;
  const staticLastModified = new Date("2026-07-01T12:00:00.000Z");
  const route = (
    url: string,
    priority = 0.7,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly",
    lastModified: Date = staticLastModified,
  ) => ({
    url,
    lastModified,
    changeFrequency,
    priority,
  });
  const staticRoutes: Array<[
    string,
    number,
    MetadataRoute.Sitemap[number]["changeFrequency"],
  ]> = [
    ["", 1, "weekly"],
    ["/proyectos", 0.9, "weekly"],
    ["/servicios", 0.9, "weekly"],
    ["/proceso", 0.72, "monthly"],
    ["/nosotros", 0.65, "monthly"],
    ["/contacto", 0.92, "monthly"],
    ["/faq", 0.62, "monthly"],
    ["/blog", 0.74, "weekly"],
  ];

  return [
    ...staticRoutes.map(([path, priority, frequency]) =>
      route(`${base}${path}`, priority, frequency),
    ),
    ...legalPages.map((page) =>
      route(
        `${base}/${page.slug}`,
        0.2,
        "yearly",
        page.updatedAt || staticLastModified,
      ),
    ),
    ...projects.map((project) =>
      route(
        `${base}/proyectos/${project.slug}`,
        0.86,
        "monthly",
        project.updatedAt || staticLastModified,
      ),
    ),
    ...services.map((service) =>
      route(
        `${base}/servicios/${service.slug}`,
        0.84,
        "monthly",
        service.updatedAt || staticLastModified,
      ),
    ),
    ...blogPosts.map((post) =>
      route(
        `${base}/blog/${post.slug}`,
        0.64,
        "monthly",
        post.updatedAt || post.publishedAt || staticLastModified,
      ),
    ),
    ...localSeoPages.map((page) => route(`${base}/${page.slug}`, 0.82, "monthly")),
    ...areas.map((area) =>
      route(
        `${base}/zonas/${area.slug}`,
        0.76,
        "monthly",
        area.updatedAt || staticLastModified,
      ),
    ),
  ];
}
