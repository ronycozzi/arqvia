"use server";

import { redirect, RedirectType } from "next/navigation";
import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  assertContentVersionUpdated,
  ContentConcurrencyConflictError,
  getSubmittedExpectedUpdatedAt,
  requireExpectedUpdatedAt,
} from "@/lib/content-concurrency";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { revalidateFaqSurfaces } from "@/lib/revalidation";
import { faqFormSchema } from "@/lib/validations";

export type FaqActionState = {
  ok: boolean;
  message: string;
  expectedUpdatedAt?: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    active: boolean;
    id: string;
    title: string;
  };
};

async function assertCanManageFaqs() {
  return getVerifiedAdminSession(contentManagerRoles);
}

export async function saveFaq(
  _previousState: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);

  const session = await assertCanManageFaqs();

  if (!session) {
    return {
      ok: false,
      message: "Tu rol no puede modificar preguntas frecuentes.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = faqFormSchema.safeParse(Object.fromEntries(formData));

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

  let faq;
  try {
    const expectedUpdatedAt = isUpdate
      ? requireExpectedUpdatedAt(formData)
      : null;
    faq = await prisma.$transaction(async (tx) => {
      const data = {
        question: input.question,
        answer: input.answer,
        category: input.category,
        sortOrder: input.sortOrder,
        active: input.active,
        relatedServiceId: input.relatedServiceId || null,
      };
      let savedFaq;

      if (isUpdate) {
        const updateResult = await tx.faq.updateMany({
          where: { id: input.id, updatedAt: expectedUpdatedAt! },
          data,
        });
        assertContentVersionUpdated(updateResult.count);
        savedFaq = await tx.faq.findUniqueOrThrow({
          where: { id: input.id },
        });
      } else {
        savedFaq = await tx.faq.create({ data });
      }

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "Faq",
          entityId: savedFaq.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} la pregunta frecuente: ${savedFaq.question}`,
          userId: session.user.id,
        },
      });

      return savedFaq;
    });

  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ContentConcurrencyConflictError
          ? error.message
          : "No se pudo guardar la pregunta frecuente.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  revalidateFaqSurfaces();

  return {
    ok: true,
    message: `Pregunta frecuente ${isUpdate ? "actualizada" : "creada"} correctamente.`,
    expectedUpdatedAt: faq.updatedAt.toISOString(),
    resource: {
      active: faq.active,
      id: faq.id,
      title: faq.question,
    },
  };
}

export async function deleteFaq(formData: FormData) {
  const session = await assertCanManageFaqs();
  const id = String(formData.get("id") || "");

  if (!session || !id) redirect("/admin/faq", RedirectType.replace);

  let deleted;
  try {
    deleted = await prisma.$transaction(async (tx) => {
      const deletedFaq = await tx.faq.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "Faq",
          entityId: deletedFaq.id,
          summary: `Eliminó la pregunta frecuente: ${deletedFaq.question}`,
          userId: session.user.id,
        },
      });

      return deletedFaq;
    });
  } catch (error) {
    logServerError("admin.faq.delete_failed", error, {
      faqId: id,
      userId: session.user.id,
    });
  }

  if (!deleted) {
    redirect("/admin/faq?error=delete-failed", RedirectType.replace);
  }

  revalidateFaqSurfaces();
  redirect("/admin/faq", RedirectType.replace);
}
