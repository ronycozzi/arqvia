"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { adminOnlyRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import {
  estimateConfigSchema,
  estimateRuleSchema,
} from "@/lib/validations";

export type EstimatorActionState = {
  ok: boolean;
  message: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    id: string;
    title: string;
    version: number;
  };
};

class EstimatorWriteConflictError extends Error {}
class EstimatorHasNoActiveRulesError extends Error {}

function parseExpectedVersion(formData: FormData) {
  const value = Number(formData.get("expectedVersion"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function reserveEstimatorVersion(
  tx: Prisma.TransactionClient,
  expectedVersion: number,
) {
  const updated = await tx.estimateConfig.updateMany({
    where: { id: "arqvia-estimator", version: expectedVersion },
    data: { version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new EstimatorWriteConflictError();
  return expectedVersion + 1;
}

export async function updateEstimateConfig(
  _previousState: EstimatorActionState,
  formData: FormData,
): Promise<EstimatorActionState> {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) {
    return { ok: false, message: "Solo Admin puede modificar el estimador." };
  }

  const expectedVersion = parseExpectedVersion(formData);
  const parsed = estimateConfigSchema.safeParse(Object.fromEntries(formData));
  if (!expectedVersion || !parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      errors: parsed.success
        ? { expectedVersion: ["La versión de configuración es inválida"] }
        : parsed.error.flatten().fieldErrors,
    };
  }

  let nextVersion;
  try {
    nextVersion = await prisma.$transaction(async (tx) => {
      if (parsed.data.enabled) {
        const activeRuleCount = await tx.estimateRule.count({
          where: { active: true },
        });
        if (!activeRuleCount) throw new EstimatorHasNoActiveRulesError();
      }
      const version = await reserveEstimatorVersion(tx, expectedVersion);
      await tx.estimateConfig.update({
        where: { id: "arqvia-estimator" },
        data: parsed.data,
      });
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "EstimateConfig",
          entityId: "arqvia-estimator",
          summary: `Actualizó la configuración del estimador a la versión ${version}`,
          userId: session.user.id,
        },
      });
      return version;
    });

  } catch (error) {
    if (error instanceof EstimatorHasNoActiveRulesError) {
      return {
        ok: false,
        message: "Activá al menos una categoría antes de publicar el estimador.",
      };
    }
    if (error instanceof EstimatorWriteConflictError) {
      return {
        ok: false,
        message:
          "Otra persona actualizó los valores. Recargá la página antes de volver a guardar.",
      };
    }
    logServerError("admin.estimator.config_update_failed", error, {
      userId: session.user.id,
    });
    return {
      ok: false,
      message: "No pudimos guardar la configuración. Reintentá en unos segundos.",
    };
  }

  revalidateEstimatorPaths();
  return {
    ok: true,
    message: "Configuración guardada y publicada en el estimador.",
    resource: {
      id: "arqvia-estimator",
      title: parsed.data.headline,
      version: nextVersion,
    },
  };
}

export async function saveEstimateRule(
  _previousState: EstimatorActionState,
  formData: FormData,
): Promise<EstimatorActionState> {
  const session = await getVerifiedAdminSession(adminOnlyRoles);
  if (!session) {
    return { ok: false, message: "Solo Admin puede modificar los rangos." };
  }

  const expectedVersion = parseExpectedVersion(formData);
  const parsed = estimateRuleSchema.safeParse(Object.fromEntries(formData));
  if (!expectedVersion || !parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      errors: parsed.success
        ? { expectedVersion: ["La versión de configuración es inválida"] }
        : parsed.error.flatten().fieldErrors,
    };
  }

  const { id, ...data } = parsed.data;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const nextVersion = await reserveEstimatorVersion(tx, expectedVersion);
      if (id && !data.active) {
        const config = await tx.estimateConfig.findUnique({
          where: { id: "arqvia-estimator" },
          select: { enabled: true },
        });
        if (config?.enabled) {
          const otherActiveRules = await tx.estimateRule.count({
            where: { active: true, id: { not: id } },
          });
          if (!otherActiveRules) throw new EstimatorHasNoActiveRulesError();
        }
      }
      const rule = id
        ? await tx.estimateRule.update({ where: { id }, data })
        : await tx.estimateRule.create({ data });
      await tx.auditLog.create({
        data: {
          action: id ? "UPDATE" : "CREATE",
          entity: "EstimateRule",
          entityId: rule.id,
          summary: `${id ? "Actualizó" : "Creó"} el rango ${rule.label} en la versión ${nextVersion}`,
          userId: session.user.id,
        },
      });
      return { rule, nextVersion };
    });

  } catch (error) {
    if (error instanceof EstimatorHasNoActiveRulesError) {
      return {
        ok: false,
        message:
          "No podés desactivar la última categoría activa mientras el estimador está publicado.",
      };
    }
    if (error instanceof EstimatorWriteConflictError) {
      return {
        ok: false,
        message:
          "La tabla de valores cambió. Recargá la página antes de guardar.",
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "Ya existe una categoría con esa clave.",
        errors: { key: ["Usá una clave única"] },
      };
    }
    logServerError("admin.estimator.rule_save_failed", error, {
      ruleId: id || null,
      userId: session.user.id,
    });
    return {
      ok: false,
      message: "No pudimos guardar el rango. Reintentá en unos segundos.",
    };
  }

  revalidateEstimatorPaths();
  return {
    ok: true,
    message: id ? "Rango actualizado." : "Rango creado.",
    resource: {
      id: result.rule.id,
      title: result.rule.label,
      version: result.nextVersion,
    },
  };
}

function revalidateEstimatorPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/estimador");
  revalidatePath("/sitemap.xml");
}
