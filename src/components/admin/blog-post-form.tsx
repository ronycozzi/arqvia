"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type BlogPostActionState,
  saveBlogPost,
} from "@/app/admin/(protected)/blog/actions";
import {
  MediaImageField,
  type AdminMediaOption,
} from "@/components/admin/media-fields";
import { PostSaveActions } from "@/components/admin/post-save-actions";

export type AdminBlogPostFormValue = {
  id?: string;
  expectedUpdatedAt?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  status: "DRAFT" | "PUBLISHED";
  seoTitle: string;
  seoDescription: string;
};

const initialState: BlogPostActionState = {
  ok: false,
  message: "",
};

export function BlogPostForm({
  canEdit,
  mediaAssets = [],
  post,
}: {
  canEdit: boolean;
  mediaAssets?: AdminMediaOption[];
  post: AdminBlogPostFormValue;
}) {
  const [state, formAction, pending] = useActionState(saveBlogPost, initialState);
  const createdAndLocked = state.ok && !post.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={post.id || ""} />
      {post.id ? (
        <input
          name="expectedUpdatedAt"
          type="hidden"
          value={state.expectedUpdatedAt ?? post.expectedUpdatedAt ?? ""}
        />
      ) : null}

      {state.message ? (
        <div
          className={`border px-4 py-3 text-sm ${
            state.ok
              ? "border-olive/30 bg-mist text-ink"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      {createdAndLocked && state.resource ? (
        <PostSaveActions
          createHref="/admin/blog/new"
          editHref={`/admin/blog/${state.resource.id}`}
          publicHref={
            state.resource.status === "PUBLISHED"
              ? `/blog/${state.resource.slug}`
              : undefined
          }
          publicLabel="Ver publicación"
          resourceLabel="publicación"
          resourceName={state.resource.title}
        />
      ) : null}

      <BlogSection
        eyebrow="Publicación"
        title="Contenido editorial"
        description="Definí título, bajada, categoría, estado y cuerpo del artículo."
      >
        <TextField
          defaultValue={post.title}
          disabled={disabled}
          error={state.errors?.title?.[0]}
          label="Título"
          name="title"
        />
        <TextField
          defaultValue={post.slug}
          disabled={disabled}
          error={state.errors?.slug?.[0]}
          label="Slug"
          name="slug"
          placeholder="construccion-llave-en-mano"
        />
        <TextField
          defaultValue={post.category}
          disabled={disabled}
          error={state.errors?.category?.[0]}
          label="Categoría"
          name="category"
        />
        <SelectField
          defaultValue={post.status}
          disabled={disabled}
          error={state.errors?.status?.[0]}
          label="Estado"
          name="status"
          options={[
            { id: "DRAFT", name: "Borrador" },
            { id: "PUBLISHED", name: "Publicado" },
          ]}
        />
        <MediaImageField
          assets={mediaAssets}
          defaultValue={post.coverImage}
          disabled={disabled}
          error={state.errors?.coverImage?.[0]}
          label="Imagen principal"
          name="coverImage"
          preferredCategories={["Blog", "Proyecto", "Hero"]}
        />
        <TextareaField
          defaultValue={post.excerpt}
          disabled={disabled}
          error={state.errors?.excerpt?.[0]}
          label="Bajada"
          name="excerpt"
        />
        <TextareaField
          defaultValue={post.content}
          disabled={disabled}
          error={state.errors?.content?.[0]}
          label="Contenido"
          name="content"
          rows={12}
        />
      </BlogSection>

      <BlogSection
        eyebrow="SEO"
        title="Metadata del artículo"
        description="Optimizá el título y la descripción que aparecen en buscadores y redes."
      >
        <TextField
          defaultValue={post.seoTitle}
          disabled={disabled}
          error={state.errors?.seoTitle?.[0]}
          label="SEO title"
          name="seoTitle"
        />
        <TextareaField
          defaultValue={post.seoDescription}
          disabled={disabled}
          error={state.errors?.seoDescription?.[0]}
          label="SEO description"
          name="seoDescription"
        />
      </BlogSection>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar publicación"}
        </button>
      </div>
    </form>
  );
}

function BlogSection({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="premium-panel p-6">
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-3xl text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  defaultValue,
  disabled,
  error,
  label,
  name,
  placeholder,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <input
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function TextareaField({
  defaultValue,
  disabled,
  error,
  label,
  name,
  rows = 5,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  rows?: number;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <textarea
        className="min-h-28 w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        rows={rows}
        aria-invalid={Boolean(error)}
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function SelectField({
  defaultValue,
  disabled,
  error,
  label,
  name,
  options,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <select
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        aria-invalid={Boolean(error)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
