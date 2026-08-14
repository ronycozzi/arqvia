import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type MediaUsageSummary = {
  labels: string[];
  total: number;
};

const usageLabelLimit = 5;
type MediaUsageClient = Pick<
  Prisma.TransactionClient,
  | "blogPost"
  | "clientConfig"
  | "project"
  | "projectImage"
  | "service"
  | "teamMember"
  | "testimonial"
>;

function createUsageSummary(): MediaUsageSummary {
  return { labels: [], total: 0 };
}

function appendUsage(summary: MediaUsageSummary, label: string) {
  summary.labels.push(label);
  summary.total += 1;
}

function appendLimitedUsages<T>(
  usageByUrl: Map<string, MediaUsageSummary>,
  items: readonly T[],
  getUrl: (item: T) => string | null,
  getLabel: (item: T) => string,
) {
  const countsByUrl = new Map<string, number>();

  for (const item of items) {
    const url = getUrl(item);
    if (url === null) continue;

    const summary = usageByUrl.get(url);
    if (!summary) continue;

    const count = countsByUrl.get(url) || 0;
    if (count >= usageLabelLimit) continue;

    appendUsage(summary, getLabel(item));
    countsByUrl.set(url, count + 1);
  }
}

export async function getMediaUsageByUrls(
  urls: readonly string[],
  database: MediaUsageClient = prisma,
): Promise<Map<string, MediaUsageSummary>> {
  const uniqueUrls = [...new Set(urls)];
  const usageByUrl = new Map(
    uniqueUrls.map((url) => [url, createUsageSummary()] as const),
  );

  if (uniqueUrls.length === 0) return usageByUrl;

  const [
    settings,
    projectCovers,
    projectImages,
    serviceCovers,
    blogCovers,
    teamImages,
    testimonialImages,
  ] = await Promise.all([
    database.clientConfig.findMany({
      where: {
        OR: [
          { logoUrl: { in: uniqueUrls } },
          { heroImage: { in: uniqueUrls } },
        ],
      },
      select: { companyName: true, heroImage: true, logoUrl: true },
    }),
    database.project.findMany({
      where: { coverImage: { in: uniqueUrls } },
      select: { coverImage: true, title: true },
    }),
    database.projectImage.findMany({
      where: { url: { in: uniqueUrls } },
      select: { project: { select: { title: true } }, url: true },
    }),
    database.service.findMany({
      where: { coverImage: { in: uniqueUrls } },
      select: { coverImage: true, title: true },
    }),
    database.blogPost.findMany({
      where: { coverImage: { in: uniqueUrls } },
      select: { coverImage: true, title: true },
    }),
    database.teamMember.findMany({
      where: { imageUrl: { in: uniqueUrls } },
      select: { imageUrl: true, name: true },
    }),
    database.testimonial.findMany({
      where: { imageUrl: { in: uniqueUrls } },
      select: { imageUrl: true, name: true },
    }),
  ]);

  for (const item of settings) {
    const heroUsage = usageByUrl.get(item.heroImage);
    if (heroUsage) appendUsage(heroUsage, `Portada de ${item.companyName}`);

    const logoUsage = item.logoUrl === null ? undefined : usageByUrl.get(item.logoUrl);
    if (logoUsage) appendUsage(logoUsage, `Logo de ${item.companyName}`);
  }

  appendLimitedUsages(
    usageByUrl,
    projectCovers,
    (item) => item.coverImage,
    (item) => `Portada de proyecto: ${item.title}`,
  );
  appendLimitedUsages(
    usageByUrl,
    projectImages,
    (item) => item.url,
    (item) => `Galería de proyecto: ${item.project.title}`,
  );
  appendLimitedUsages(
    usageByUrl,
    serviceCovers,
    (item) => item.coverImage,
    (item) => `Portada de servicio: ${item.title}`,
  );
  appendLimitedUsages(
    usageByUrl,
    blogCovers,
    (item) => item.coverImage,
    (item) => `Imagen de guía: ${item.title}`,
  );
  appendLimitedUsages(
    usageByUrl,
    teamImages,
    (item) => item.imageUrl,
    (item) => `Foto de equipo: ${item.name}`,
  );
  appendLimitedUsages(
    usageByUrl,
    testimonialImages,
    (item) => item.imageUrl,
    (item) => `Foto de testimonio: ${item.name}`,
  );

  return usageByUrl;
}

export async function getMediaUsage(
  url: string,
  database: MediaUsageClient = prisma,
): Promise<MediaUsageSummary> {
  const usageByUrl = await getMediaUsageByUrls([url], database);
  return usageByUrl.get(url) || createUsageSummary();
}
