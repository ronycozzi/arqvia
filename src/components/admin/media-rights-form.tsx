"use client";

import { useActionState } from "react";
import { ExternalLink, Save, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  type MediaRightsActionState,
  saveMediaRights,
} from "@/app/admin/(protected)/media/actions";

export type AdminMediaRightsValue = {
  approved: boolean;
  id: string;
  rightsApprovedAt: string | null;
  rightsApprovedBy: string | null;
  rightsNote: string | null;
  sourceUrl: string | null;
};

const initialState: MediaRightsActionState = {
  message: "",
  ok: false,
};

export function MediaRightsForm({
  canManage,
  value,
}: {
  canManage: boolean;
  value: AdminMediaRightsValue;
}) {
  const [state, formAction, pending] = useActionState(
    saveMediaRights,
    initialState,
  );
  const StatusIcon = value.approved ? ShieldCheck : ShieldAlert;

  return (
    <div className="grid gap-3 border-t border-ink/10 pt-3">
      <div
        className={`flex items-start gap-2 border px-3 py-2 text-xs leading-5 ${
          value.approved
            ? "border-olive/30 bg-olive/10 text-ink"
            : "border-red-300 bg-red-50 text-red-700"
        }`}
      >
        <StatusIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">
            {value.approved
              ? "Aprobada para uso público"
              : "Pendiente para uso público"}
          </p>
          {value.approved ? (
            <p>
              {value.rightsApprovedBy} · {formatApprovalDate(value.rightsApprovedAt)}
            </p>
          ) : (
            <p>Completá la evidencia antes de incluirla en contenido publicado.</p>
          )}
        </div>
      </div>

      {value.sourceUrl ? (
        <a
          className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-bronze hover:text-ink"
          href={value.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="truncate">Ver origen</span>
        </a>
      ) : null}
      {value.rightsNote ? (
        <p className="line-clamp-3 text-xs leading-5 text-ink/68">
          {value.rightsNote}
        </p>
      ) : null}

      {canManage ? (
        <details className="border-t border-ink/10 pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-ink hover:text-bronze">
            Editar procedencia y derechos
          </summary>
          <form action={formAction} className="mt-3 grid gap-3">
            <input name="id" type="hidden" value={value.id} />
            <label className="grid gap-1.5 text-xs font-semibold text-ink/75">
              URL de origen
              <input
                aria-invalid={Boolean(state.errors?.sourceUrl?.[0])}
                className="h-10 min-w-0 border border-ink/12 bg-white px-3 text-xs font-normal text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist"
                defaultValue={value.sourceUrl || ""}
                disabled={pending}
                name="sourceUrl"
                placeholder="https://..."
                type="url"
              />
              {state.errors?.sourceUrl?.[0] ? (
                <span className="font-normal text-red-700">
                  {state.errors.sourceUrl[0]}
                </span>
              ) : null}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-ink/75">
              Nota de licencia o derechos
              <textarea
                aria-invalid={Boolean(state.errors?.rightsNote?.[0])}
                className="min-h-24 min-w-0 resize-y border border-ink/12 bg-white px-3 py-2 text-xs font-normal leading-5 text-ink outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:bg-mist"
                defaultValue={value.rightsNote || ""}
                disabled={pending}
                name="rightsNote"
                placeholder="Autoría, licencia, cesión o permiso de uso"
              />
              {state.errors?.rightsNote?.[0] ? (
                <span className="font-normal text-red-700">
                  {state.errors.rightsNote[0]}
                </span>
              ) : null}
            </label>
            <label className="flex items-start gap-2 border border-ink/12 bg-white px-3 py-2 text-xs leading-5 text-ink">
              <input
                className="mt-0.5 size-4 shrink-0 accent-bronze"
                defaultChecked={value.approved}
                disabled={pending}
                name="rightsApproved"
                type="checkbox"
                value="true"
              />
              Confirmo que este recurso está autorizado para uso público.
            </label>

            {state.message ? (
              <p
                className={state.ok ? "text-xs text-olive" : "text-xs text-red-700"}
                role="status"
              >
                {state.message}
              </p>
            ) : null}

            <button
              className="inline-flex h-10 items-center justify-center gap-2 bg-ink px-4 text-xs font-semibold text-paper transition hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              <Save className="size-3.5" />
              {pending ? "Guardando..." : "Guardar derechos"}
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function formatApprovalDate(value: string | null) {
  if (!value) return "fecha no disponible";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
