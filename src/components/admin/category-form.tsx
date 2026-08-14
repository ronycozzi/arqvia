"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type CategoryActionState,
  saveCategory,
} from "@/app/admin/(protected)/categories/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";

export type AdminCategoryFormValue = {
  id?: string;
  type: "project" | "service";
  name: string;
  slug: string;
  description?: string | null;
};

const initialState: CategoryActionState = { ok: false, message: "" };

export function CategoryForm({
  canEdit,
  category,
}: {
  canEdit: boolean;
  category: AdminCategoryFormValue;
}) {
  const [state, formAction, pending] = useActionState(saveCategory, initialState);
  const createdAndLocked = state.ok && !category.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={category.id || ""} />
      <input name="type" type="hidden" value={category.type} />

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
          createHref={`/admin/categories/new?type=${state.resource.type}`}
          editHref={`/admin/categories/${state.resource.type}/${state.resource.id}`}
          publicHref={
            state.resource.type === "project" ? "/proyectos" : "/servicios"
          }
          publicLabel={
            state.resource.type === "project"
              ? "Ver proyectos"
              : "Ver servicios"
          }
          resourceLabel="categoría"
          resourceName={state.resource.title}
        />
      ) : null}

      <section className="premium-panel p-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            {category.type === "project" ? "Categoría de proyecto" : "Categoría de servicio"}
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Organización comercial y filtros
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            Estas categorías alimentan formularios del CMS y agrupación pública
            en proyectos o servicios.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={category.name}
            disabled={disabled}
            error={state.errors?.name?.[0]}
            label="Nombre"
            name="name"
          />
          <TextField
            defaultValue={category.slug}
            disabled={disabled}
            error={state.errors?.slug?.[0]}
            label="Slug"
            name="slug"
          />
          <TextareaField
            defaultValue={category.description || ""}
            disabled={disabled}
            error={state.errors?.description?.[0]}
            label="Descripción"
            name="description"
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar categoría"}
        </button>
      </div>
    </form>
  );
}

function TextField({
  defaultValue,
  disabled,
  error,
  label,
  name,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
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
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
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
        rows={4}
        aria-invalid={Boolean(error)}
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
