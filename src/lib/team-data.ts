import { team as seedTeam } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "@/lib/public-content-policy";

export type PublicTeamMember = {
  name: string;
  role: string;
  specialty: string;
  licenseNumber?: string | null;
  bio: string;
  imageUrl: string;
  linkedinUrl?: string | null;
};

export async function getPublicTeamMembers(): Promise<PublicTeamMember[]> {
  try {
    const rows = await prisma.teamMember.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    if (rows.length) {
      return rows.map((member) => ({
        name: member.name,
        role: member.role,
        specialty: member.specialty,
        licenseNumber: member.licenseNumber,
        bio: member.bio,
        imageUrl: member.imageUrl,
        linkedinUrl: member.linkedinUrl,
      }));
    }

    const teamCount = await prisma.teamMember.count();
    if (teamCount > 0) return [];
  } catch (error) {
    return fallbackPublicContent("team members", seedTeam, error);
  }

  return seedCollectionOrEmpty(seedTeam);
}
