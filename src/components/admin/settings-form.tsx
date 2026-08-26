"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { PublicClientConfig } from "@/lib/client-config";
import {
  type SettingsActionState,
  updateClientSettings,
} from "@/app/admin/(protected)/settings/actions";
import {
  MediaImageField,
  type AdminMediaOption,
} from "@/components/admin/media-fields";
import { PostSaveActions } from "@/components/admin/post-save-actions";
import {
  brandBodyFontOptions,
  brandHeadingFontOptions,
} from "@/lib/brand-theme";

const initialState: SettingsActionState = {
  ok: false,
  message: "",
};

export function SettingsForm({
  canEdit = true,
  config,
  expectedUpdatedAt,
  mediaAssets = [],
}: {
  canEdit?: boolean;
  config: PublicClientConfig;
  expectedUpdatedAt?: string;
  mediaAssets?: AdminMediaOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateClientSettings,
    initialState,
  );

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
          editHref="/admin/settings"
          publicHref="/"
          publicLabel="Ver sitio actualizado"
          resourceLabel="configuración"
          resourceName={state.resource.title}
        />
      ) : null}

      <SettingsSection
        eyebrow="Identidad"
        title="Marca y sistema visual"
        description="Definí nombre, colores, tipografías y recursos visuales principales."
      >
        <TextField
          name="companyName"
          label="Nombre de empresa"
          defaultValue={config.companyName}
          disabled={!canEdit || pending}
          error={state.errors?.companyName?.[0]}
        />
        <MediaImageField
          assets={mediaAssets}
          name="logoUrl"
          label="Logo URL"
          defaultValue={config.logoUrl}
          disabled={!canEdit || pending}
          error={state.errors?.logoUrl?.[0]}
          placeholder="/images/logo.svg"
          preferredCategories={["Marca"]}
        />
        <ColorField
          name="primaryColor"
          label="Color principal"
          defaultValue={config.primaryColor}
          disabled={!canEdit || pending}
          error={state.errors?.primaryColor?.[0]}
        />
        <ColorField
          name="secondaryColor"
          label="Color secundario"
          defaultValue={config.secondaryColor}
          disabled={!canEdit || pending}
          error={state.errors?.secondaryColor?.[0]}
        />
        <ColorField
          name="accentColor"
          label="Color acento"
          defaultValue={config.accentColor}
          disabled={!canEdit || pending}
          error={state.errors?.accentColor?.[0]}
        />
        <SelectField
          name="fontHeading"
          label="Fuente títulos"
          defaultValue={config.fontHeading}
          options={brandHeadingFontOptions}
          disabled={!canEdit || pending}
          error={state.errors?.fontHeading?.[0]}
        />
        <SelectField
          name="fontBody"
          label="Fuente cuerpo"
          defaultValue={config.fontBody}
          options={brandBodyFontOptions}
          disabled={!canEdit || pending}
          error={state.errors?.fontBody?.[0]}
        />
      </SettingsSection>

      <SettingsSection
        eyebrow="Contacto"
        title="Datos comerciales"
        description="Estos datos alimentan header, footer, WhatsApp y futuras integraciones de leads."
      >
        <TextField
          name="whatsapp"
          label="WhatsApp"
          defaultValue={config.whatsapp}
          disabled={!canEdit || pending}
          error={state.errors?.whatsapp?.[0]}
          placeholder="5493515551234"
        />
        <TextField
          name="phone"
          label="Teléfono"
          defaultValue={config.phone}
          disabled={!canEdit || pending}
          error={state.errors?.phone?.[0]}
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          defaultValue={config.email}
          disabled={!canEdit || pending}
          error={state.errors?.email?.[0]}
        />
        <TextField
          name="address"
          label="Dirección / zona"
          defaultValue={config.address}
          disabled={!canEdit || pending}
          error={state.errors?.address?.[0]}
        />
        <TextField
          name="businessHours"
          label="Horarios"
          defaultValue={config.businessHours}
          disabled={!canEdit || pending}
          error={state.errors?.businessHours?.[0]}
        />
        <TextField
          name="instagramUrl"
          label="Instagram"
          defaultValue={config.instagramUrl}
          disabled={!canEdit || pending}
          error={state.errors?.instagramUrl?.[0]}
        />
        <TextField
          name="linkedinUrl"
          label="LinkedIn"
          defaultValue={config.linkedinUrl}
          disabled={!canEdit || pending}
          error={state.errors?.linkedinUrl?.[0]}
        />
        <TextField
          name="facebookUrl"
          label="Facebook"
          defaultValue={config.facebookUrl}
          disabled={!canEdit || pending}
          error={state.errors?.facebookUrl?.[0]}
        />
      </SettingsSection>

      <SettingsSection
        eyebrow="Home"
        title="Hero y CTAs"
        description="Gestioná el mensaje principal, la imagen inicial y las acciones de conversión."
      >
        <TextareaField
          name="heroTitle"
          label="Título hero"
          defaultValue={config.heroTitle}
          disabled={!canEdit || pending}
          error={state.errors?.heroTitle?.[0]}
        />
        <TextareaField
          name="heroSubtitle"
          label="Bajada hero"
          defaultValue={config.heroSubtitle}
          disabled={!canEdit || pending}
          error={state.errors?.heroSubtitle?.[0]}
        />
        <MediaImageField
          assets={mediaAssets}
          name="heroImage"
          label="Imagen hero"
          defaultValue={config.heroImage}
          disabled={!canEdit || pending}
          error={state.errors?.heroImage?.[0]}
          placeholder="/images/arqvia-hero-concrete-pool-generated-3840x2160.webp"
          preferredCategories={["Hero", "Proyecto"]}
        />
        <TextField
          name="primaryCtaLabel"
          label="CTA principal"
          defaultValue={config.primaryCtaLabel}
          disabled={!canEdit || pending}
          error={state.errors?.primaryCtaLabel?.[0]}
        />
        <TextField
          name="secondaryCtaLabel"
          label="CTA secundario"
          defaultValue={config.secondaryCtaLabel}
          disabled={!canEdit || pending}
          error={state.errors?.secondaryCtaLabel?.[0]}
        />
      </SettingsSection>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={!canEdit || pending}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}

function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="premium-panel p-6">
      <div className="mb-6 max-w-2xl">
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
  name,
  label,
  defaultValue,
  error,
  placeholder,
  disabled = false,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function ColorField({
  name,
  label,
  defaultValue,
  disabled = false,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <div className="flex h-12 border border-ink/12 bg-white">
        <input
          name={name}
          type="color"
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="h-full w-14 border-r border-ink/12 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input
          name={`${name}TextMirror`}
          value={defaultValue}
          readOnly
          tabIndex={-1}
          className="hidden"
        />
        <span className="grid flex-1 place-items-center px-4 text-left text-sm text-ink/75">
          {defaultValue}
        </span>
      </div>
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function SelectField({
  defaultValue,
  disabled = false,
  error,
  label,
  name,
  options,
}: {
  defaultValue: string;
  disabled?: boolean;
  error?: string;
  label: string;
  name: string;
  options: readonly string[];
}) {
  const renderedOptions = options.includes(defaultValue)
    ? options
    : [defaultValue, ...options];

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
      >
        {renderedOptions.map((option) => (
          <option key={option} value={option}>
            {option}
            {!options.includes(option) ? " (actual)" : ""}
          </option>
        ))}
      </select>
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function TextareaField({
  name,
  label,
  defaultValue,
  disabled = false,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        rows={4}
        aria-invalid={Boolean(error)}
        className="min-h-28 w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55"
      />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
