"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  assertContentVersionUpdated,
  ContentConcurrencyConflictError,
  getSubmittedExpectedUpdatedAt,
  requireExpectedUpdatedAt,
} from "@/lib/content-concurrency";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { teamMemberFormSchema } from "@/lib/validations";

export type TeamActionState = {
  ok: boolean;
  message: string;
  expectedUpdatedAt?: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    active: boolean;
    id: string;
    title: string;
  };
};

async function assertCanManageTeam() {
  return getVerifiedAdminSession(contentManagerRoles);
}

function revalidateTeamSurfaces() {
  revalidatePath("/");
  revalidatePath("/nosotros");
  revalidatePath("/admin");
  revalidatePath("/admin/team");
}

export async function saveTeamMember(
  _previousState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);
  const session = await assertCanManageTeam();

  if (!session) {
    return {
      ok: false,
      message: "Tu rol no puede modificar equipo.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = teamMemberFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const isUpdate = Boolean(input.id);

  let member;
  try {
    const expectedUpdatedAt = isUpdate
      ? requireExpectedUpdatedAt(formData)
      : null;
    member = await prisma.$transaction(async (tx) => {
      const data = {
        name: input.name,
        role: input.role,
        specialty: input.specialty,
        licenseNumber: input.licenseNumber || null,
        bio: input.bio,
        imageUrl: input.imageUrl,
        linkedinUrl: input.linkedinUrl || null,
        sortOrder: input.sortOrder,
        active: input.active,
      };
      let savedMember;

      if (isUpdate) {
        const updateResult = await tx.teamMember.updateMany({
          where: { id: input.id, updatedAt: expectedUpdatedAt! },
          data,
        });
        assertContentVersionUpdated(updateResult.count);
        savedMember = await tx.teamMember.findUniqueOrThrow({
          where: { id: input.id },
        });
      } else {
        savedMember = await tx.teamMember.create({ data });
      }

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "TeamMember",
          entityId: savedMember.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} integrante del equipo: ${savedMember.name}`,
          userId: session.user.id,
        },
      });

      return savedMember;
    });

  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ContentConcurrencyConflictError
          ? error.message
          : "No se pudo guardar el integrante.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  revalidateTeamSurfaces();
  return {
    ok: true,
    message: `Integrante ${isUpdate ? "actualizado" : "creado"} correctamente.`,
    expectedUpdatedAt: member.updatedAt.toISOString(),
    resource: {
      active: member.active,
      id: member.id,
      title: member.name,
    },
  };
}

export async function deleteTeamMember(formData: FormData) {
  const session = await assertCanManageTeam();
  const id = String(formData.get("id") || "");
  if (!session || !id) redirect("/admin/team", RedirectType.replace);

  let deleted;
  try {
    deleted = await prisma.$transaction(async (tx) => {
      const deletedMember = await tx.teamMember.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "TeamMember",
          entityId: deletedMember.id,
          summary: `Eliminó integrante del equipo: ${deletedMember.name}`,
          userId: session.user.id,
        },
      });

      return deletedMember;
    });
  } catch (error) {
    logServerError("admin.team_member.delete_failed", error, {
      teamMemberId: id,
      userId: session.user.id,
    });
  }
  if (!deleted) {
    redirect("/admin/team?error=delete-failed", RedirectType.replace);
  }
  revalidateTeamSurfaces();
  redirect("/admin/team", RedirectType.replace);
}
