"use client";

import type React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  type TeamActionState,
  saveTeamMember,
} from "@/app/admin/(protected)/team/actions";
import {
  MediaImageField,
  type AdminMediaOption,
} from "@/components/admin/media-fields";
import { PostSaveActions } from "@/components/admin/post-save-actions";

export type AdminTeamMemberFormValue = {
  id?: string;
  expectedUpdatedAt?: string;
  name: string;
  role: string;
  specialty: string;
  licenseNumber?: string | null;
  bio: string;
  imageUrl: string;
  linkedinUrl?: string | null;
  sortOrder: number;
  active: boolean;
};

const initialState: TeamActionState = { ok: false, message: "" };

export function TeamMemberForm({
  canEdit,
  mediaAssets = [],
  member,
}: {
  canEdit: boolean;
  mediaAssets?: AdminMediaOption[];
  member: AdminTeamMemberFormValue;
}) {
  const [state, formAction, pending] = useActionState(saveTeamMember, initialState);
  const createdAndLocked = state.ok && !member.id;
  const disabled = !canEdit || pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-6">
      <input name="id" type="hidden" value={member.id || ""} />
      {member.id ? (
        <input
          name="expectedUpdatedAt"
          type="hidden"
          value={state.expectedUpdatedAt ?? member.expectedUpdatedAt ?? ""}
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
          createHref="/admin/team/new"
          editHref={`/admin/team/${state.resource.id}`}
          publicHref={state.resource.active ? "/nosotros" : undefined}
          publicLabel="Ver en Nosotros"
          resourceLabel="integrante"
          resourceName={state.resource.title}
        />
      ) : null}

      <section className="premium-panel p-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
            Equipo
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Perfil profesional visible
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            Los perfiles ayudan a transmitir responsabilidad técnica, cercanía y
            confianza antes de una consulta de alto valor.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField defaultValue={member.name} disabled={disabled} error={state.errors?.name?.[0]} label="Nombre" name="name" />
          <TextField defaultValue={member.role} disabled={disabled} error={state.errors?.role?.[0]} label="Rol" name="role" />
          <TextField defaultValue={member.specialty} disabled={disabled} error={state.errors?.specialty?.[0]} label="Especialidad" name="specialty" />
          <TextField defaultValue={member.licenseNumber || ""} disabled={disabled} error={state.errors?.licenseNumber?.[0]} label="Matrícula o credencial" name="licenseNumber" />
          <MediaImageField assets={mediaAssets} defaultValue={member.imageUrl} disabled={disabled} error={state.errors?.imageUrl?.[0]} label="Imagen" name="imageUrl" preferredCategories={["Equipo"]} />
          <TextField defaultValue={member.linkedinUrl || ""} disabled={disabled} error={state.errors?.linkedinUrl?.[0]} label="LinkedIn" name="linkedinUrl" />
          <NumberField defaultValue={member.sortOrder} disabled={disabled} error={state.errors?.sortOrder?.[0]} label="Orden" name="sortOrder" />
          <CheckboxField defaultChecked={member.active} disabled={disabled} label="Mostrar en el sitio" name="active" />
          <TextareaField defaultValue={member.bio} disabled={disabled} error={state.errors?.bio?.[0]} label="Bio" name="bio" />
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end border border-ink/10 bg-paper/95 p-4 shadow-premium backdrop-blur">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "Guardando..." : "Guardar integrante"}
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

function NumberField({ defaultValue, disabled, error, label, name }: { defaultValue: number; disabled: boolean; error?: string; label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">{label}</span>
      <input className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55" defaultValue={defaultValue} disabled={disabled} min={0} name={name} type="number" aria-invalid={Boolean(error)} />
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
      <textarea className="min-h-36 w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink/55" defaultValue={defaultValue} disabled={disabled} name={name} rows={6} aria-invalid={Boolean(error)} />
      {error ? <span className="mt-2 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
