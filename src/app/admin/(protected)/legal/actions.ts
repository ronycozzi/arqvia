"use server";

import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  assertContentVersionUpdated,
  ContentConcurrencyConflictError,
  getSubmittedExpectedUpdatedAt,
  requireExpectedUpdatedAt,
} from "@/lib/content-concurrency";
import { prisma } from "@/lib/db";
import { revalidateLegalSurfaces } from "@/lib/revalidation";
import { legalPageFormSchema } from "@/lib/validations";

export type LegalPageActionState = {
  errors?: Partial<Record<string, string[]>>;
  expectedUpdatedAt?: string;
  message: string;
  ok: boolean;
  resource?: {
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    title: string;
  };
};

export async function saveLegalPage(
  _previousState: LegalPageActionState,
  formData: FormData,
): Promise<LegalPageActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) {
    return {
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message: "Solo un administrador puede modificar documentos legales.",
      ok: false,
    };
  }

  const parsed = legalPageFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message: "Revisá los campos marcados.",
      ok: false,
    };
  }

  const input = parsed.data;
  let savedPage;
  try {
    savedPage = await prisma.$transaction(async (tx) => {
      const existing = await tx.legalPage.findUnique({
        where: { slug: input.slug },
      });
      const data = {
        content: input.content,
        reviewedAt: input.status === "PUBLISHED" ? new Date() : null,
        reviewedBy: input.reviewedBy || null,
        seoDescription: input.seoDescription,
        seoTitle: input.seoTitle,
        status: input.status,
        summary: input.summary,
        title: input.title,
      };

      let page;
      if (existing) {
        const expectedUpdatedAt = requireExpectedUpdatedAt(formData);
        const updateResult = await tx.legalPage.updateMany({
          where: { id: existing.id, updatedAt: expectedUpdatedAt },
          data,
        });
        assertContentVersionUpdated(updateResult.count);
        page = await tx.legalPage.findUniqueOrThrow({
          where: { id: existing.id },
        });
      } else {
        page = await tx.legalPage.create({
          data: { ...data, slug: input.slug },
        });
      }

      await tx.auditLog.create({
        data: {
          action: existing ? "UPDATE" : "CREATE",
          entity: "LegalPage",
          entityId: page.id,
          summary: `${existing ? "Actualizó" : "Creó"} el documento legal: ${page.title}`,
          userId: session.user.id,
        },
      });

      return page;
    });
  } catch (error) {
    return {
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message:
        error instanceof ContentConcurrencyConflictError
          ? error.message
          : "No se pudo guardar el documento legal.",
      ok: false,
    };
  }

  revalidateLegalSurfaces(input.slug);

  return {
    expectedUpdatedAt: savedPage.updatedAt.toISOString(),
    message:
      savedPage.status === "PUBLISHED"
        ? "Documento publicado correctamente."
        : "Borrador guardado. La versión pública anterior se mantiene sin cambios.",
    ok: true,
    resource: {
      slug: savedPage.slug,
      status: savedPage.status,
      title: savedPage.title,
    },
  };
}
