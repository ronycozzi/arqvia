"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type ServiceActionState,
  saveService,
} from "@/app/admin/(protected)/services/actions";
import {
  MediaImageField,
  type AdminMediaOption,
} from "@/components/admin/media-fields";
import { PostSaveActions } from "@/components/admin/post-save-actions";

type Option = {
  id: string;
  name: string;
};

export type AdminServiceFormValue = {
  id?: string;
  expectedUpdatedAt?: string;
  publicationStatus: "DRAFT" | "PUBLISHED";
  title: string;
  slug: string;
  categoryId: string;
  icon: string;
  shortDescription: string;
  description: string;
  coverImage: string;
  mainBenefit: string;
  audience: string;
  benefits: string;
  included: string;
  process: string;
  faq: string;
  whatsappMessage: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

const initialState: ServiceActionState = {
  ok: false,
  message: "",
};

const iconOptions = [
  { id: "DraftingCompass", name: "Arquitectura" },
  { id: "Building2", name: "Construcción" },
  { id: "Hammer", name: "Remodelación" },
  { id: "LampDesk", name: "Interiorismo" },
  { id: "ClipboardCheck", name: "Dirección de obra" },
  { id: "Sparkles", name: "Servicio general" },
];

export function ServiceForm({
  canEdit,
  categories,
  mediaAssets = [],
  service,
}: {
  canEdit: boolean;
  categories: Option[];
  mediaAssets?: AdminMediaOption[];
  service: AdminServiceFormValue;
}) {
  const [state, formAction, pending] = useActionState(saveService, initialState);
  const createdAndLocked = state.ok && !service.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={service.id || ""} />
      {service.id ? (
        <input
          name="expectedUpdatedAt"
          type="hidden"
          value={state.expectedUpdatedAt ?? service.expectedUpdatedAt ?? ""}
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
          createHref="/admin/services/new"
          editHref={`/admin/services/${state.resource.id}`}
          publicHref={
            state.resource.publicationStatus === "PUBLISHED"
              ? `/servicios/${state.resource.slug}`
              : undefined
          }
          publicLabel="Ver servicio publicado"
          resourceLabel={
            state.resource.publicationStatus === "PUBLISHED"
              ? "servicio"
              : "borrador de servicio"
          }
          resourceName={state.resource.title}
        />
      ) : null}

      <ServiceSection
        eyebrow="Servicio"
        title="Datos de venta y categoría"
        description="Estos campos alimentan cards, navegación comercial, página SEO y CTAs."
      >
        <TextField
          defaultValue={service.title}
          disabled={disabled}
          error={state.errors?.title?.[0]}
          label="Título"
          name="title"
        />
        <TextField
          defaultValue={service.slug}
          disabled={disabled}
          error={state.errors?.slug?.[0]}
          label="Slug"
          name="slug"
          placeholder="remodelacion-de-cocinas"
        />
        <SelectField
          defaultValue={service.publicationStatus}
          disabled={disabled}
          error={state.errors?.publicationStatus?.[0]}
          label="Visibilidad"
          name="publicationStatus"
          options={[
            { id: "PUBLISHED", name: "Publicado" },
            { id: "DRAFT", name: "Borrador" },
          ]}
        />
        <SelectField
          defaultValue={service.categoryId}
          disabled={disabled}
          error={state.errors?.categoryId?.[0]}
          label="Categoría"
          name="categoryId"
          options={categories}
        />
        <SelectField
          defaultValue={service.icon}
          disabled={disabled}
          error={state.errors?.icon?.[0]}
          label="Icono"
          name="icon"
          options={iconOptions}
        />
        <MediaImageField
          assets={mediaAssets}
          defaultValue={service.coverImage}
          disabled={disabled}
          error={state.errors?.coverImage?.[0]}
          label="Imagen principal"
          name="coverImage"
          preferredCategories={["Servicio", "Proyecto", "Hero"]}
        />
        <CheckboxField
          defaultChecked={service.featured}
          disabled={disabled}
          label="Mostrar como destacado"
          name="featured"
        />
        <TextareaField
          defaultValue={service.shortDescription}
          disabled={disabled}
          error={state.errors?.shortDescription?.[0]}
          label="Descripción corta"
          name="shortDescription"
        />
        <TextareaField
          defaultValue={service.description}
          disabled={disabled}
          error={state.errors?.description?.[0]}
          label="Descripción larga"
          name="description"
        />
      </ServiceSection>

      <ServiceSection
        eyebrow="Conversión"
        title="Beneficio, audiencia y WhatsApp"
        description="Texto orientado a que el visitante entienda si el servicio es para su proyecto."
      >
        <TextareaField
          defaultValue={service.mainBenefit}
          disabled={disabled}
          error={state.errors?.mainBenefit?.[0]}
          label="Beneficio principal"
          name="mainBenefit"
        />
        <TextareaField
          defaultValue={service.audience}
          disabled={disabled}
          error={state.errors?.audience?.[0]}
          label="Para quién es"
          name="audience"
        />
        <TextareaField
          defaultValue={service.benefits}
          disabled={disabled}
          error={state.errors?.benefits?.[0]}
          label="Beneficios comerciales"
          name="benefits"
        />
        <TextareaField
          defaultValue={service.whatsappMessage}
          disabled={disabled}
          error={state.errors?.whatsappMessage?.[0]}
          label="Mensaje WhatsApp"
          name="whatsappMessage"
        />
      </ServiceSection>

      <ServiceSection
        eyebrow="Contenido"
        title="Incluye, proceso y FAQ"
        description="Usá una línea por ítem. En FAQ escribí: Pregunta | Respuesta."
      >
        <TextareaField
          defaultValue={service.included}
          disabled={disabled}
          error={state.errors?.included?.[0]}
          label="Qué incluye"
          name="included"
        />
        <TextareaField
          defaultValue={service.process}
          disabled={disabled}
          error={state.errors?.process?.[0]}
          label="Proceso"
          name="process"
        />
        <TextareaField
          defaultValue={service.faq}
          disabled={disabled}
          error={state.errors?.faq?.[0]}
          label="FAQ"
          name="faq"
        />
      </ServiceSection>

      <ServiceSection
        eyebrow="SEO"
        title="Metadata del servicio"
        description="Cada servicio funciona como landing local y página de autoridad."
      >
        <TextField
          defaultValue={service.seoTitle}
          disabled={disabled}
          error={state.errors?.seoTitle?.[0]}
          label="SEO title"
          name="seoTitle"
        />
        <TextareaField
          defaultValue={service.seoDescription}
          disabled={disabled}
          error={state.errors?.seoDescription?.[0]}
          label="SEO description"
          name="seoDescription"
        />
      </ServiceSection>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar servicio"}
        </button>
      </div>
    </form>
  );
}

function ServiceSection({
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
        rows={5}
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
  options: Option[];
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
