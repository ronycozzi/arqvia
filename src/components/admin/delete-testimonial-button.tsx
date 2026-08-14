"use client";

import { deleteTestimonial } from "@/app/admin/(protected)/testimonials/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteTestimonialButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <DeleteConfirmationForm
      action={deleteTestimonial}
      fields={{ id }}
      title="Eliminar testimonio"
      description={`Vas a eliminar el testimonio de "${name}" de las secciones públicas de confianza.`}
    />
  );
}
