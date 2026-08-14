import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BlogPostForm,
  type AdminBlogPostFormValue,
} from "@/components/admin/blog-post-form";
import { canManageContent, contentManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { getAdminMediaOptions } from "@/lib/admin-media-options";
import { imageKit } from "@/lib/content";

export const metadata: Metadata = {
  title: "Nueva publicación",
  robots: { index: false, follow: false },
};

const blankPost: AdminBlogPostFormValue = {
  title: "",
  slug: "",
  excerpt: "",
  content:
    "Escribí el desarrollo del artículo en párrafos separados por una línea en blanco.\n\nCada párrafo se convertirá en una sección clara para lectura y SEO.",
  coverImage: imageKit.house,
  category: "Arquitectura",
  status: "DRAFT",
  seoTitle: "",
  seoDescription: "",
};

export default async function NewBlogPostPage() {
  const session = await getVerifiedAdminSession(contentManagerRoles);
  if (!session) redirect("/admin");
  const canEdit = canManageContent(session.user.role);
  const mediaAssets = await getAdminMediaOptions();

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
          Nueva guía
        </p>
        <h2 className="mt-2 font-serif text-4xl text-ink">
          Cargar publicación.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/75">
          Creá contenido útil para búsquedas locales, consultas más informadas y
          autoridad comercial.
        </p>
      </div>
      <BlogPostForm canEdit={canEdit} mediaAssets={mediaAssets} post={blankPost} />
    </section>
  );
}
