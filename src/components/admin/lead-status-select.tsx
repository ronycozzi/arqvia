"use client";

import type { LeadStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { leadStatusClassNames, leadStatusOptions } from "@/lib/lead-utils";

export function LeadStatusSelect({
  leadId,
  initialStatus,
}: {
  leadId: string;
  initialStatus: LeadStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectId = `lead-status-${leadId}`;
  const feedbackId = `${selectId}-feedback`;

  async function updateStatus(nextStatus: LeadStatus) {
    const previousStatus = status;
    setStatus(nextStatus);
    setError("");
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        setStatus(previousStatus);
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(body?.message || "No se pudo guardar");
        return;
      }

      router.refresh();
    } catch {
      setStatus(previousStatus);
      setError("No se pudo conectar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="block">
      <label className="sr-only" htmlFor={selectId}>
        Estado del lead
      </label>
      <select
        id={selectId}
        aria-describedby={saving || error ? feedbackId : undefined}
        aria-invalid={error ? true : undefined}
        value={status}
        disabled={saving}
        onChange={(event) => updateStatus(event.target.value as LeadStatus)}
        className={`h-10 border border-ink/15 px-3 text-xs font-semibold outline-none transition focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:cursor-wait disabled:opacity-70 ${leadStatusClassNames[status]}`}
      >
        {leadStatusOptions.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <span id={feedbackId} aria-live="polite">
        {saving ? <span className="ml-2 text-xs text-ink/75">Guardando</span> : null}
        {error ? (
          <span className="mt-2 block max-w-xs text-xs leading-5 text-red-700">
            {error}
          </span>
        ) : null}
      </span>
    </div>
  );
}
