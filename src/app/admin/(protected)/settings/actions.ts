"use server";

import { revalidatePath } from "next/cache";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { CLIENT_CONFIG_ID, fallbackClientConfig } from "@/lib/client-config";
import {
  assertContentVersionUpdated,
  ContentConcurrencyConflictError,
  getSubmittedExpectedUpdatedAt,
  requireExpectedUpdatedAt,
} from "@/lib/content-concurrency";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { clientConfigSchema } from "@/lib/validations";

export type SettingsActionState = {
  ok: boolean;
  message: string;
  expectedUpdatedAt?: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    id: string;
    title: string;
  };
};

export async function updateClientSettings(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);
  const session = await getVerifiedAdminSession(adminOnlyRoles);

  if (!session) {
    return {
      ok: false,
      message: "Solo un usuario Admin puede modificar la configuración.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = clientConfigSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const configId = CLIENT_CONFIG_ID;
  let config;

  try {
    const expectedUpdatedAt = submittedExpectedUpdatedAt
      ? requireExpectedUpdatedAt(formData)
      : null;
    config = await prisma.$transaction(async (tx) => {
      let savedConfig;

      if (expectedUpdatedAt) {
        const updateResult = await tx.clientConfig.updateMany({
          where: { id: configId, updatedAt: expectedUpdatedAt },
          data: parsed.data,
        });
        assertContentVersionUpdated(updateResult.count);
        savedConfig = await tx.clientConfig.findUniqueOrThrow({
          where: { id: configId },
        });
      } else {
        const existingConfig = await tx.clientConfig.findUnique({
          where: { id: configId },
          select: { id: true },
        });
        if (existingConfig) {
          throw new ContentConcurrencyConflictError();
        }
        savedConfig = await tx.clientConfig.create({
          data: {
            id: configId,
            ...fallbackClientConfig,
            ...parsed.data,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "ClientConfig",
          entityId: configId,
          summary: `Configuración de marca actualizada por ${session.user.email}`,
          userId: session.user.id,
        },
      });

      return savedConfig;
    });
  } catch (error) {
    if (error instanceof ContentConcurrencyConflictError) {
      return {
        ok: false,
        message: error.message,
        expectedUpdatedAt: submittedExpectedUpdatedAt,
      };
    }
    logServerError("admin.settings.update_failed", error, {
      userId: session.user.id,
    });
    return {
      ok: false,
      message: "No pudimos guardar la configuración. Reintentá en unos segundos.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/manifest.webmanifest");
  revalidatePath("/sitemap.xml");

  return {
    ok: true,
    message: "Configuración guardada. La home, header y footer ya usan estos datos.",
    expectedUpdatedAt: config.updatedAt.toISOString(),
    resource: {
      id: config.id,
      title: config.companyName,
    },
  };
}
