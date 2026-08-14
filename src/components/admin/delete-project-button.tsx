"use client";

import { deleteProject } from "@/app/admin/(protected)/projects/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteProject}
      fields={{ id }}
      title="Eliminar proyecto"
      description={`Vas a eliminar "${title}" del portfolio público y del panel interno.`}
    />
  );
}
