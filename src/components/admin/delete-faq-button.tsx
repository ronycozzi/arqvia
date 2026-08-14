"use client";

import { deleteFaq } from "@/app/admin/(protected)/faq/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteFaqButton({ id, question }: { id: string; question: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteFaq}
      fields={{ id }}
      title="Eliminar pregunta"
      description={`Vas a eliminar "${question}" de las respuestas públicas del sitio.`}
    />
  );
}
