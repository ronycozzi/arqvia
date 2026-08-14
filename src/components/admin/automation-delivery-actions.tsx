"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { ChevronDown, ListRestart, RotateCcw } from "lucide-react";
import {
  type AutomationActionState,
  requeueAutomationBatch,
  requeueAutomationDelivery,
} from "@/app/admin/(protected)/automations/actions";
import {
  getAutomationErrorPresentation,
  manualAutomationBatchSize,
} from "@/lib/admin-automation-investigation";

const initialState: AutomationActionState = { ok: false, message: "" };

export function AutomationRequeueBatchAction({
  disabled,
  requeueableCount,
}: {
  disabled: boolean;
  requeueableCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    requeueAutomationBatch,
    initialState,
  );
  const router = useRouter();
  const inactive = disabled || pending;

  useRefreshAutomationQueue(state, router.refresh);

  return (
    <form action={formAction} className="grid justify-items-stretch gap-2 sm:justify-items-end">
      <button
        type="submit"
        disabled={inactive}
        aria-busy={pending}
        className={`inline-flex h-12 min-w-52 items-center justify-center gap-2 px-5 text-sm font-semibold transition ${
          inactive
            ? "cursor-not-allowed border border-paper/15 bg-paper/5 text-paper/40"
            : "bg-bronze text-paper hover:bg-paper hover:text-ink"
        }`}
      >
        <ListRestart className="size-4" aria-hidden="true" />
        {pending
          ? "Reencolando lote..."
          : disabled
            ? "Sin entregas para reencolar"
            : `Reencolar ${Math.min(manualAutomationBatchSize, requeueableCount)} de ${requeueableCount}`}
      </button>
      {state.message ? (
        <p
          className={`max-w-sm border px-3 py-2 text-xs leading-5 ${
            state.ok
              ? "border-emerald-300/40 bg-emerald-950/30 text-emerald-100"
              : "border-red-300/40 bg-red-950/30 text-red-100"
          }`}
          role={state.ok ? "status" : "alert"}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function AutomationRequeueAction({
  deliveryId,
  disabled,
  errorCode,
  responseStatus,
}: {
  deliveryId: string;
  disabled: boolean;
  errorCode: string | null;
  responseStatus: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    requeueAutomationDelivery,
    initialState,
  );
  const router = useRouter();
  const diagnostic = getAutomationErrorPresentation(errorCode, responseStatus);
  const recommended = diagnostic?.requeueRecommended ?? false;

  useRefreshAutomationQueue(state, router.refresh);

  return (
    <details className="group border border-ink/10 bg-mist" open={recommended}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-ink transition hover:text-bronze [&::-webkit-details-marker]:hidden">
        Acción de recuperación
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <form action={formAction} className="grid gap-3 border-t border-ink/10 bg-white p-4">
        <input type="hidden" name="deliveryId" value={deliveryId} />
        <p className="text-xs leading-5 text-ink/60">
          Restablece los intentos y devuelve la entrega a pendiente. El envío
          queda a cargo del cron protegido.
        </p>
        <button
          type="submit"
          disabled={disabled || pending}
          aria-busy={pending}
          className={`inline-flex h-10 items-center justify-center gap-2 border px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:border-ink/10 disabled:bg-mist disabled:text-ink/40 sm:justify-self-end ${
            recommended
              ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
              : "border-red-300 bg-white text-red-700 hover:bg-red-50"
          }`}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {pending
            ? "Reencolando..."
            : recommended
              ? "Reencolar entrega"
              : "Reencolar igualmente"}
        </button>
        {state.message ? (
          <p
            className={`border px-3 py-2 text-xs leading-5 ${
              state.ok
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
            role={state.ok ? "status" : "alert"}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </details>
  );
}

function useRefreshAutomationQueue(
  state: AutomationActionState,
  refresh: () => void,
) {
  useEffect(() => {
    if (!state.ok || !state.revision) return;
    const timeout = window.setTimeout(refresh, 2_500);
    return () => window.clearTimeout(timeout);
  }, [refresh, state.ok, state.revision]);
}
