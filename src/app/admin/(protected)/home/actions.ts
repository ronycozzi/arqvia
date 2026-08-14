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
  HOME_CONTENT_ID,
  homeContentFromForm,
  serializeHomeContent,
} from "@/lib/home-content";
import { logServerError } from "@/lib/logger";
import { revalidateHomeContentSurfaces } from "@/lib/revalidation";
import { homeContentFormSchema } from "@/lib/validations";

export type HomeContentActionState = {
  errors?: Partial<Record<string, string[]>>;
  expectedUpdatedAt?: string;
  message: string;
  ok: boolean;
  resource?: { id: string; title: string };
};

export async function updateHomeContent(
  _previousState: HomeContentActionState,
  formData: FormData,
): Promise<HomeContentActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);
  const session = await getVerifiedAdminSession(contentManagerRoles);

  if (!session) {
    return {
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message: "Tu rol no puede modificar el contenido de la home.",
      ok: false,
    };
  }

  const parsed = homeContentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message: "Revisá los campos marcados.",
      ok: false,
    };
  }

  const data = serializeHomeContent(homeContentFromForm(parsed.data));
  let savedContent;

  try {
    savedContent = await prisma.$transaction(async (tx) => {
      const existing = await tx.homeContent.findUnique({
        where: { id: HOME_CONTENT_ID },
        select: { id: true },
      });

      let content;
      if (existing) {
        const expectedUpdatedAt = requireExpectedUpdatedAt(formData);
        const updateResult = await tx.homeContent.updateMany({
          where: { id: HOME_CONTENT_ID, updatedAt: expectedUpdatedAt },
          data,
        });
        assertContentVersionUpdated(updateResult.count);
        content = await tx.homeContent.findUniqueOrThrow({
          where: { id: HOME_CONTENT_ID },
        });
      } else {
        if (submittedExpectedUpdatedAt) {
          throw new ContentConcurrencyConflictError();
        }
        content = await tx.homeContent.create({
          data: { id: HOME_CONTENT_ID, ...data },
        });
      }

      await tx.auditLog.create({
        data: {
          action: existing ? "UPDATE" : "CREATE",
          entity: "HomeContent",
          entityId: HOME_CONTENT_ID,
          summary: `${existing ? "Actualizó" : "Creó"} el contenido comercial de la home`,
          userId: session.user.id,
        },
      });

      return content;
    });
  } catch (error) {
    if (!(error instanceof ContentConcurrencyConflictError)) {
      logServerError("admin.home_content.update_failed", error, {
        userId: session.user.id,
      });
    }
    return {
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      message:
        error instanceof ContentConcurrencyConflictError
          ? error.message
          : "No pudimos guardar la home. Reintentá en unos segundos.",
      ok: false,
    };
  }

  revalidateHomeContentSurfaces();

  return {
    expectedUpdatedAt: savedContent.updatedAt.toISOString(),
    message: "Home actualizada. Los cambios ya están disponibles en el sitio público.",
    ok: true,
    resource: { id: savedContent.id, title: parsed.data.projectsTitle },
  };
}
