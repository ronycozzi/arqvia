import { prisma } from "@/lib/db";
import type { AdminMediaOption } from "@/components/admin/media-fields";

export async function getAdminMediaOptions(
  take = 80,
): Promise<AdminMediaOption[]> {
  return prisma.mediaAsset.findMany({
    where: { rightsApprovedAt: { not: null } },
    orderBy: [{ createdAt: "desc" }],
    select: {
      altText: true,
      category: true,
      id: true,
      title: true,
      url: true,
    },
    take,
  });
}
