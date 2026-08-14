"use client";

import { useActionState } from "react";
import { ExternalLink, Save, ShieldCheck } from "lucide-react";
import {
  saveLegalPage,
  type LegalPageActionState,
} from "@/app/admin/(protected)/legal/actions";
import type { LegalPageSlug } from "@/lib/legal-content";

export type AdminLegalPageFormValue = {
  content: string;
  expectedUpdatedAt?: string;
  reviewedAt?: string;
  reviewedBy: string;
  seoDescription: string;
  seoTitle: string;
  slug: LegalPageSlug;
  status: "DRAFT" | "PUBLISHED";
  summary: string;
  title: string;
};

const initialState: LegalPageActionState = { message: "", ok: false };

export function LegalPageForm({ page }: { page: AdminLegalPageFormValue }) {
  const [state, formAction, pending] = useActionState(
    saveLegalPage,
    initialState,
  );
  const expectedUpdatedAt =
    state.expectedUpdatedAt ?? page.expectedUpdatedAt ?? "";

  return (
    <form action={formAction} className="grid gap-6">
      <input name="slug" type="hidden" value={page.slug} />
      <input
        name="expectedUpdatedAt"
        type="hidden"
        value={expectedUpdatedAt}
      />

      {state.message ? (
        <div
          className={`border px-4 py-3 text-sm font-semibold ${
            state.ok
              ? "border-olive/30 bg-mist text-ink"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <section className="premium-panel p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              Documento legal
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Contenido y estado de publicación
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/72">
              Separá los párrafos con una línea en blanco. Un borrador conserva
              la versión pública vigente hasta que se publique nuevamente.
            </p>
          </div>
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            href={`/${page.slug}`}
            rel="noreferrer"
            target="_blank"
          >
            Ver página pública
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <Field
            defaultValue={page.title}
            disabled={pending}
            error={state.errors?.title?.[0]}
            label="Título visible"
            name="title"
            wide
          />
          <TextArea
            defaultValue={page.summary}
            disabled={pending}
            error={state.errors?.summary?.[0]}
            label="Bajada"
            name="summary"
            rows={3}
            wide
          />
          <TextArea
            defaultValue={page.content}
            disabled={pending}
            error={state.errors?.content?.[0]}
            label="Documento"
            name="content"
            rows={20}
            wide
          />
        </div>
      </section>

      <section className="premium-panel p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-bronze" aria-hidden="true" />
          <div>
            <h2 className="font-serif text-3xl text-ink">Revisión y SEO</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/72">
              Publicar exige identificar a la persona responsable de la
              revisión. La aprobación jurídica para producción se controla por
              separado durante el lanzamiento.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/72">
              Estado
            </span>
            <select
              className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist"
              defaultValue={page.status}
              disabled={pending}
              name="status"
            >
              <option value="DRAFT">Borrador</option>
              <option value="PUBLISHED">Publicado</option>
            </select>
            <ErrorText message={state.errors?.status?.[0]} />
          </label>
          <Field
            defaultValue={page.reviewedBy}
            disabled={pending}
            error={state.errors?.reviewedBy?.[0]}
            label="Revisado por"
            name="reviewedBy"
            placeholder="Nombre y función"
          />
          <Field
            defaultValue={page.seoTitle}
            disabled={pending}
            error={state.errors?.seoTitle?.[0]}
            label="Título SEO"
            name="seoTitle"
            wide
          />
          <TextArea
            defaultValue={page.seoDescription}
            disabled={pending}
            error={state.errors?.seoDescription?.[0]}
            label="Descripción SEO"
            name="seoDescription"
            rows={3}
            wide
          />
          {page.reviewedAt ? (
            <p className="text-xs text-ink/68 md:col-span-2">
              Última revisión registrada: {page.reviewedAt}
            </p>
          ) : null}
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          <Save className="size-4" aria-hidden="true" />
          {pending ? "Guardando..." : "Guardar documento"}
        </button>
      </div>
    </form>
  );
}

function Field({
  defaultValue,
  disabled,
  error,
  label,
  name,
  placeholder,
  wide = false,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/72">
        {label}
      </span>
      <input
        aria-invalid={Boolean(error)}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        placeholder={placeholder}
      />
      <ErrorText message={error} />
    </label>
  );
}

function TextArea({
  defaultValue,
  disabled,
  error,
  label,
  name,
  rows,
  wide = false,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  rows: number;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/72">
        {label}
      </span>
      <textarea
        aria-invalid={Boolean(error)}
        className="w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-7 text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        rows={rows}
      />
      <ErrorText message={error} />
    </label>
  );
}

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <span className="mt-2 block text-xs font-semibold text-red-700">{message}</span>
  ) : null;
}
