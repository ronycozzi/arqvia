"use client";

import { CalendarDays, ExternalLink, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cloneElement,
  type ReactElement,
  useActionState,
  useEffect,
} from "react";
import {
  saveTechnicalVisit,
  type TechnicalVisitActionState,
} from "@/app/admin/(protected)/visitas/actions";
import {
  technicalVisitStatusLabels,
  technicalVisitStatusValues,
  visitWindowLabels,
  type TechnicalVisitStatusValue,
  type VisitWindowValue,
} from "@/lib/technical-visit-config";

type VisitFormValue = {
  address: string;
  assignedUserId: string;
  durationMinutes: number;
  id?: string;
  internalNotes: string;
  scheduledDate: string;
  scheduledTime: string;
  status: TechnicalVisitStatusValue;
};

type VisitPreference = {
  notes: string;
  requestedDateLabel: string;
  window: VisitWindowValue;
};

const initialState: TechnicalVisitActionState = { ok: false, message: "" };

export function TechnicalVisitForm({
  assignees,
  leadId,
  preference,
  visit,
}: {
  assignees: Array<{ id: string; label: string }>;
  leadId: string;
  preference: VisitPreference;
  visit: VisitFormValue;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveTechnicalVisit,
    initialState,
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok, state.revision]);

  const calendarVisitId = state.visitId || visit.id;
  const hasScheduledVisit =
    state.scheduled ??
    Boolean(
      visit.scheduledDate &&
        ["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(visit.status),
    );

  return (
    <form action={formAction} className="mt-6 grid gap-5">
      <input type="hidden" name="leadId" value={leadId} />

      <div className="grid gap-3 sm:grid-cols-3">
        <PreferenceItem label="Fecha preferida" value={preference.requestedDateLabel} />
        <PreferenceItem label="Franja" value={visitWindowLabels[preference.window]} />
        <PreferenceItem
          label="Contexto"
          value={preference.notes || "Sin indicaciones adicionales"}
        />
      </div>

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <VisitField label="Estado" error={state.errors?.status?.[0]}>
          <select name="status" defaultValue={visit.status} disabled={pending}>
            {technicalVisitStatusValues.map((status) => (
              <option key={status} value={status}>
                {technicalVisitStatusLabels[status]}
              </option>
            ))}
          </select>
        </VisitField>

        <VisitField label="Fecha confirmada" error={state.errors?.scheduledDate?.[0]}>
          <input
            type="date"
            name="scheduledDate"
            defaultValue={visit.scheduledDate}
            disabled={pending}
          />
        </VisitField>

        <VisitField label="Horario" error={state.errors?.scheduledTime?.[0]}>
          <input
            type="time"
            name="scheduledTime"
            defaultValue={visit.scheduledTime}
            disabled={pending}
          />
        </VisitField>

        <VisitField label="Duración">
          <select
            name="durationMinutes"
            defaultValue={String(visit.durationMinutes)}
            disabled={pending}
          >
            {[30, 45, 60, 90, 120, 180].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes < 60
                  ? `${minutes} minutos`
                  : `${minutes / 60} ${minutes === 60 ? "hora" : "horas"}`}
              </option>
            ))}
          </select>
        </VisitField>

        <VisitField label="Responsable" error={state.errors?.assignedUserId?.[0]}>
          <select
            name="assignedUserId"
            defaultValue={visit.assignedUserId}
            disabled={pending}
          >
            <option value="">Sin asignar</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.label}
              </option>
            ))}
          </select>
        </VisitField>

        <VisitField label="Dirección" error={state.errors?.address?.[0]}>
          <input
            name="address"
            defaultValue={visit.address}
            disabled={pending}
            autoComplete="street-address"
          />
        </VisitField>
      </div>

      <VisitField label="Notas internas" error={state.errors?.internalNotes?.[0]}>
        <textarea
          name="internalNotes"
          defaultValue={visit.internalNotes}
          disabled={pending}
          rows={4}
          placeholder="Accesos, documentación a revisar, quién asiste y próximos pasos."
        />
      </VisitField>

      <div className="flex flex-col justify-between gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {calendarVisitId && hasScheduledVisit ? (
            <a
              href={`/api/admin/visitas/${calendarVisitId}/calendar`}
              className="inline-flex h-11 items-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              Descargar calendario
            </a>
          ) : null}
          <Link
            href="/admin/visitas"
            className="inline-flex h-11 items-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
          >
            Ver agenda
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        </div>
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
          {pending ? "Guardando coordinación..." : "Guardar coordinación"}
        </button>
      </div>
    </form>
  );
}

function PreferenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/10 bg-mist p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink/78">{value}</p>
    </div>
  );
}

function VisitField({
  children,
  error,
  label,
}: {
  children: ReactElement<{
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    className?: string;
    name?: string;
  }>;
  error?: string;
  label: string;
}) {
  const id = children.props.name || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">
        {label}
      </span>
      {cloneElement(children, {
        "aria-describedby": error ? `${id}-error` : undefined,
        "aria-invalid": Boolean(error),
        className:
          children.type === "textarea"
            ? "min-h-28 w-full border border-ink/12 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist"
            : "h-12 w-full border border-ink/12 bg-white px-4 text-sm text-ink outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist",
      })}
      {error ? (
        <span id={`${id}-error`} role="alert" className="mt-2 block text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}
