import { CircleAlert, TriangleAlert } from "lucide-react";
import { getAutomationErrorPresentation } from "@/lib/admin-automation-investigation";

export function AutomationErrorGuidance({
  errorCode,
  responseStatus,
}: {
  errorCode: string | null;
  responseStatus: number | null;
}) {
  const presentation = getAutomationErrorPresentation(
    errorCode,
    responseStatus,
  );
  if (!presentation) return null;

  const warning = presentation.tone === "warning";
  const Icon = warning ? TriangleAlert : CircleAlert;

  return (
    <section
      className={`border p-4 ${
        warning
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-red-300 bg-red-50 text-red-950"
      }`}
      aria-label="Diagnóstico de la entrega"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{presentation.title}</h4>
          <p className="mt-1 text-xs leading-5 opacity-80">
            {presentation.description}
          </p>
          <p className="mt-2 text-xs font-semibold leading-5">
            {presentation.suggestion}
          </p>
          <span className="mt-3 inline-flex border border-current/20 bg-white/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]">
            {presentation.requeueRecommended
              ? "Reintento recomendado después de revisar"
              : "Corregir antes de reintentar"}
          </span>
        </div>
      </div>
    </section>
  );
}
