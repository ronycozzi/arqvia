"use client";

import { useActionState, type ReactNode } from "react";
import { BarChart3, CheckCircle2, ListChecks, Save, Search } from "lucide-react";
import {
  type HomeContentActionState,
  updateHomeContent,
} from "@/app/admin/(protected)/home/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";
import type { PublicHomeContent } from "@/lib/home-content";

const initialState: HomeContentActionState = {
  message: "",
  ok: false,
};

export function HomeContentForm({
  canEdit,
  content,
  expectedUpdatedAt,
}: {
  canEdit: boolean;
  content: PublicHomeContent;
  expectedUpdatedAt?: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateHomeContent,
    initialState,
  );
  const disabled = !canEdit || pending;

  return (
    <form action={formAction} className="grid gap-6">
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
          editHref="/admin/home"
          publicHref="/"
          publicLabel="Ver home actualizada"
          resourceLabel="home"
          resourceName="Arqvia"
        />
      ) : null}

      <EditorSection
        icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
        eyebrow="Primera pantalla"
        title="Contexto y señales de confianza"
        description="La marca, el titular, la bajada y los botones se administran en Configuración. Acá definís el contexto visual y las tres garantías breves del hero."
      >
        <TextField
          name="heroEyebrow"
          label="Categoría sobre el titular"
          defaultValue={content.heroEyebrow}
          disabled={disabled}
          error={state.errors?.heroEyebrow?.[0]}
        />
        <TextareaField
          name="heroImageAlt"
          label="Descripción accesible de la imagen"
          defaultValue={content.heroImageAlt}
          disabled={disabled}
          error={state.errors?.heroImageAlt?.[0]}
          fullWidth
          rows={3}
        />
        {content.heroTrustItems.map((item, index) => (
          <TextField
            key={`trust-${index}`}
            name={`heroTrustItem${index + 1}`}
            label={`Garantía breve ${index + 1}`}
            defaultValue={item}
            disabled={disabled}
            error={state.errors?.[`heroTrustItem${index + 1}`]?.[0]}
          />
        ))}
      </EditorSection>

      <EditorSection
        icon={<BarChart3 className="size-5" aria-hidden="true" />}
        eyebrow="Prueba cuantitativa"
        title="Indicadores de experiencia"
        description="Usá solo cifras respaldadas por registros internos. El signo, separador y unidad pueden escribirse dentro del valor."
      >
        {content.trustMetrics.map((metric, index) => (
          <fieldset
            key={`metric-${index}`}
            className="grid gap-3 border border-ink/10 bg-mist/45 p-4 sm:grid-cols-[140px_1fr] md:col-span-2"
          >
            <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
              Indicador {index + 1}
            </legend>
            <TextField
              name={`metric${index + 1}Value`}
              label="Valor"
              defaultValue={metric.value}
              disabled={disabled}
              error={state.errors?.[`metric${index + 1}Value`]?.[0]}
            />
            <TextField
              name={`metric${index + 1}Label`}
              label="Descripción"
              defaultValue={metric.label}
              disabled={disabled}
              error={state.errors?.[`metric${index + 1}Label`]?.[0]}
            />
          </fieldset>
        ))}
      </EditorSection>

      <EditorSection
        icon={<ListChecks className="size-5" aria-hidden="true" />}
        eyebrow="Recorrido principal"
        title="Servicios y transformación"
        description="Estos textos ordenan la lectura de la home sin agregar bloques innecesarios."
      >
        <TextareaField
          name="servicesTitle"
          label="Título de servicios"
          defaultValue={content.servicesTitle}
          disabled={disabled}
          error={state.errors?.servicesTitle?.[0]}
          rows={2}
        />
        <TextareaField
          name="servicesDescription"
          label="Bajada de servicios"
          defaultValue={content.servicesDescription}
          disabled={disabled}
          error={state.errors?.servicesDescription?.[0]}
          fullWidth
          rows={3}
        />
        <TextareaField
          name="beforeAfterTitle"
          label="Título de antes y después"
          defaultValue={content.beforeAfterTitle}
          disabled={disabled}
          error={state.errors?.beforeAfterTitle?.[0]}
          rows={2}
        />
        <TextareaField
          name="beforeAfterDescription"
          label="Bajada de antes y después"
          defaultValue={content.beforeAfterDescription}
          disabled={disabled}
          error={state.errors?.beforeAfterDescription?.[0]}
          rows={3}
        />
      </EditorSection>

      <EditorSection
        icon={<ListChecks className="size-5" aria-hidden="true" />}
        eyebrow="Método de trabajo"
        title="Proceso y diferenciales"
        description="La home presenta cuatro pasos y tres razones concretas para elegir a Arqvia."
      >
        <TextareaField
          name="processTitle"
          label="Título del proceso"
          defaultValue={content.processTitle}
          disabled={disabled}
          error={state.errors?.processTitle?.[0]}
          fullWidth
          rows={2}
        />
        {content.processReasons.map((reason, index) => (
          <TextField
            key={`reason-${index}`}
            name={`processReason${index + 1}`}
            label={`Diferencial ${index + 1}`}
            defaultValue={reason}
            disabled={disabled}
            error={state.errors?.[`processReason${index + 1}`]?.[0]}
          />
        ))}
        <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
          {content.processSteps.map((step, index) => (
            <fieldset
              key={`step-${index}`}
              className="grid gap-3 border border-ink/10 bg-mist/45 p-4"
            >
              <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                Paso {index + 1}
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
                rows={3}
              />
            </fieldset>
          ))}
        </div>
      </EditorSection>

      <EditorSection
        icon={<Search className="size-5" aria-hidden="true" />}
        eyebrow="Cierre y buscadores"
        title="Conversión final y SEO"
        description="El cierre invita a iniciar una consulta y los metadatos describen la propuesta principal en buscadores y redes."
      >
        <TextareaField
          name="finalCtaTitle"
          label="Título del cierre"
          defaultValue={content.finalCtaTitle}
          disabled={disabled}
          error={state.errors?.finalCtaTitle?.[0]}
          rows={2}
        />
        <TextareaField
          name="finalCtaDescription"
          label="Bajada del cierre"
          defaultValue={content.finalCtaDescription}
          disabled={disabled}
          error={state.errors?.finalCtaDescription?.[0]}
          rows={3}
        />
        <TextField
          name="seoTitle"
          label="Título SEO"
          defaultValue={content.seoTitle}
          disabled={disabled}
          error={state.errors?.seoTitle?.[0]}
        />
        <TextareaField
          name="seoDescription"
          label="Descripción SEO"
          defaultValue={content.seoDescription}
          disabled={disabled}
          error={state.errors?.seoDescription?.[0]}
          rows={3}
        />
      </EditorSection>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <p className="hidden text-xs text-ink/68 sm:block">
          {canEdit
            ? "Guardar publica el nuevo contenido inmediatamente."
            : "Tu rol puede revisar el contenido sin modificarlo."}
        </p>
        <button
          type="submit"
          disabled={disabled}
          className="ml-auto inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" />
          {pending ? "Guardando..." : "Guardar contenido"}
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
