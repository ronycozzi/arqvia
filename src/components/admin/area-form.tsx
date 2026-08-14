"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { type AreaActionState, saveArea } from "@/app/admin/(protected)/areas/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";

export type AdminAreaFormValue = {
  id?: string;
  expectedUpdatedAt?: string;
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  active: boolean;
};

const initialState: AreaActionState = { ok: false, message: "" };

export function AreaForm({
  area,
  canEdit,
}: {
  area: AdminAreaFormValue;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveArea, initialState);
  const createdAndLocked = state.ok && !area.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={area.id || ""} />
      {area.id ? (
        <input
          name="expectedUpdatedAt"
          type="hidden"
          value={state.expectedUpdatedAt ?? area.expectedUpdatedAt ?? ""}
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
          createHref="/admin/areas/new"
          editHref={`/admin/areas/${state.resource.id}`}
          publicHref={state.resource.active ? `/zonas/${state.resource.slug}` : undefined}
          publicLabel="Ver página local"
          resourceLabel="área"
          resourceName={state.resource.title}
        />
      ) : null}

      <section className="premium-panel p-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Área de trabajo
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            SEO local y cobertura comercial
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            Cada área publicada genera una página local, enlaces internos,
            aparición en footer y presencia en sitemap.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField defaultValue={area.name} disabled={disabled} error={state.errors?.name?.[0]} label="Nombre" name="name" />
          <TextField defaultValue={area.slug} disabled={disabled} error={state.errors?.slug?.[0]} label="Slug" name="slug" />
          <CheckboxField defaultChecked={area.active} disabled={disabled} label="Publicar área" name="active" />
          <TextareaField defaultValue={area.description} disabled={disabled} error={state.errors?.description?.[0]} label="Descripción" name="description" />
          <TextField defaultValue={area.seoTitle} disabled={disabled} error={state.errors?.seoTitle?.[0]} label="SEO title" name="seoTitle" />
          <TextareaField defaultValue={area.seoDescription} disabled={disabled} error={state.errors?.seoDescription?.[0]} label="SEO description" name="seoDescription" />
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar área"}
        </button>
      </div>
    </form>
  );
}

function TextField({ defaultValue, disabled, error, label, name }: { defaultValue: string; disabled: boolean; error?: string; label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">{label}</span>
      <input className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55" defaultValue={defaultValue} disabled={disabled} name={name} aria-invalid={Boolean(error)} />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function CheckboxField({ defaultChecked, disabled, label, name }: { defaultChecked: boolean; disabled: boolean; label: string; name: string }) {
  return (
    <label className="flex min-h-12 items-center gap-3 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink">
      <input defaultChecked={defaultChecked} disabled={disabled} name={name} type="checkbox" value="true" className="size-4 accent-bronze" />
      {label}
    </label>
  );
}

function TextareaField({ defaultValue, disabled, error, label, name }: { defaultValue: string; disabled: boolean; error?: string; label: string; name: string }) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">{label}</span>
      <textarea className="min-h-32 w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55" defaultValue={defaultValue} disabled={disabled} name={name} rows={5} aria-invalid={Boolean(error)} />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
