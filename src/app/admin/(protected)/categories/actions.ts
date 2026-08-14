"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { categoryFormSchema } from "@/lib/validations";

export type CategoryActionState = {
  ok: boolean;
  message: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    id: string;
    title: string;
    type: "project" | "service";
  };
};

async function assertCanManageCategories() {
  return getVerifiedAdminSession(contentManagerRoles);
}

function revalidateCategorySurfaces() {
  revalidatePath("/");
  revalidatePath("/proyectos");
  revalidatePath("/servicios");
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
}

export async function saveCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  void _previousState;
  const session = await assertCanManageCategories();
  if (!session) return { ok: false, message: "Tu rol no puede modificar categorías." };

  const parsed = categoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const isUpdate = Boolean(input.id);

  let category;
  try {
    category = await prisma.$transaction(async (tx) => {
      const savedCategory =
        input.type === "project"
          ? isUpdate
          ? await tx.projectCategory.update({
              where: { id: input.id },
              data: {
                name: input.name,
                slug: input.slug,
                description: input.description || null,
              },
            })
          : await tx.projectCategory.create({
              data: {
                name: input.name,
                slug: input.slug,
                description: input.description || null,
              },
            })
          : isUpdate
          ? await tx.serviceCategory.update({
              where: { id: input.id },
              data: {
                name: input.name,
                slug: input.slug,
                description: input.description || null,
              },
            })
          : await tx.serviceCategory.create({
              data: {
                name: input.name,
                slug: input.slug,
                description: input.description || null,
              },
            });

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: input.type === "project" ? "ProjectCategory" : "ServiceCategory",
          entityId: savedCategory.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} categoría de ${
            input.type === "project" ? "proyectos" : "servicios"
          }: ${savedCategory.name}`,
          userId: session.user.id,
        },
      });

      return savedCategory;
    });

  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe una categoría con ese slug."
        : "No se pudo guardar la categoría.";
    return { ok: false, message };
  }

  revalidateCategorySurfaces();

  return {
    ok: true,
    message: `Categoría ${isUpdate ? "actualizada" : "creada"} correctamente.`,
    resource: {
      id: category.id,
      title: category.name,
      type: input.type,
    },
  };
}

export async function deleteCategory(formData: FormData) {
  const session = await assertCanManageCategories();
  const id = String(formData.get("id") || "");
  const type = String(formData.get("type") || "");

  if (!session || !id || !["project", "service"].includes(type)) {
    redirect("/admin/categories", RedirectType.replace);
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      if (type === "project") {
        const usage = await tx.project.count({ where: { categoryId: id } });
        if (usage > 0) return { inUse: true } as const;

        const deleted = await tx.projectCategory.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            action: "DELETE",
            entity: "ProjectCategory",
            entityId: deleted.id,
            summary: `Eliminó categoría de proyectos: ${deleted.name}`,
            userId: session.user.id,
          },
        });
        return { inUse: false } as const;
      }

      const usage = await tx.service.count({ where: { categoryId: id } });
      if (usage > 0) return { inUse: true } as const;

      const deleted = await tx.serviceCategory.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "ServiceCategory",
          entityId: deleted.id,
          summary: `Eliminó categoría de servicios: ${deleted.name}`,
          userId: session.user.id,
        },
      });
      return { inUse: false } as const;
    });
  } catch (error) {
    logServerError("admin.category.delete_failed", error, {
      categoryId: id,
      categoryType: type,
      userId: session.user.id,
    });
  }

  if (!result) {
    redirect("/admin/categories?error=delete-failed", RedirectType.replace);
  }
  if (result.inUse) {
    redirect("/admin/categories?error=category-in-use", RedirectType.replace);
  }

  revalidateCategorySurfaces();
  redirect("/admin/categories", RedirectType.replace);
}
