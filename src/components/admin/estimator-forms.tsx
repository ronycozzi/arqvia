"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import {
  saveEstimateRule,
  type EstimatorActionState,
  updateEstimateConfig,
} from "@/app/admin/(protected)/estimador/actions";
import { PostSaveActions } from "@/components/admin/post-save-actions";

const initialState: EstimatorActionState = { ok: false, message: "" };

type ConfigValue = {
  version: number;
  enabled: boolean;
  headline: string;
  description: string;
  disclaimer: string;
  essentialMultiplier: number;
  balancedMultiplier: number;
  premiumMultiplier: number;
};

export function EstimatorConfigForm({ config }: { config: ConfigValue }) {
  const [state, formAction, pending] = useActionState(
    updateEstimateConfig,
    initialState,
  );
  const version = state.resource?.version || config.version;

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="expectedVersion" value={version} />
      <ActionMessage state={state} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex min-h-12 items-center gap-3 border border-ink/10 bg-white px-4 text-sm font-semibold text-ink md:col-span-2">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={config.enabled}
            disabled={pending}
            className="size-4 accent-bronze"
          />
          Mostrar el estimador en el sitio público
        </label>
        <AdminField
          label="Título público"
          name="headline"
          defaultValue={config.headline}
          error={state.errors?.headline?.[0]}
          className="md:col-span-2"
        />
        <AdminTextarea
          label="Descripción"
          name="description"
          defaultValue={config.description}
          error={state.errors?.description?.[0]}
          className="md:col-span-2"
        />
        <AdminNumberField
          label="Multiplicador Esencial"
          name="essentialMultiplier"
          defaultValue={config.essentialMultiplier}
          error={state.errors?.essentialMultiplier?.[0]}
          min="0.5"
          max="3"
          step="0.05"
        />
        <AdminNumberField
          label="Multiplicador Equilibrado"
          name="balancedMultiplier"
          defaultValue={config.balancedMultiplier}
          error={state.errors?.balancedMultiplier?.[0]}
          min="0.5"
          max="3"
          step="0.05"
        />
        <AdminNumberField
          label="Multiplicador Superior"
          name="premiumMultiplier"
          defaultValue={config.premiumMultiplier}
          error={state.errors?.premiumMultiplier?.[0]}
          min="0.5"
          max="3"
          step="0.05"
          className="md:col-span-2"
        />
        <AdminTextarea
          label="Aviso sobre el alcance del cálculo"
          name="disclaimer"
          defaultValue={config.disclaimer}
          error={state.errors?.disclaimer?.[0]}
          rows={5}
          className="md:col-span-2"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      >
        <Save className="size-4" aria-hidden="true" />
        {pending ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}

export type EstimatorRuleFormValue = {
  id?: string;
  key: string;
  label: string;
  description: string;
  minUsdPerM2: number;
  maxUsdPerM2: number;
  minimumProjectUsd: number;
  active: boolean;
  sortOrder: number;
};

export function EstimatorRuleForm({
  configVersion,
  rule,
}: {
  configVersion: number;
  rule: EstimatorRuleFormValue;
}) {
  const [state, formAction, pending] = useActionState(
    saveEstimateRule,
    initialState,
  );
  const version = state.resource?.version || configVersion;
  const createdAndLocked = state.ok && !rule.id;
  const disabled = pending || createdAndLocked;

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="id" value={rule.id || ""} />
      <input type="hidden" name="expectedVersion" value={version} />
      <ActionMessage state={state} />
      {createdAndLocked && state.resource ? (
        <PostSaveActions
          createHref="/admin/estimador/new"
          editHref={`/admin/estimador/${state.resource.id}`}
          publicHref="/estimador"
          publicLabel="Ver estimador público"
          resourceLabel="rango"
          resourceName={state.resource.title}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <AdminField
          label="Nombre"
          name="label"
          defaultValue={rule.label}
          error={state.errors?.label?.[0]}
          disabled={disabled}
        />
        <AdminField
          label="Clave"
          name="key"
          defaultValue={rule.key}
          error={state.errors?.key?.[0]}
          placeholder="remodelacion-integral"
          disabled={disabled}
        />
        <AdminTextarea
          label="Qué contempla"
          name="description"
          defaultValue={rule.description}
          error={state.errors?.description?.[0]}
          className="md:col-span-2"
          disabled={disabled}
        />
        <AdminNumberField
          label="Mínimo USD por m²"
          name="minUsdPerM2"
          defaultValue={rule.minUsdPerM2}
          error={state.errors?.minUsdPerM2?.[0]}
          min="1"
          max="10000"
          step="1"
          disabled={disabled}
        />
        <AdminNumberField
          label="Máximo USD por m²"
          name="maxUsdPerM2"
          defaultValue={rule.maxUsdPerM2}
          error={state.errors?.maxUsdPerM2?.[0]}
          min="1"
          max="10000"
          step="1"
          disabled={disabled}
        />
        <AdminNumberField
          label="Inversión mínima USD"
          name="minimumProjectUsd"
          defaultValue={rule.minimumProjectUsd}
          error={state.errors?.minimumProjectUsd?.[0]}
          min="0"
          max="10000000"
          step="500"
          disabled={disabled}
        />
        <AdminNumberField
          label="Orden"
          name="sortOrder"
          defaultValue={rule.sortOrder}
          error={state.errors?.sortOrder?.[0]}
          min="0"
          max="9999"
          step="1"
          disabled={disabled}
        />
        <label className="flex min-h-12 items-center gap-3 border border-ink/10 bg-white px-4 text-sm font-semibold text-ink md:col-span-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={rule.active}
            disabled={disabled}
            className="size-4 accent-bronze"
          />
          Disponible para cálculos públicos
        </label>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      >
        <Save className="size-4" aria-hidden="true" />
        {pending ? "Guardando..." : rule.id ? "Guardar rango" : "Crear rango"}
      </button>
    </form>
  );
}

function ActionMessage({ state }: { state: EstimatorActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`border px-4 py-3 text-sm ${
        state.ok
          ? "border-olive/30 bg-olive/10 text-ink"
          : "border-red-300 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

function AdminField({
  label,
  name,
  defaultValue,
  error,
  className = "",
  disabled = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/65">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:opacity-60"
      />
      <FieldError id={`${name}-error`} error={error} />
    </label>
  );
}

function AdminNumberField({
  label,
  name,
  defaultValue,
  error,
  min,
  max,
  step,
  className = "",
  disabled = false,
}: {
  label: string;
  name: string;
  defaultValue: number;
  error?: string;
  min: string;
  max: string;
  step: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/65">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        name={name}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:opacity-60"
      />
      <FieldError id={`${name}-error`} error={error} />
    </label>
  );
}

function AdminTextarea({
  label,
  name,
  defaultValue,
  error,
  rows = 3,
  className = "",
  disabled = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  error?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/65">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="min-h-28 w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:opacity-60"
      />
      <FieldError id={`${name}-error`} error={error} />
    </label>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <span id={id} role="alert" className="mt-2 block text-xs text-red-700">
      {error}
    </span>
  ) : null;
}
