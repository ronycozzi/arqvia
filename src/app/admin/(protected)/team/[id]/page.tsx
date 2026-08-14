import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamMemberForm } from "@/components/admin/team-member-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { prisma } from "@/lib/db";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Editar integrante",
  robots: { index: false, follow: false },
};

export default async function EditTeamMemberPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);
  const [member, mediaAssets] = await Promise.all([
    prisma.teamMember.findUnique({ where: { id } }),
    getAdminMediaOptions(),
  ]);
  if (!member) notFound();

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link href="/admin/team" className="text-sm font-semibold text-bronze underline underline-offset-4">
          Volver a equipo
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Editar integrante
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{member.name}</h2>
      </div>
      <TeamMemberForm
        canEdit={canEdit}
        mediaAssets={mediaAssets}
        member={{
          id: member.id,
          expectedUpdatedAt: member.updatedAt.toISOString(),
          name: member.name,
          role: member.role,
          specialty: member.specialty,
          licenseNumber: member.licenseNumber,
          bio: member.bio,
          imageUrl: member.imageUrl,
          linkedinUrl: member.linkedinUrl,
          sortOrder: member.sortOrder,
          active: member.active,
        }}
      />
    </section>
  );
}
