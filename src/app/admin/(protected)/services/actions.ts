"use server";

import { revalidatePath } from "next/cache";
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
import { serviceFormSchema } from "@/lib/validations";

export type ServiceActionState = {
  ok: boolean;
  message: string;
  expectedUpdatedAt?: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    id: string;
    publicationStatus: "DRAFT" | "PUBLISHED";
    slug: string;
    title: string;
  };
};

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaqLines(value: string) {
  return splitLines(value).map((line) => {
    const [question, ...answerParts] = line.split("|");
    return {
      question: question?.trim() || "¿Puedo solicitar una consulta inicial?",
      answer:
        answerParts.join("|").trim() ||
        "Sí. Podemos revisar alcance, etapa actual y próximos pasos antes de avanzar.",
    };
  });
}

async function assertCanManageServices() {
  return getVerifiedAdminSession(contentManagerRoles);
}

export async function saveService(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);

  const session = await assertCanManageServices();

  if (!session) {
    return {
      ok: false,
      message: "Tu rol no puede modificar servicios.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = serviceFormSchema.safeParse(Object.fromEntries(formData));

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
      const previousService = isUpdate
      ? await tx.service.findUnique({
          where: { id: input.id },
          select: { publishedAt: true, slug: true },
        })
      : null;
      const publishedAt =
        input.publicationStatus === "PUBLISHED"
          ? (previousService?.publishedAt ?? new Date())
          : null;

      const serviceData = {
        title: input.title,
        publicationStatus: input.publicationStatus,
        publishedAt,
        slug: input.slug,
        categoryId: input.categoryId,
        icon: input.icon,
        shortDescription: input.shortDescription,
        description: input.description,
        coverImage: input.coverImage,
        mainBenefit: input.mainBenefit,
        audience: input.audience,
        included: splitLines(input.included).join("\n"),
        benefits: splitLines(input.benefits).join("\n"),
        process: splitLines(input.process).join("\n"),
        faq: JSON.stringify(parseFaqLines(input.faq)),
        whatsappMessage: input.whatsappMessage,
        featured: input.featured,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
      };
      let savedService;

      if (isUpdate) {
        const updateResult = await tx.service.updateMany({
          where: { id: input.id, updatedAt: expectedUpdatedAt! },
          data: serviceData,
        });
        assertContentVersionUpdated(updateResult.count);
        savedService = await tx.service.findUniqueOrThrow({
          where: { id: input.id },
        });
      } else {
        savedService = await tx.service.create({ data: serviceData });
      }

      await syncContentRedirects(tx, {
        currentPath: buildContentPath("SERVICE", savedService.slug),
        previousPath: previousService?.slug
          ? buildContentPath("SERVICE", previousService.slug)
          : null,
        resourceId: savedService.id,
        resourceType: "SERVICE",
      });

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "Service",
          entityId: savedService.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} el servicio ${savedService.title}`,
          userId: session.user.id,
        },
      });

      const relatedProjects = await tx.project.findMany({
        where: { serviceId: savedService.id },
        select: { slug: true },
      });

      return {
        previousSlug: previousService?.slug ?? null,
        relatedProjectSlugs: relatedProjects.map((project) => project.slug),
        service: savedService,
      };
    });
  } catch (error) {
    const message =
      error instanceof ContentConcurrencyConflictError
        ? error.message
        : error instanceof ContentPathConflictError
        ? "Esa URL pertenece al historial de otro servicio. Elegí un slug diferente."
        : error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un servicio con ese slug."
        : "No se pudo guardar el servicio.";

    return {
      ok: false,
      message,
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const { previousSlug, relatedProjectSlugs, service } = writeResult;
  revalidatePath("/", "layout");
  revalidatePath("/servicios");
  revalidatePath(`/servicios/${service.slug}`);
  if (previousSlug && previousSlug !== service.slug) {
    revalidatePath(`/servicios/${previousSlug}`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/proyectos");
  for (const slug of relatedProjectSlugs) {
    revalidatePath(`/proyectos/${slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/services");

  return {
    ok: true,
    message: `Servicio ${isUpdate ? "actualizado" : "creado"} correctamente.`,
    expectedUpdatedAt: service.updatedAt.toISOString(),
    resource: {
      id: service.id,
      publicationStatus: service.publicationStatus,
      slug: service.slug,
      title: service.title,
    },
  };
}

export async function deleteService(formData: FormData) {
  const session = await assertCanManageServices();
  const id = String(formData.get("id") || "");

  if (!session || !id) redirect("/admin/services", RedirectType.replace);

  let deleteResult;
  try {
    deleteResult = await prisma.$transaction(async (tx) => {
      const affectedProjects = await tx.project.findMany({
        where: { serviceId: id },
        select: { slug: true },
      });

      await tx.project.updateMany({
        where: { serviceId: id },
        data: { serviceId: null },
      });

      const deleted = await tx.service.delete({ where: { id } });

      await deleteContentRedirects(tx, "SERVICE", deleted.id);

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "Service",
          entityId: deleted.id,
          summary: `Eliminó el servicio ${deleted.title}`,
          userId: session.user.id,
        },
      });

      return {
        affectedProjectSlugs: affectedProjects.map((project) => project.slug),
        service: deleted,
      };
    });
  } catch (error) {
    logServerError("admin.service.delete_failed", error, {
      serviceId: id,
      userId: session.user.id,
    });
  }

  if (!deleteResult) {
    redirect("/admin/services?error=delete-failed", RedirectType.replace);
  }
  const { affectedProjectSlugs, service } = deleteResult;

  revalidatePath("/", "layout");
  revalidatePath("/servicios");
  revalidatePath(`/servicios/${service.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/proyectos");
  for (const slug of affectedProjectSlugs) {
    revalidatePath(`/proyectos/${slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/services");

  redirect("/admin/services", RedirectType.replace);
}
