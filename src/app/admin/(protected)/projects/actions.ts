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
import { hasComparableBeforeAfterPair } from "@/lib/project-quality";
import { projectFormSchema } from "@/lib/validations";

export type ProjectActionState = {
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

const initialProjectState: ProjectActionState = {
  ok: false,
  message: "",
};

type ProjectImageKind = "BEFORE" | "PROCESS" | "AFTER" | "RENDER" | "PLAN" | "FINAL";

const imageTypeMap: Record<string, ProjectImageKind> = {
  after: "AFTER",
  antes: "BEFORE",
  before: "BEFORE",
  final: "FINAL",
  plan: "PLAN",
  plano: "PLAN",
  process: "PROCESS",
  proceso: "PROCESS",
  render: "RENDER",
};

function parseGallery(value: string, projectTitle: string, fallbackAlt: string) {
  const invalidTypes: string[] = [];
  const images = value
    .split(/\r?\n/)
    .flatMap((line) => {
      const normalizedLine = line.trim();
      if (!normalizedLine) return [];

      const [url, rawType, rawAlt, rawCaption] = normalizedLine
        .split("|")
        .map((item) => item.trim());
      const normalizedType = (rawType || "").toLowerCase();
      const type = normalizedType ? imageTypeMap[normalizedType] : "PROCESS";

      if (normalizedType && !type) {
        invalidTypes.push(rawType);
        return [];
      }

      return [
        {
          url,
          type,
          altText: rawAlt || fallbackAlt || `${projectTitle} imagen`,
          caption: rawCaption || null,
        },
      ];
    })
    .filter((item) => item.url);

  return { images, invalidTypes };
}

function validateGallerySemantics(
  images: ReturnType<typeof parseGallery>["images"],
  invalidTypes: string[],
): string | null {
  if (invalidTypes.length) {
    return `Tipo de imagen no reconocido: ${Array.from(new Set(invalidTypes)).join(", ")}. Usá final, before, after, process, render o plan.`;
  }

  const beforeCount = images.filter((image) => image.type === "BEFORE").length;
  const afterCount = images.filter((image) => image.type === "AFTER").length;

  if ((beforeCount && !afterCount) || (!beforeCount && afterCount)) {
    return "Para mostrar antes/después cargá el par completo: una imagen tipo before y una imagen tipo after del mismo ambiente.";
  }

  if (beforeCount > 1 || afterCount > 1) {
    return "Usá una sola imagen before y una sola imagen after para el comparador principal. El resto puede ir como process, final, render o plan.";
  }

  if (beforeCount && afterCount && !hasComparableBeforeAfterPair(images)) {
    return "El before y el after deben describir el mismo ambiente. Usá alt text o descripción con el espacio concreto, por ejemplo cocina antes y cocina después.";
  }

  return null;
}

async function assertCanManageProjects() {
  return getVerifiedAdminSession(contentManagerRoles);
}

export async function saveProject(
  _previousState: ProjectActionState = initialProjectState,
  formData: FormData,
): Promise<ProjectActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);

  const session = await assertCanManageProjects();

  if (!session) {
    return {
      ok: false,
      message: "Tu rol no puede modificar proyectos.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = projectFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const { images: gallery, invalidTypes } = parseGallery(
    input.gallery,
    input.title,
    input.imageAlt,
  );
  const galleryError = validateGallerySemantics(gallery, invalidTypes);
  if (galleryError) {
    return {
      ok: false,
      message: "Revisá la galería del proyecto.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
      errors: { gallery: [galleryError] },
    };
  }
  const isUpdate = Boolean(input.id);

  let writeResult;
  try {
    const expectedUpdatedAt = isUpdate
      ? requireExpectedUpdatedAt(formData)
      : null;
    writeResult = await prisma.$transaction(async (tx) => {
      const previousProject = isUpdate
        ? await tx.project.findUnique({
            where: { id: input.id },
            select: { publishedAt: true, slug: true },
          })
        : null;
      const publishedAt =
        input.publicationStatus === "PUBLISHED"
          ? (previousProject?.publishedAt ?? new Date())
          : null;
      const projectData = {
        title: input.title,
        publicationStatus: input.publicationStatus,
        publishedAt,
        slug: input.slug,
        summary: input.summary,
        description: input.description,
        location: input.location,
        year: input.year,
        areaM2: input.areaM2,
        status: input.status,
        clientType: input.clientType,
        servicePerformed: input.servicePerformed,
        coverImage: input.coverImage,
        challenge: input.challenge,
        solution: input.solution,
        process: input.process,
        result: input.result,
        optimized: input.optimized,
        specialNote: input.specialNote,
        materials: input.materials,
        duration: input.duration,
        constructionSystem: input.constructionSystem,
        currentStage: input.currentStage,
        responsibleTeam: input.responsibleTeam,
        architectDirector: input.architectDirector,
        supplier: input.supplier || null,
        budgetRange: input.budgetRange || null,
        featured: input.featured,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        seoCategory: input.seoCategory,
        imageAlt: input.imageAlt,
        categoryId: input.categoryId,
        serviceId: input.serviceId || null,
      };
      let project;

      if (isUpdate) {
        const updateResult = await tx.project.updateMany({
          where: { id: input.id, updatedAt: expectedUpdatedAt! },
          data: projectData,
        });
        assertContentVersionUpdated(updateResult.count);
        project = await tx.project.findUniqueOrThrow({
          where: { id: input.id },
        });
      } else {
        project = await tx.project.create({ data: projectData });
      }

      await tx.projectImage.deleteMany({ where: { projectId: project.id } });
      await tx.projectImage.createMany({
        data: gallery.map((image, index) => ({
          projectId: project.id,
          url: image.url,
          altText: image.altText,
          caption: image.caption || (index === 0 ? "Imagen principal" : null),
          type: index === 0 && image.type === "PROCESS" ? "FINAL" : image.type,
          sortOrder: index,
        })),
      });

      await syncContentRedirects(tx, {
        currentPath: buildContentPath("PROJECT", project.slug),
        previousPath: previousProject?.slug
          ? buildContentPath("PROJECT", previousProject.slug)
          : null,
        resourceId: project.id,
        resourceType: "PROJECT",
      });

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "Project",
          entityId: project.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} el proyecto ${project.title}`,
          userId: session.user.id,
        },
      });

      return {
        previousSlug: previousProject?.slug ?? null,
        project,
      };
    });
  } catch (error) {
    const message =
      error instanceof ContentConcurrencyConflictError
        ? error.message
        : error instanceof ContentPathConflictError
        ? "Esa URL pertenece al historial de otro proyecto. Elegí un slug diferente."
        : error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un proyecto con ese slug."
        : "No se pudo guardar el proyecto.";

    return {
      ok: false,
      message,
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const { previousSlug, project: savedProject } = writeResult;
  revalidatePath("/");
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${savedProject.slug}`);
  if (previousSlug && previousSlug !== savedProject.slug) {
    revalidatePath(`/proyectos/${previousSlug}`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");

  return {
    ok: true,
    message: `Proyecto ${isUpdate ? "actualizado" : "creado"} correctamente.`,
    expectedUpdatedAt: savedProject.updatedAt.toISOString(),
    resource: {
      id: savedProject.id,
      publicationStatus: savedProject.publicationStatus,
      slug: savedProject.slug,
      title: savedProject.title,
    },
  };
}

export async function deleteProject(formData: FormData) {
  const session = await assertCanManageProjects();
  const id = String(formData.get("id") || "");

  if (!session || !id) redirect("/admin/projects", RedirectType.replace);

  let project;
  try {
    project = await prisma.$transaction(async (tx) => {
      const deletedProject = await tx.project.delete({ where: { id } });

      await deleteContentRedirects(tx, "PROJECT", deletedProject.id);

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "Project",
          entityId: deletedProject.id,
          summary: `Eliminó el proyecto ${deletedProject.title}`,
          userId: session.user.id,
        },
      });

      return deletedProject;
    });
  } catch (error) {
    logServerError("admin.project.delete_failed", error, {
      projectId: id,
      userId: session.user.id,
    });
  }

  if (!project) {
    redirect("/admin/projects?error=delete-failed", RedirectType.replace);
  }

  revalidatePath("/");
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${project.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");

  redirect("/admin/projects", RedirectType.replace);
}
