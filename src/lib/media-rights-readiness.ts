import { prisma } from "@/lib/db";
import { evaluatePublicMediaRights } from "@/lib/media-rights";

export async function getPublicMediaRightsSnapshot(now = new Date()) {
  const [configs, projects, services, blogPosts, teamMembers, testimonials] =
    await Promise.all([
      prisma.clientConfig.findMany({
        select: { heroImage: true, logoUrl: true },
      }),
      prisma.project.findMany({
        where: {
          publicationStatus: "PUBLISHED",
          publishedAt: { lte: now },
        },
        select: {
          coverImage: true,
          images: { select: { url: true } },
        },
      }),
      prisma.service.findMany({
        where: {
          publicationStatus: "PUBLISHED",
          publishedAt: { lte: now },
        },
        select: { coverImage: true },
      }),
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED", publishedAt: { lte: now } },
        select: { coverImage: true },
      }),
      prisma.teamMember.findMany({
        where: { active: true },
        select: { imageUrl: true },
      }),
      prisma.testimonial.findMany({
        where: { featured: true },
        select: { imageUrl: true },
      }),
    ]);

  const publicUrls = [
    ...configs.flatMap((config) => [config.heroImage, config.logoUrl]),
    ...projects.flatMap((project) => [
      project.coverImage,
      ...project.images.map((image) => image.url),
    ]),
    ...services.map((service) => service.coverImage),
    ...blogPosts.map((post) => post.coverImage),
    ...teamMembers.map((member) => member.imageUrl),
    ...testimonials.map((testimonial) => testimonial.imageUrl),
  ];
  const uniqueUrls = [...new Set(publicUrls.filter(Boolean))] as string[];
  const assets = uniqueUrls.length
    ? await prisma.mediaAsset.findMany({
        where: { url: { in: uniqueUrls } },
        select: {
          rightsApprovedAt: true,
          rightsApprovedBy: true,
          rightsNote: true,
          url: true,
        },
      })
    : [];

  return evaluatePublicMediaRights(uniqueUrls, assets, now);
}
