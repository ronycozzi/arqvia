"use client";

import { deleteBlogPost } from "@/app/admin/(protected)/blog/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteBlogPostButton({ id, title }: { id: string; title: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteBlogPost}
      fields={{ id }}
      title="Eliminar publicación"
      description={`Vas a eliminar "${title}" del blog y de los enlaces internos asociados.`}
    />
  );
}
