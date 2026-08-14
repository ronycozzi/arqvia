import { workAreas as seedAreas } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "@/lib/public-content-policy";

export type PublicArea = {
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt?: Date | null;
};

export type PublicAreaLink = Pick<PublicArea, "name" | "slug">;

function seedPublicAreas(): PublicArea[] {
  return seedAreas.map((area) => ({
    name: area.name,
    slug: area.slug,
    description: area.description,
    seoTitle: `Arquitectura, construccion y remodelaciones en ${area.name}`,
    seoDescription: area.description,
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
  }));
}

export async function getPublicAreas(): Promise<PublicArea[]> {
  try {
    const rows = await prisma.area.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    if (rows.length) {
      return rows.map((area) => ({
        name: area.name,
        slug: area.slug,
        description: area.description,
        seoTitle: area.seoTitle,
        seoDescription: area.seoDescription,
        updatedAt: area.updatedAt,
      }));
    }

    const areaCount = await prisma.area.count();
    if (areaCount > 0) return [];
  } catch (error) {
    return fallbackPublicContent("work areas", seedPublicAreas(), error);
  }

  return seedCollectionOrEmpty(seedPublicAreas());
}

export async function getPublicAreaLinks(): Promise<PublicAreaLink[]> {
  const seedLinks = seedAreas.map(({ name, slug }) => ({ name, slug }));

  try {
    const rows = await prisma.area.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    });

    if (rows.length) return rows;

    const areaCount = await prisma.area.count();
    return areaCount === 0 ? seedCollectionOrEmpty(seedLinks) : [];
  } catch (error) {
    return fallbackPublicContent("work area links", seedLinks, error);
  }
}

export async function getPublicArea(slug: string): Promise<PublicArea | null> {
  const areas = await getPublicAreas();
  return areas.find((area) => area.slug === slug) || null;
}
