import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BlogPostForm,
  type AdminBlogPostFormValue,
} from "@/components/admin/blog-post-form";
import { canManageContent, requireVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar publicación",
  robots: { index: false, follow: false },
};

export default async function EditBlogPostPage({ params }: PageProps) {
  const session = await requireVerifiedAdminSession();
  const canEdit = canManageContent(session.user.role);
  const { id } = await params;
  const [post, mediaAssets] = await Promise.all([
    prisma.blogPost.findUnique({ where: { id } }),
    getAdminMediaOptions(),
  ]);
  if (!post) notFound();

  const value: AdminBlogPostFormValue = {
    id: post.id,
    expectedUpdatedAt: post.updatedAt.toISOString(),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    category: post.category,
    status: post.status,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
  };

  return (
    <section className="grid gap-6">
      <div className="premium-panel p-6">
        <Link
          href="/admin/blog"
          className="text-sm font-semibold text-ink underline decoration-bronze underline-offset-4"
        >
          Volver a blog
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          Editar publicación
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">{post.title}</h2>
      </div>
      <BlogPostForm canEdit={canEdit} mediaAssets={mediaAssets} post={value} />
    </section>
  );
}
