"use client";

import { deleteTeamMember } from "@/app/admin/(protected)/team/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteTeamMemberButton({ id, name }: { id: string; name: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteTeamMember}
      fields={{ id }}
      title="Eliminar integrante"
      description={`Vas a eliminar a "${name}" del equipo visible en el sitio.`}
    />
  );
}
