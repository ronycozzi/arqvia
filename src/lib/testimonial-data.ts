import { projects as seedProjects, testimonials as seedTestimonials } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  fallbackPublicContent,
} from "@/lib/public-content-policy";

export type PublicTestimonial = {
  name: string;
  projectType: string;
  location: string;
  service: string;
  result: string;
  quote: string;
};

export function isEditorialTestimonial(item: { quote: string }) {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const quote = normalize(item.quote);
  const seedQuotes = [
    ...seedTestimonials.map((seed) => seed.quote),
    ...seedProjects.map((seed) => seed.testimonial),
  ];
  return Boolean(quote) && !seedQuotes.some((seed) => seed && normalize(seed) === quote);
}

export async function getPublicTestimonials(
  limit = 3,
): Promise<PublicTestimonial[]> {
  try {
    const rows = await prisma.testimonial.findMany({
      where: { featured: true },
      include: {
        project: {
          select: {
            publicationStatus: true,
            publishedAt: true,
            servicePerformed: true,
            summary: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (rows.length) {
      return rows.filter(isEditorialTestimonial).map((item) => {
        const publishedProject =
          item.project?.publicationStatus === "PUBLISHED" &&
          item.project.publishedAt &&
          item.project.publishedAt <= new Date()
            ? item.project
            : null;

        return {
          name: item.name,
          projectType: item.projectType,
          location: item.location,
          service:
            item.role || publishedProject?.servicePerformed || item.projectType,
          result:
            publishedProject?.summary ||
            `${item.projectType} en ${item.location}.`,
          quote: item.quote,
        };
      });
    }

    const testimonialCount = await prisma.testimonial.count();
    if (testimonialCount > 0) return [];
  } catch (error) {
    return fallbackPublicContent(
      "testimonials",
      [],
      error,
    );
  }

  return [];
}
