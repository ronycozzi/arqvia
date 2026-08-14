"use client";

import { deleteArea } from "@/app/admin/(protected)/areas/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteAreaButton({ id, name }: { id: string; name: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteArea}
      fields={{ id }}
      title="Eliminar área"
      description={`Vas a eliminar "${name}" de las zonas de trabajo publicadas.`}
    />
  );
}
