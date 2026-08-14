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
import { blogPostFormSchema } from "@/lib/validations";

export type BlogPostActionState = {
  ok: boolean;
  message: string;
  expectedUpdatedAt?: string;
  errors?: Partial<Record<string, string[]>>;
  resource?: {
    id: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    title: string;
  };
};

async function assertCanManageBlog() {
  return getVerifiedAdminSession(contentManagerRoles);
}

export async function saveBlogPost(
  _previousState: BlogPostActionState,
  formData: FormData,
): Promise<BlogPostActionState> {
  void _previousState;
  const submittedExpectedUpdatedAt = getSubmittedExpectedUpdatedAt(formData);

  const session = await assertCanManageBlog();

  if (!session) {
    return {
      ok: false,
      message: "Tu rol no puede modificar publicaciones.",
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const parsed = blogPostFormSchema.safeParse(Object.fromEntries(formData));

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
      const currentPost = isUpdate
        ? await tx.blogPost.findUnique({
            where: { id: input.id },
            select: { publishedAt: true, slug: true },
          })
        : null;
      const publishedAt =
        input.status === "PUBLISHED"
          ? (currentPost?.publishedAt ?? new Date())
          : null;
      const postData = {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: input.content,
        coverImage: input.coverImage,
        category: input.category,
        status: input.status,
        publishedAt,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
      };
      let savedPost;

      if (isUpdate) {
        const updateResult = await tx.blogPost.updateMany({
          where: { id: input.id, updatedAt: expectedUpdatedAt! },
          data: postData,
        });
        assertContentVersionUpdated(updateResult.count);
        savedPost = await tx.blogPost.findUniqueOrThrow({
          where: { id: input.id },
        });
      } else {
        savedPost = await tx.blogPost.create({
          data: { ...postData, authorId: session.user.id },
        });
      }

      await syncContentRedirects(tx, {
        currentPath: buildContentPath("BLOG_POST", savedPost.slug),
        previousPath: currentPost?.slug
          ? buildContentPath("BLOG_POST", currentPost.slug)
          : null,
        resourceId: savedPost.id,
        resourceType: "BLOG_POST",
      });

      await tx.auditLog.create({
        data: {
          action: isUpdate ? "UPDATE" : "CREATE",
          entity: "BlogPost",
          entityId: savedPost.id,
          summary: `${isUpdate ? "Actualizó" : "Creó"} la publicación ${savedPost.title}`,
          userId: session.user.id,
        },
      });

      return {
        post: savedPost,
        previousSlug: currentPost?.slug ?? null,
      };
    });
  } catch (error) {
    const message =
      error instanceof ContentConcurrencyConflictError
        ? error.message
        : error instanceof ContentPathConflictError
        ? "Esa URL pertenece al historial de otra publicación. Elegí un slug diferente."
        : error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe una publicación con ese slug."
        : "No se pudo guardar la publicación.";

    return {
      ok: false,
      message,
      expectedUpdatedAt: submittedExpectedUpdatedAt,
    };
  }

  const { post, previousSlug } = writeResult;
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  if (previousSlug && previousSlug !== post.slug) {
    revalidatePath(`/blog/${previousSlug}`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/blog");

  return {
    ok: true,
    message: `Publicación ${isUpdate ? "actualizada" : "creada"} correctamente.`,
    expectedUpdatedAt: post.updatedAt.toISOString(),
    resource: {
      id: post.id,
      slug: post.slug,
      status: post.status,
      title: post.title,
    },
  };
}

export async function deleteBlogPost(formData: FormData) {
  const session = await assertCanManageBlog();
  const id = String(formData.get("id") || "");

  if (!session || !id) redirect("/admin/blog", RedirectType.replace);

  let post;
  try {
    post = await prisma.$transaction(async (tx) => {
      const deletedPost = await tx.blogPost.delete({ where: { id } });

      await deleteContentRedirects(tx, "BLOG_POST", deletedPost.id);

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "BlogPost",
          entityId: deletedPost.id,
          summary: `Eliminó la publicación ${deletedPost.title}`,
          userId: session.user.id,
        },
      });

      return deletedPost;
    });
  } catch (error) {
    logServerError("admin.blog.delete_failed", error, {
      postId: id,
      userId: session.user.id,
    });
  }

  if (!post) {
    redirect("/admin/blog?error=delete-failed", RedirectType.replace);
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/blog");

  redirect("/admin/blog", RedirectType.replace);
}
