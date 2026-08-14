"use client";

import { CalendarClock, Loader2, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  useActionState,
  useEffect,
} from "react";
import {
  saveLeadCommercialProfile,
  type LeadCommercialActionState,
} from "@/app/admin/(protected)/leads/actions";

const initialState: LeadCommercialActionState = { ok: false, message: "" };

type LeadCommercialFormValue = {
  assignedUserId: string;
  lostReason: string;
  nextFollowUpAt: string;
  quotedAmountUsd: number | null;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "QUOTED" | "WON" | "LOST";
  wonAmountUsd: number | null;
};

function toCommercialDraft(value: LeadCommercialFormValue) {
  return {
    assignedUserId: value.assignedUserId,
    lostReason: value.lostReason,
    nextFollowUpAt: value.nextFollowUpAt,
    quotedAmountUsd: value.quotedAmountUsd?.toString() || "",
    wonAmountUsd: value.wonAmountUsd?.toString() || "",
  };
}

export function LeadCommercialForm({
  assignees,
  leadId,
  value,
}: {
  assignees: Array<{ id: string; label: string }>;
  leadId: string;
  value: LeadCommercialFormValue;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveLeadCommercialProfile,
    initialState,
  );
  const draft = state.values ?? toCommercialDraft(value);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok, state.revision]);

  const closed = value.status === "WON" || value.status === "LOST";

  return (
    <form
      key={state.revision ?? "initial"}
      action={formAction}
      className="mt-6 grid gap-5"
    >
      <input type="hidden" name="leadId" value={leadId} />

      {state.message ? (
        <p
          role="status"
          className={`border px-4 py-3 text-sm font-medium ${
            state.ok
              ? "border-olive/25 bg-olive/10 text-olive"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CommercialField
          error={state.errors?.assignedUserId?.[0]}
          icon={<UserRound className="size-4" aria-hidden="true" />}
          label="Responsable"
        >
          <select
            name="assignedUserId"
            defaultValue={draft.assignedUserId}
            disabled={pending}
          >
            <option value="">Sin asignar</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.label}
              </option>
            ))}
          </select>
        </CommercialField>

        <CommercialField
          error={state.errors?.nextFollowUpAt?.[0]}
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
          label="Próximo seguimiento"
        >
          <input
            type="datetime-local"
            name="nextFollowUpAt"
            defaultValue={draft.nextFollowUpAt}
            disabled={pending || closed}
          />
        </CommercialField>

        <CommercialField
          error={state.errors?.quotedAmountUsd?.[0]}
          label="Presupuesto enviado (USD)"
        >
          <input
            type="number"
            name="quotedAmountUsd"
            min="0"
            step="100"
            inputMode="numeric"
            defaultValue={draft.quotedAmountUsd}
            disabled={pending}
            placeholder="85000"
          />
        </CommercialField>

        <CommercialField
          error={state.errors?.wonAmountUsd?.[0]}
          label="Valor ganado (USD)"
        >
          <input
            type="number"
            name="wonAmountUsd"
            min="0"
            step="100"
            inputMode="numeric"
            defaultValue={draft.wonAmountUsd}
            disabled={pending}
            placeholder="80000"
          />
        </CommercialField>
      </div>

      <CommercialField
        error={state.errors?.lostReason?.[0]}
        label="Motivo de pérdida"
      >
        <textarea
          name="lostReason"
          rows={3}
          defaultValue={draft.lostReason}
          disabled={pending}
          placeholder="Presupuesto, tiempos, alcance, sin respuesta u otro motivo concreto."
        />
      </CommercialField>

      <div className="flex flex-col justify-between gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center">
        <p className="max-w-xl text-xs leading-6 text-ink/60">
          {closed
            ? "Las oportunidades cerradas no conservan un próximo seguimiento pendiente."
            : "La fecha aparece en la vista de seguimientos vencidos y mantiene clara la próxima acción."}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center gap-2 bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {pending ? "Guardando seguimiento..." : "Guardar seguimiento"}
        </button>
      </div>
    </form>
  );
}

function CommercialField({
  children,
  error,
  icon,
  label,
}: {
  children: ReactElement<{
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    className?: string;
    id?: string;
    name?: string;
  }>;
  error?: string;
  icon?: ReactNode;
  label: string;
}) {
  const id = children.props.name || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70"
      >
        {icon}
        {label}
      </label>
      {cloneElement(children, {
        "aria-describedby": error ? `${id}-error` : undefined,
        "aria-invalid": Boolean(error),
        id,
        className:
          children.type === "textarea"
            ? "min-h-24 w-full border border-ink/12 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist disabled:text-ink/55"
            : "h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist disabled:text-ink/55",
      })}
      {error ? (
        <span id={`${id}-error`} role="alert" className="mt-2 block text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}
