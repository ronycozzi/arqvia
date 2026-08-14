"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type TestimonialActionState,
  saveTestimonial,
} from "@/app/admin/(protected)/testimonials/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";
import { ReferenceSelectField } from "@/components/admin/reference-select-field";
import type { AdminReferenceOption } from "@/lib/admin-reference";

export type AdminTestimonialFormValue = {
  id?: string;
  expectedUpdatedAt?: string;
  name: string;
  role?: string | null;
  projectType: string;
  location: string;
  quote: string;
  imageUrl?: string | null;
  projectId?: string | null;
  featured: boolean;
};

const initialState: TestimonialActionState = {
  ok: false,
  message: "",
};

export function TestimonialForm({
  canEdit,
  projects,
  testimonial,
}: {
  canEdit: boolean;
  projects: AdminReferenceOption[];
  testimonial: AdminTestimonialFormValue;
}) {
  const [state, formAction, pending] = useActionState(saveTestimonial, initialState);
  const createdAndLocked = state.ok && !testimonial.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={testimonial.id || ""} />
      {testimonial.id ? (
        <input
          name="expectedUpdatedAt"
          type="hidden"
          value={
            state.expectedUpdatedAt ?? testimonial.expectedUpdatedAt ?? ""
          }
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
          createHref="/admin/testimonials/new"
          editHref={`/admin/testimonials/${state.resource.id}`}
          publicHref={state.resource.featured ? "/" : undefined}
          publicLabel="Ver en la home"
          resourceLabel="testimonio"
          resourceName={state.resource.title}
        />
      ) : null}

      <section className="premium-panel p-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Testimonio
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Prueba social clara y verificable
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            Evitá frases genéricas. Describí qué se resolvió, cómo fue el
            proceso y qué cambió para el cliente.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={testimonial.name}
            disabled={disabled}
            error={state.errors?.name?.[0]}
            label="Nombre"
            name="name"
          />
          <TextField
            defaultValue={testimonial.location}
            disabled={disabled}
            error={state.errors?.location?.[0]}
            label="Ubicación"
            name="location"
          />
          <TextField
            defaultValue={testimonial.projectType}
            disabled={disabled}
            error={state.errors?.projectType?.[0]}
            label="Tipo de proyecto"
            name="projectType"
          />
          <TextField
            defaultValue={testimonial.role || ""}
            disabled={disabled}
            error={state.errors?.role?.[0]}
            label="Servicio o resultado breve"
            name="role"
          />
          <ReferenceSelectField
            defaultValue={testimonial.projectId || ""}
            disabled={disabled}
            error={state.errors?.projectId?.[0]}
            label="Proyecto relacionado"
            name="projectId"
            options={projects}
            referenceType="projects"
          />
          <TextField
            defaultValue={testimonial.imageUrl || ""}
            disabled={disabled}
            error={state.errors?.imageUrl?.[0]}
            label="Imagen del cliente"
            name="imageUrl"
          />
          <CheckboxField
            defaultChecked={testimonial.featured}
            disabled={disabled}
            label="Mostrar en la home"
            name="featured"
          />
          <TextareaField
            defaultValue={testimonial.quote}
            disabled={disabled}
            error={state.errors?.quote?.[0]}
            label="Testimonio"
            name="quote"
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
          {pending ? "Guardando..." : "Guardar testimonio"}
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

function CheckboxField({
  defaultChecked,
  disabled,
  label,
  name,
}: {
  defaultChecked: boolean;
  disabled: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 border border-ink/12 bg-white px-4 text-sm font-semibold text-ink">
      <input
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        type="checkbox"
        value="true"
        className="size-4 accent-bronze"
      />
      {label}
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
        className="min-h-40 w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        rows={7}
        aria-invalid={Boolean(error)}
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
