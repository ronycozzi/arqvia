"use client";

import { deleteService } from "@/app/admin/(protected)/services/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteServiceButton({ id, title }: { id: string; title: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteService}
      fields={{ id }}
      title="Eliminar servicio"
      description={`Vas a eliminar "${title}" de las páginas públicas de servicios.`}
    />
  );
}
