"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type ProjectActionState,
  saveProject,
} from "@/app/admin/(protected)/projects/actions";
import {
  MediaGalleryField,
  MediaImageField,
  type AdminMediaOption,
} from "@/components/admin/media-fields";
import { PostSaveActions } from "@/components/admin/post-save-actions";
import { ReferenceSelectField } from "@/components/admin/reference-select-field";
import type { AdminReferenceOption } from "@/lib/admin-reference";

type Option = {
  id: string;
  name: string;
};

export type AdminProjectFormValue = {
  id?: string;
  expectedUpdatedAt?: string;
  publicationStatus: "DRAFT" | "PUBLISHED";
  title: string;
  slug: string;
  summary: string;
  description: string;
  location: string;
  year: string;
  areaM2: number;
  status: string;
  clientType: string;
  servicePerformed: string;
  coverImage: string;
  gallery: string;
  challenge: string;
  solution: string;
  process: string;
  result: string;
  optimized: string;
  specialNote: string;
  materials: string;
  duration: string;
  constructionSystem: string;
  currentStage: string;
  responsibleTeam: string;
  architectDirector: string;
  supplier: string;
  budgetRange: string;
  featured: boolean;
  categoryId: string;
  serviceId: string;
  seoTitle: string;
  seoDescription: string;
  seoCategory: string;
  imageAlt: string;
};

const initialState: ProjectActionState = {
  ok: false,
  message: "",
};

export function ProjectForm({
  canEdit,
  categories,
  mediaAssets = [],
  project,
  services,
}: {
  canEdit: boolean;
  categories: Option[];
  mediaAssets?: AdminMediaOption[];
  project: AdminProjectFormValue;
  services: AdminReferenceOption[];
}) {
  const [state, formAction, pending] = useActionState(saveProject, initialState);
  const createdAndLocked = state.ok && !project.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={project.id || ""} />
      {project.id ? (
        <input
          name="expectedUpdatedAt"
          type="hidden"
          value={state.expectedUpdatedAt ?? project.expectedUpdatedAt ?? ""}
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
          createHref="/admin/projects/new"
          editHref={`/admin/projects/${state.resource.id}`}
          publicHref={
            state.resource.publicationStatus === "PUBLISHED"
              ? `/proyectos/${state.resource.slug}`
              : undefined
          }
          publicLabel="Ver proyecto publicado"
          resourceLabel={
            state.resource.publicationStatus === "PUBLISHED"
              ? "proyecto"
              : "borrador de proyecto"
          }
          resourceName={state.resource.title}
        />
      ) : null}

      <ProjectSection
        eyebrow="Identidad"
        title="Datos comerciales del caso"
        description="Estos campos alimentan la tarjeta, la ficha pública y los filtros del portfolio."
      >
        <TextField
          disabled={disabled}
          error={state.errors?.title?.[0]}
          label="Título"
          name="title"
          defaultValue={project.title}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.slug?.[0]}
          label="Slug"
          name="slug"
          defaultValue={project.slug}
          placeholder="casa-patio-norte"
        />
        <SelectField
          disabled={disabled}
          error={state.errors?.publicationStatus?.[0]}
          label="Visibilidad"
          name="publicationStatus"
          defaultValue={project.publicationStatus}
          options={[
            { id: "PUBLISHED", name: "Publicado" },
            { id: "DRAFT", name: "Borrador" },
          ]}
        />
        <SelectField
          disabled={disabled}
          error={state.errors?.categoryId?.[0]}
          label="Categoría"
          name="categoryId"
          defaultValue={project.categoryId}
          options={categories}
        />
        <ReferenceSelectField
          disabled={disabled}
          error={state.errors?.serviceId?.[0]}
          label="Servicio relacionado"
          name="serviceId"
          defaultValue={project.serviceId}
          options={services}
          referenceType="services"
        />
        <TextField
          disabled={disabled}
          error={state.errors?.location?.[0]}
          label="Ubicación"
          name="location"
          defaultValue={project.location}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.year?.[0]}
          label="Año"
          name="year"
          defaultValue={project.year}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.areaM2?.[0]}
          label="Superficie m²"
          name="areaM2"
          type="number"
          defaultValue={String(project.areaM2)}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.status?.[0]}
          label="Estado"
          name="status"
          defaultValue={project.status}
          placeholder="Finalizado"
        />
        <TextField
          disabled={disabled}
          error={state.errors?.clientType?.[0]}
          label="Tipo de cliente"
          name="clientType"
          defaultValue={project.clientType}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.servicePerformed?.[0]}
          label="Servicio realizado"
          name="servicePerformed"
          defaultValue={project.servicePerformed}
        />
        <CheckboxField
          disabled={disabled}
          label="Mostrar como destacado"
          name="featured"
          defaultChecked={project.featured}
        />
      </ProjectSection>

      <ProjectSection
        eyebrow="Visuales"
        title="Imagen principal y galería"
        description="Ordená el relato visual del proyecto con vistas previas, tipos y descripciones accesibles."
      >
        <MediaImageField
          assets={mediaAssets}
          disabled={disabled}
          error={state.errors?.coverImage?.[0]}
          label="Imagen principal"
          name="coverImage"
          defaultValue={project.coverImage}
          preferredCategories={["Proyecto", "Hero", "Antes y despues"]}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.imageAlt?.[0]}
          label="Alt text"
          name="imageAlt"
          defaultValue={project.imageAlt}
        />
        <MediaGalleryField
          assets={mediaAssets}
          disabled={disabled}
          error={state.errors?.gallery?.[0]}
          label="Galería"
          name="gallery"
          defaultValue={project.gallery}
          hint="La primera imagen abre la galería pública. Para un comparador, usá una imagen Antes y otra Después del mismo ambiente."
        />
      </ProjectSection>

      <ProjectSection
        eyebrow="Caso de estudio"
        title="Narrativa del proyecto"
        description="Esta estructura convierte la obra en prueba comercial: problema, proceso, solución y resultado."
      >
        <TextareaField
          disabled={disabled}
          error={state.errors?.summary?.[0]}
          label="Resumen"
          name="summary"
          defaultValue={project.summary}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.description?.[0]}
          label="Descripción larga"
          name="description"
          defaultValue={project.description}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.challenge?.[0]}
          label="Desafío"
          name="challenge"
          defaultValue={project.challenge}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.solution?.[0]}
          label="Solución"
          name="solution"
          defaultValue={project.solution}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.process?.[0]}
          label="Proceso"
          name="process"
          defaultValue={project.process}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.result?.[0]}
          label="Resultado"
          name="result"
          defaultValue={project.result}
        />
      </ProjectSection>

      <ProjectSection
        eyebrow="Técnica"
        title="Ficha técnica"
        description="Datos que transmiten seriedad técnica para obras de alto valor."
      >
        <TextField
          disabled={disabled}
          error={state.errors?.materials?.[0]}
          label="Materiales"
          name="materials"
          defaultValue={project.materials}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.duration?.[0]}
          label="Duración"
          name="duration"
          defaultValue={project.duration}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.constructionSystem?.[0]}
          label="Sistema constructivo"
          name="constructionSystem"
          defaultValue={project.constructionSystem}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.currentStage?.[0]}
          label="Etapa actual"
          name="currentStage"
          defaultValue={project.currentStage}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.responsibleTeam?.[0]}
          label="Equipo responsable"
          name="responsibleTeam"
          defaultValue={project.responsibleTeam}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.architectDirector?.[0]}
          label="Director / responsable técnico"
          name="architectDirector"
          defaultValue={project.architectDirector}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.supplier?.[0]}
          label="Proveedor destacado"
          name="supplier"
          defaultValue={project.supplier}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.budgetRange?.[0]}
          label="Rango de presupuesto"
          name="budgetRange"
          defaultValue={project.budgetRange}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.optimized?.[0]}
          label="Qué se optimizó"
          name="optimized"
          defaultValue={project.optimized}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.specialNote?.[0]}
          label="Qué lo hizo especial"
          name="specialNote"
          defaultValue={project.specialNote}
        />
      </ProjectSection>

      <ProjectSection
        eyebrow="SEO"
        title="Metadata del caso"
        description="Cada proyecto funciona como landing de confianza y como contenido posicionable."
      >
        <TextField
          disabled={disabled}
          error={state.errors?.seoTitle?.[0]}
          label="SEO title"
          name="seoTitle"
          defaultValue={project.seoTitle}
        />
        <TextField
          disabled={disabled}
          error={state.errors?.seoCategory?.[0]}
          label="Categoría SEO"
          name="seoCategory"
          defaultValue={project.seoCategory}
        />
        <TextareaField
          disabled={disabled}
          error={state.errors?.seoDescription?.[0]}
          label="SEO description"
          name="seoDescription"
          defaultValue={project.seoDescription}
        />
      </ProjectSection>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar proyecto"}
        </button>
      </div>
    </form>
  );
}

function ProjectSection({
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
  type = "text",
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
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
        type={type}
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
  hint,
  label,
  name,
}: {
  defaultValue: string;
  disabled: boolean;
  error?: string;
  hint?: string;
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
      {hint ? <span className="mt-2 block text-xs leading-5 text-ink/60">{hint}</span> : null}
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function SelectField({
  allowEmpty = false,
  defaultValue,
  disabled,
  error,
  label,
  name,
  options,
}: {
  allowEmpty?: boolean;
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
        {allowEmpty ? <option value="">Sin relación</option> : null}
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
