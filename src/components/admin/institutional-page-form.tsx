"use client";

import { useActionState, type ReactNode } from "react";
import { Building2, ListChecks, Save, Search, Send } from "lucide-react";
import {
  type InstitutionalPageActionState,
  updateInstitutionalPage,
} from "@/app/admin/(protected)/pages/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";
import type { PublicInstitutionalPage } from "@/lib/institutional-content";

const initialState: InstitutionalPageActionState = {
  message: "",
  ok: false,
};

export function InstitutionalPageForm({
  canEdit,
  expectedUpdatedAt,
  page,
}: {
  canEdit: boolean;
  expectedUpdatedAt?: string;
  page: PublicInstitutionalPage;
}) {
  const [state, formAction, pending] = useActionState(
    updateInstitutionalPage,
    initialState,
  );
  const disabled = !canEdit || pending;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="slug" type="hidden" value={page.slug} />
      <input
        name="expectedUpdatedAt"
        type="hidden"
        value={state.expectedUpdatedAt ?? expectedUpdatedAt ?? ""}
      />

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

      {state.ok && state.resource ? (
        <PostSaveActions
          editHref={`/admin/pages/${state.resource.slug}`}
          publicHref={`/${state.resource.slug}`}
          publicLabel="Ver página actualizada"
          resourceLabel="página"
          resourceName={state.resource.title}
        />
      ) : null}

      <EditorSection
        icon={<Building2 className="size-5" aria-hidden="true" />}
        eyebrow="Presentación"
        title="Encabezado y propuesta"
        description="Definí qué comunica la página antes de que la persona avance hacia el detalle."
      >
        <TextField
          name="eyebrow"
          label="Categoría"
          defaultValue={page.eyebrow}
          disabled={disabled}
          error={state.errors?.eyebrow?.[0]}
        />
        <TextareaField
          name="title"
          label="Título principal"
          defaultValue={page.title}
          disabled={disabled}
          error={state.errors?.title?.[0]}
          rows={3}
        />
        <TextareaField
          name="introduction"
          label="Introducción"
          defaultValue={page.introduction}
          disabled={disabled}
          error={state.errors?.introduction?.[0]}
          fullWidth
          rows={5}
        />
      </EditorSection>

      {page.slug === "nosotros" ? (
        <>
          <EditorSection
            icon={<ListChecks className="size-5" aria-hidden="true" />}
            eyebrow="Decisiones"
            title="Forma de trabajo"
            description="Explicá cómo se analizan los proyectos y qué criterios sostienen las decisiones."
          >
            <TextField
              name="decisionEyebrow"
              label="Categoría de sección"
              defaultValue={page.payload.decision.eyebrow}
              disabled={disabled}
              error={state.errors?.decisionEyebrow?.[0]}
            />
            <TextareaField
              name="decisionTitle"
              label="Título"
              defaultValue={page.payload.decision.title}
              disabled={disabled}
              error={state.errors?.decisionTitle?.[0]}
              rows={2}
            />
            <TextareaField
              name="decisionDescription"
              label="Descripción"
              defaultValue={page.payload.decision.description}
              disabled={disabled}
              error={state.errors?.decisionDescription?.[0]}
              fullWidth
              rows={4}
            />
            {page.payload.decision.items.map((item, index) => (
              <TextareaField
                key={`decision-${index}`}
                name={`decisionItem${index + 1}`}
                label={`Criterio ${index + 1}`}
                defaultValue={item}
                disabled={disabled}
                error={state.errors?.[`decisionItem${index + 1}`]?.[0]}
                rows={3}
              />
            ))}
          </EditorSection>

          <EditorSection
            icon={<Building2 className="size-5" aria-hidden="true" />}
            eyebrow="Principios"
            title="Filosofía de trabajo"
            description="Presentá tres principios concretos con título y desarrollo."
          >
            <TextField
              name="philosophyEyebrow"
              label="Categoría de sección"
              defaultValue={page.payload.philosophy.eyebrow}
              disabled={disabled}
              error={state.errors?.philosophyEyebrow?.[0]}
            />
            <TextareaField
              name="philosophyTitle"
              label="Título"
              defaultValue={page.payload.philosophy.title}
              disabled={disabled}
              error={state.errors?.philosophyTitle?.[0]}
              rows={3}
            />
            <TextareaField
              name="philosophyDescription"
              label="Descripción"
              defaultValue={page.payload.philosophy.description}
              disabled={disabled}
              error={state.errors?.philosophyDescription?.[0]}
              fullWidth
              rows={4}
            />
            <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
              {page.payload.philosophy.items.map((item, index) => (
                <fieldset
                  key={`philosophy-${index}`}
                  className="grid gap-3 border border-ink/10 bg-mist/45 p-4"
                >
                  <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                    Principio {index + 1}
                  </legend>
                  <TextField
                    name={`philosophyItem${index + 1}Title`}
                    label="Título"
                    defaultValue={item.title}
                    disabled={disabled}
                    error={state.errors?.[`philosophyItem${index + 1}Title`]?.[0]}
                  />
                  <TextareaField
                    name={`philosophyItem${index + 1}Description`}
                    label="Descripción"
                    defaultValue={item.description}
                    disabled={disabled}
                    error={
                      state.errors?.[`philosophyItem${index + 1}Description`]?.[0]
                    }
                    rows={5}
                  />
                </fieldset>
              ))}
            </div>
          </EditorSection>

          <EditorSection
            icon={<Building2 className="size-5" aria-hidden="true" />}
            eyebrow="Personas"
            title="Presentación del equipo"
            description="Los perfiles se administran en Equipo; estos campos introducen la sección pública."
          >
            <TextField
              name="teamEyebrow"
              label="Categoría de sección"
              defaultValue={page.payload.team.eyebrow}
              disabled={disabled}
              error={state.errors?.teamEyebrow?.[0]}
            />
            <TextareaField
              name="teamTitle"
              label="Título"
              defaultValue={page.payload.team.title}
              disabled={disabled}
              error={state.errors?.teamTitle?.[0]}
              rows={2}
            />
            <TextareaField
              name="teamDescription"
              label="Descripción"
              defaultValue={page.payload.team.description}
              disabled={disabled}
              error={state.errors?.teamDescription?.[0]}
              fullWidth
              rows={3}
            />
          </EditorSection>
        </>
      ) : (
        <EditorSection
          icon={<ListChecks className="size-5" aria-hidden="true" />}
          eyebrow="Etapas"
          title="Proceso completo"
          description="Mantené siete etapas concretas para explicar el recorrido desde la consulta hasta la entrega."
        >
          <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
            {page.payload.steps.map((step, index) => (
              <fieldset
                key={`process-step-${index}`}
                className="grid gap-3 border border-ink/10 bg-mist/45 p-4"
              >
                <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                  Etapa {index + 1}
                </legend>
                <TextField
                  name={`processStep${index + 1}Title`}
                  label="Título"
                  defaultValue={step.title}
                  disabled={disabled}
                  error={state.errors?.[`processStep${index + 1}Title`]?.[0]}
                />
                <TextareaField
                  name={`processStep${index + 1}Description`}
                  label="Descripción"
                  defaultValue={step.description}
                  disabled={disabled}
                  error={state.errors?.[`processStep${index + 1}Description`]?.[0]}
                  rows={4}
                />
              </fieldset>
            ))}
          </div>
        </EditorSection>
      )}

      <EditorSection
        icon={<Send className="size-5" aria-hidden="true" />}
        eyebrow="Conversión"
        title="Cierre y contacto"
        description="Definí el último argumento comercial y el mensaje contextual de WhatsApp."
      >
        <TextareaField
          name="finalCtaTitle"
          label="Título del cierre"
          defaultValue={page.finalCtaTitle}
          disabled={disabled}
          error={state.errors?.finalCtaTitle?.[0]}
          rows={2}
        />
        <TextareaField
          name="finalCtaDescription"
          label="Descripción del cierre"
          defaultValue={page.finalCtaDescription}
          disabled={disabled}
          error={state.errors?.finalCtaDescription?.[0]}
          rows={3}
        />
        <TextField
          name="primaryCtaLabel"
          label="CTA principal"
          defaultValue={page.primaryCtaLabel}
          disabled={disabled}
          error={state.errors?.primaryCtaLabel?.[0]}
        />
        <TextField
          name="secondaryCtaLabel"
          label="CTA WhatsApp"
          defaultValue={page.secondaryCtaLabel}
          disabled={disabled}
          error={state.errors?.secondaryCtaLabel?.[0]}
        />
        <TextareaField
          name="whatsappMessage"
          label="Mensaje de WhatsApp"
          defaultValue={page.whatsappMessage}
          disabled={disabled}
          error={state.errors?.whatsappMessage?.[0]}
          fullWidth
          rows={3}
        />
      </EditorSection>

      <EditorSection
        icon={<Search className="size-5" aria-hidden="true" />}
        eyebrow="Buscadores"
        title="Metadatos SEO"
        description="Estos textos alimentan título, descripción, Open Graph y Twitter."
      >
        <TextField
          name="seoTitle"
          label="Título SEO"
          defaultValue={page.seoTitle}
          disabled={disabled}
          error={state.errors?.seoTitle?.[0]}
        />
        <TextareaField
          name="seoDescription"
          label="Descripción SEO"
          defaultValue={page.seoDescription}
          disabled={disabled}
          error={state.errors?.seoDescription?.[0]}
          rows={3}
        />
      </EditorSection>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <p className="hidden text-xs text-ink/68 sm:block">
          {canEdit
            ? "El guardado publica la nueva versión inmediatamente."
            : "Tu rol dispone de acceso de lectura."}
        </p>
        <button
          type="submit"
          disabled={disabled}
          className="ml-auto inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" />
          {pending ? "Guardando..." : "Guardar página"}
        </button>
      </div>
    </form>
  );
}

function EditorSection({
  children,
  description,
  eyebrow,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="premium-panel p-6 md:p-7">
      <div className="mb-6 flex max-w-3xl items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center border border-bronze/25 bg-bronze-light/18 text-bronze">
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            {eyebrow}
          </p>
          <h3 className="mt-2 font-serif text-3xl text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">{description}</p>
        </div>
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
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/72">
        {label}
      </span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
      />
      {error ? (
        <span className="mt-2 block text-xs text-red-700" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TextareaField({
  defaultValue,
  disabled,
  error,
  fullWidth = false,
  label,
  name,
  rows,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  fullWidth?: boolean;
  label: string;
  name: string;
  rows: number;
}) {
  const errorId = `${name}-error`;
  return (
    <label className={fullWidth ? "block md:col-span-2" : "block"}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/72">
        {label}
      </span>
      <textarea
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        rows={rows}
      />
      {error ? (
        <span className="mt-2 block text-xs text-red-700" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
