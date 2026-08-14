import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TeamMemberForm } from "@/components/admin/team-member-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { imageKit } from "@/lib/content";

export const metadata: Metadata = {
  title: "Nuevo integrante",
  robots: { index: false, follow: false },
};

export default async function NewTeamMemberPage() {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const canEdit = canManageContent(session.user.role);
  const mediaAssets = await getAdminMediaOptions();

  return (
    <section className="grid gap-6">
      <div className="premium-card p-6">
        <Link href="/admin/team" className="text-sm font-semibold text-bronze underline underline-offset-4">
          Volver a equipo
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Nuevo integrante
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">Agregar perfil profesional</h2>
      </div>
      <TeamMemberForm
        canEdit={canEdit}
        mediaAssets={mediaAssets}
        member={{
          name: "",
          role: "",
          specialty: "",
          licenseNumber: "",
          bio: "",
          imageUrl: imageKit.teamA,
          linkedinUrl: "",
          sortOrder: 0,
          active: true,
        }}
      />
    </section>
  );
}
