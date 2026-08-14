"use server";

import { contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import {
  assertContentVersionUpdated,
  ContentConcurrencyConflictError,
  getSubmittedExpectedUpdatedAt,
  requireExpectedUpdatedAt,
} from "@/lib/content-concurrency";
import { prisma } from "@/lib/db";
import {
  institutionalPageFromForm,
  serializeInstitutionalPage,
} from "@/lib/institutional-content";
import { logServerError } from "@/lib/logger";
import { revalidateInstitutionalPageSurfaces } from "@/lib/revalidation";
import { institutionalPageFormSchema } from "@/lib/validations";

export type InstitutionalPageActionState = {
  errors?: Partial<Record<string, string[]>>;
  expectedUpdatedAt?: string;
  message: string;
  ok: boolean;
  resource?: { slug: string; title: string };
};

export async function updateInstitutionalPage(
  _previousState: InstitutionalPageActionState,
  formData: FormData,
): Promise<InstitutionalPageActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) {
    return {
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message: "Tu rol no puede modificar páginas institucionales.",
      ok: false,
    };
  }

  const parsed = institutionalPageFormSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message: "Revisá los campos marcados.",
      ok: false,
    };
  }

  const publicPage = institutionalPageFromForm(parsed.data);
  const data = serializeInstitutionalPage(publicPage);
  let savedPage;

  try {
    savedPage = await prisma.$transaction(async (tx) => {
      const existing = await tx.institutionalPage.findUnique({
        where: { slug: parsed.data.slug },
        select: { id: true },
      });

      let page;
      if (existing) {
        const expectedUpdatedAt = requireExpectedUpdatedAt(formData);
        const result = await tx.institutionalPage.updateMany({
          where: { id: existing.id, updatedAt: expectedUpdatedAt },
          data,
        });
        assertContentVersionUpdated(result.count);
        page = await tx.institutionalPage.findUniqueOrThrow({
          where: { id: existing.id },
        });
      } else {
        if (submittedExpectedUpdatedAt) {
          throw new ContentConcurrencyConflictError();
        }
        page = await tx.institutionalPage.create({ data });
      }

      await tx.auditLog.create({
        data: {
          action: existing ? "UPDATE" : "CREATE",
          entity: "InstitutionalPage",
          entityId: page.id,
          summary: `${existing ? "Actualizó" : "Creó"} la página institucional: ${page.title}`,
          userId: session.user.id,
        },
      });

      return page;
    });
  } catch (error) {
    if (!(error instanceof ContentConcurrencyConflictError)) {
      logServerError("admin.institutional_page.update_failed", error, {
        slug: parsed.data.slug,
        userId: session.user.id,
      });
    }
    return {
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message:
        error instanceof ContentConcurrencyConflictError
          ? error.message
          : "No pudimos guardar la página. Reintentá en unos segundos.",
      ok: false,
    };
  }

  revalidateInstitutionalPageSurfaces(savedPage.slug);

  return {
    expectedUpdatedAt: savedPage.updatedAt.toISOString(),
    message: "Página actualizada y publicada correctamente.",
    ok: true,
    resource: { slug: savedPage.slug, title: savedPage.title },
  };
}
