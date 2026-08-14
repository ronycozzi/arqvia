"use client";

import { deleteCategory } from "@/app/admin/(protected)/categories/actions";
import { DeleteConfirmationForm } from "@/components/admin/delete-confirmation-form";

export function DeleteCategoryButton({
  id,
  name,
  type,
}: {
  id: string;
  name: string;
  type: "project" | "service";
}) {
  return (
    <DeleteConfirmationForm
      action={deleteCategory}
      fields={{ id, type }}
      title="Eliminar categoría"
      description={`Vas a eliminar la categoría "${name}". No se podrá borrar si todavía tiene contenido asociado.`}
    />
  );
}
