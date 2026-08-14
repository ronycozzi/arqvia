"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type FaqActionState,
  saveFaq,
} from "@/app/admin/(protected)/faq/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";
import { ReferenceSelectField } from "@/components/admin/reference-select-field";
import type { AdminReferenceOption } from "@/lib/admin-reference";

export type AdminFaqFormValue = {
  id?: string;
  expectedUpdatedAt?: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  active: boolean;
  relatedServiceId?: string | null;
};

const initialState: FaqActionState = {
  ok: false,
  message: "",
};

export function FaqForm({
  canEdit,
  faq,
  services,
}: {
  canEdit: boolean;
  faq: AdminFaqFormValue;
  services: AdminReferenceOption[];
}) {
  const [state, formAction, pending] = useActionState(saveFaq, initialState);
  const createdAndLocked = state.ok && !faq.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={faq.id || ""} />
      {faq.id ? (
        <input
          name="expectedUpdatedAt"
          type="hidden"
          value={state.expectedUpdatedAt ?? faq.expectedUpdatedAt ?? ""}
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
          createHref="/admin/faq/new"
          editHref={`/admin/faq/${state.resource.id}`}
          publicHref={state.resource.active ? "/faq" : undefined}
          publicLabel="Ver FAQ publicada"
          resourceLabel="pregunta"
          resourceName={state.resource.title}
        />
      ) : null}

      <section className="premium-panel p-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            FAQ
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Pregunta, respuesta y publicación
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            Usá respuestas específicas para reducir dudas antes de pedir
            presupuesto o coordinar una visita técnica.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={faq.question}
            disabled={disabled}
            error={state.errors?.question?.[0]}
            label="Pregunta"
            name="question"
          />
          <TextField
            defaultValue={faq.category}
            disabled={disabled}
            error={state.errors?.category?.[0]}
            label="Categoría"
            name="category"
            placeholder="Presupuesto, Obra, Visita técnica"
          />
          <NumberField
            defaultValue={faq.sortOrder}
            disabled={disabled}
            error={state.errors?.sortOrder?.[0]}
            label="Orden"
            name="sortOrder"
          />
          <ReferenceSelectField
            defaultValue={faq.relatedServiceId || ""}
            disabled={disabled}
            error={state.errors?.relatedServiceId?.[0]}
            label="Servicio relacionado"
            name="relatedServiceId"
            options={services}
            referenceType="services"
          />
          <CheckboxField
            defaultChecked={faq.active}
            disabled={disabled}
            label="Publicar en el sitio"
            name="active"
          />
          <TextareaField
            defaultValue={faq.answer}
            disabled={disabled}
            error={state.errors?.answer?.[0]}
            label="Respuesta"
            name="answer"
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
          {pending ? "Guardando..." : "Guardar pregunta"}
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
    <label className="block md:col-span-2">
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

function NumberField({
  defaultValue,
  disabled,
  error,
  label,
  name,
}: {
  defaultValue: number;
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
        min={0}
        name={name}
        type="number"
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
