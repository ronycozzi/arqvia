"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSavedNote, setLastSavedNote] = useState("");
  const quickNotes = [
    "Se respondió por WhatsApp. Queda pendiente confirmar disponibilidad para llamada o visita.",
    "Pedir fotos, planos o medidas para evaluar alcance antes de presupuestar.",
    "Coordinar visita técnica. Validar zona, superficie, estado actual y prioridades.",
    "Preparar orientación inicial con etapas, rango de inversión y próximos pasos.",
  ];

  function applyQuickNote(note: string) {
    setBody((current) => {
      const trimmed = current.trim();
      return trimmed ? `${trimmed}\n\n${note}` : note;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setLastSavedNote("");
    const noteBody = body.trim();

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message || "No se pudo guardar la nota.");
        return;
      }

      await response.json().catch(() => null);
      setBody("");
      setLastSavedNote(noteBody);
      setMessage("Nota guardada correctamente.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el panel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3">
      <label
        htmlFor="lead-note"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/60"
      >
        Nueva nota
      </label>
      <textarea
        id="lead-note"
        name="body"
        required
        minLength={4}
        maxLength={1200}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Ej: Se respondió por WhatsApp. Quiere revisar cocina y estar; enviar referencias de presupuesto por etapas."
        className="min-h-32 w-full border border-ink/12 bg-white px-4 py-3 text-sm leading-7 text-ink outline-none transition placeholder:text-ink/35 focus:border-bronze focus:ring-2 focus:ring-bronze/20"
      />
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
          Plantillas rápidas
        </p>
        <div className="flex flex-wrap gap-2">
          {quickNotes.map((note) => (
            <button
              key={note}
              type="button"
              onClick={() => applyQuickNote(note)}
              className="border border-ink/12 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
            >
              {note.split(".")[0]}
            </button>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="h-12 w-fit bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-bronze disabled:cursor-wait disabled:opacity-70"
      >
        {saving ? "Guardando nota..." : "Guardar nota"}
      </button>
      <span aria-live="polite">
        {message ? (
          <span className="block border border-olive/20 bg-olive/10 px-4 py-3 text-sm font-semibold text-olive">
            {message}
          </span>
        ) : null}
        {error ? (
          <span className="block border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
            {error}
          </span>
        ) : null}
      </span>
      {lastSavedNote ? (
        <article className="border border-olive/20 bg-olive/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">
            Nota recién guardada
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink/78">
            {lastSavedNote}
          </p>
        </article>
      ) : null}
    </form>
  );
}
