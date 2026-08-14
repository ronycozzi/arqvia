import { testimonials as seedTestimonials } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "@/lib/public-content-policy";

export type PublicTestimonial = {
  name: string;
  projectType: string;
  location: string;
  service: string;
  result: string;
  quote: string;
};

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
      return rows.map((item) => {
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
      seedTestimonials.slice(0, limit),
      error,
    );
  }

  return seedCollectionOrEmpty(seedTestimonials).slice(0, limit);
}
