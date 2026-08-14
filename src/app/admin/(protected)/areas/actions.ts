"use server";

import { redirect, RedirectType } from "next/navigation";
import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  assertContentVersionUpdated,
  ContentConcurrencyConflictError,
  getSubmittedExpectedUpdatedAt,
  requireExpectedUpdatedAt,
} from "@/lib/content-concurrency";
import {
  buildContentPath,
  ContentPathConflictError,
  deleteContentRedirects,
  syncContentRedirects,
} from "@/lib/content-redirects";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { revalidateAreaSurfaces } from "@/lib/revalidation";
import { areaFormSchema } from "@/lib/validations";

export type AreaActionState = {
  ok: boolean;
  message: string;
  expectedUpdatedAt?: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    active: boolean;
    id: string;
    slug: string;
    title: string;
  };
};

async function assertCanManageAreas() {
  return getVerifiedAdminSession(contentManagerRoles);
}

export async function saveArea(
  _previousState: AreaActionState,
  formData: FormData,
): Promise<AreaActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);
  const session = await assertCanManageAreas();

  if (!session) {
    return {
      ok: false,
      message: "Tu rol no puede modificar áreas.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = areaFormSchema.safeParse(Object.fromEntries(formData));
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

  let writeResult;
  try {
    const expectedUpdatedAt = isUpdate
      ? requireExpectedUpdatedAt(formData)
      : null;
    writeResult = await prisma.$transaction(async (tx) => {
      const previousArea = isUpdate
        ? await tx.area.findUnique({
            where: { id: input.id },
            select: { slug: true },
          })
        : null;
      const data = {
        name: input.name,
        slug: input.slug,
        description: input.description,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        active: input.active,
      };
      let savedArea;

      if (isUpdate) {
        const updateResult = await tx.area.updateMany({
          where: { id: input.id, updatedAt: expectedUpdatedAt! },
          data,
        });
        assertContentVersionUpdated(updateResult.count);
        savedArea = await tx.area.findUniqueOrThrow({
          where: { id: input.id },
        });
      } else {
        savedArea = await tx.area.create({ data });
      }

      await syncContentRedirects(tx, {
        currentPath: buildContentPath("AREA", savedArea.slug),
        previousPath: previousArea?.slug
          ? buildContentPath("AREA", previousArea.slug)
          : null,
        resourceId: savedArea.id,
        resourceType: "AREA",
      });

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "Area",
          entityId: savedArea.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} área de trabajo: ${savedArea.name}`,
          userId: session.user.id,
        },
      });

      return {
        previousSlug: previousArea?.slug ?? null,
        savedArea,
      };
    });
  } catch (error) {
    const message =
      error instanceof ContentConcurrencyConflictError
        ? error.message
        : error instanceof ContentPathConflictError
        ? "Esa URL pertenece al historial de otra zona. Elegí un slug diferente."
        : error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un área con ese slug."
        : "No se pudo guardar el área.";
    return {
      ok: false,
      message,
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const { previousSlug, savedArea } = writeResult;
  revalidateAreaSurfaces(previousSlug ? [previousSlug] : []);
  return {
    ok: true,
    message: `Área ${isUpdate ? "actualizada" : "creada"} correctamente.`,
    expectedUpdatedAt: savedArea.updatedAt.toISOString(),
    resource: {
      active: savedArea.active,
      id: savedArea.id,
      slug: savedArea.slug,
      title: savedArea.name,
    },
  };
}

export async function deleteArea(formData: FormData) {
  const session = await assertCanManageAreas();
  const id = String(formData.get("id") || "");
  if (!session || !id) redirect("/admin/areas", RedirectType.replace);

  let deleted;
  try {
    deleted = await prisma.$transaction(async (tx) => {
      const area = await tx.area.delete({ where: { id } });

      await deleteContentRedirects(tx, "AREA", area.id);

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "Area",
          entityId: area.id,
          summary: `Eliminó área de trabajo: ${area.name}`,
          userId: session.user.id,
        },
      });

      return area;
    });
  } catch (error) {
    logServerError("admin.area.delete_failed", error, {
      areaId: id,
      userId: session.user.id,
    });
  }

  if (!deleted) {
    redirect("/admin/areas?error=delete-failed", RedirectType.replace);
  }

  revalidateAreaSurfaces([deleted.slug]);
  redirect("/admin/areas", RedirectType.replace);
}
