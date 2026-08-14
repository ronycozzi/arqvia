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
import { prisma } from "@/lib/db";
import { logServerError } from "@/lib/logger";
import { testimonialFormSchema } from "@/lib/validations";

export type TestimonialActionState = {
  ok: boolean;
  message: string;
  expectedUpdatedAt?: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    featured: boolean;
    id: string;
    title: string;
  };
};

async function assertCanManageTestimonials() {
  return getVerifiedAdminSession(contentManagerRoles);
}

function revalidateTestimonialSurfaces() {
  revalidatePath("/");
  revalidatePath("/proyectos/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/testimonials");
}

export async function saveTestimonial(
  _previousState: TestimonialActionState,
  formData: FormData,
): Promise<TestimonialActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);
  const session = await assertCanManageTestimonials();

  if (!session) {
    return {
      ok: false,
      message: "Tu rol no puede modificar testimonios.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = testimonialFormSchema.safeParse(Object.fromEntries(formData));
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

  let testimonial;
  try {
    const expectedUpdatedAt = isUpdate
      ? requireExpectedUpdatedAt(formData)
      : null;
    testimonial = await prisma.$transaction(async (tx) => {
      const data = {
        name: input.name,
        role: input.role || null,
        projectType: input.projectType,
        location: input.location,
        quote: input.quote,
        imageUrl: input.imageUrl || null,
        projectId: input.projectId || null,
        featured: input.featured,
      };
      let savedTestimonial;

      if (isUpdate) {
        const updateResult = await tx.testimonial.updateMany({
          where: { id: input.id, updatedAt: expectedUpdatedAt! },
          data,
        });
        assertContentVersionUpdated(updateResult.count);
        savedTestimonial = await tx.testimonial.findUniqueOrThrow({
          where: { id: input.id },
        });
      } else {
        savedTestimonial = await tx.testimonial.create({ data });
      }

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "Testimonial",
          entityId: savedTestimonial.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} el testimonio de ${savedTestimonial.name}`,
          userId: session.user.id,
        },
      });

      return savedTestimonial;
    });

  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ContentConcurrencyConflictError
          ? error.message
          : "No se pudo guardar el testimonio.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  revalidateTestimonialSurfaces();

  return {
    ok: true,
    message: `Testimonio ${isUpdate ? "actualizado" : "creado"} correctamente.`,
    expectedUpdatedAt: testimonial.updatedAt.toISOString(),
    resource: {
      featured: testimonial.featured,
      id: testimonial.id,
      title: testimonial.name,
    },
  };
}

export async function deleteTestimonial(formData: FormData) {
  const session = await assertCanManageTestimonials();
  const id = String(formData.get("id") || "");

  if (!session || !id) redirect("/admin/testimonials", RedirectType.replace);

  let deleted;
  try {
    deleted = await prisma.$transaction(async (tx) => {
      const deletedTestimonial = await tx.testimonial.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "Testimonial",
          entityId: deletedTestimonial.id,
          summary: `Eliminó el testimonio de ${deletedTestimonial.name}`,
          userId: session.user.id,
        },
      });

      return deletedTestimonial;
    });
  } catch (error) {
    logServerError("admin.testimonial.delete_failed", error, {
      testimonialId: id,
      userId: session.user.id,
    });
  }

  if (!deleted) {
    redirect("/admin/testimonials?error=delete-failed", RedirectType.replace);
  }

  revalidateTestimonialSurfaces();
  redirect("/admin/testimonials", RedirectType.replace);
}
