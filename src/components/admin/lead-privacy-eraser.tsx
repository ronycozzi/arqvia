"use client";

import { AlertTriangle, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

const confirmationToken = "ELIMINAR";

export function LeadPrivacyEraser({
  attachmentCount,
  leadId,
}: {
  attachmentCount: number;
  leadId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [requestVerified, setRequestVerified] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const deletingRef = useRef(false);

  useEffect(() => {
    deletingRef.current = isDeleting;
  }, [isDeleting]);

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement;
    const triggerElement = triggerRef.current;
    confirmationRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deletingRef.current) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      } else {
        triggerElement?.focus();
      }
    };
  }, [open]);

  function openDialog() {
    setConfirmation("");
    setRequestVerified(false);
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    if (!isDeleting) setOpen(false);
  }

  async function eraseLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestVerified || confirmation !== confirmationToken) return;

    setIsDeleting(true);
    setError("");

    const response = await fetch(`/api/admin/leads/${leadId}/privacy`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    }).catch(() => null);

    const payload = (await response?.json().catch(() => null)) as {
      message?: string;
    } | null;

    if (!response?.ok) {
      setError(
        payload?.message ||
          "No pudimos completar la eliminación. Revisá la conexión y reintentá.",
      );
      setIsDeleting(false);
      return;
    }

    router.replace("/admin/leads");
    router.refresh();
  }

  const canSubmit =
    requestVerified && confirmation === confirmationToken && !isDeleting;

  return (
    <section className="border border-red-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="flex max-w-3xl items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-red-700">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
              Acceso exclusivo Admin
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Privacidad y datos personales
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/72">
              Usá este flujo únicamente ante un pedido verificado del titular.
              Elimina la consulta, sus relaciones, la actividad vinculada y
              {attachmentCount === 1
                ? " 1 adjunto privado"
                : ` ${attachmentCount} adjuntos privados`}
              . La operación es irreversible y deja sólo una constancia mínima
              sin datos del titular.
            </p>
          </div>
        </div>

        <button
          ref={triggerRef}
          type="button"
          onClick={openDialog}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 border border-red-300 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-700 hover:text-white"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Eliminar por privacidad
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-ink/65 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            aria-busy={isDeleting}
            className="max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto border border-paper/15 bg-paper p-5 text-ink shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center border border-red-300 bg-red-50 text-red-700">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id={titleId} className="font-serif text-3xl leading-tight">
                    Eliminar definitivamente la consulta
                  </h2>
                  <p
                    id={descriptionId}
                    className="mt-2 text-sm leading-6 text-ink/72"
                  >
                    Primero se borrarán los archivos privados. Después se
                    eliminarán en una transacción la consulta, notas, visita,
                    estimación, entregas y registros de actividad relacionados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isDeleting}
                className="grid size-9 shrink-0 place-items-center border border-ink/10 text-ink/65 transition hover:border-bronze hover:text-bronze disabled:cursor-wait disabled:opacity-50"
                aria-label="Cerrar confirmación"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={eraseLead} className="mt-6 grid gap-5">
              <label className="flex cursor-pointer items-start gap-3 border border-ink/12 bg-white p-4 text-sm leading-6 text-ink/78">
                <input
                  type="checkbox"
                  checked={requestVerified}
                  onChange={(event) => setRequestVerified(event.target.checked)}
                  disabled={isDeleting}
                  className="mt-1 size-4 accent-red-700"
                />
                <span>
                  Confirmo que se verificó la identidad del titular y el alcance
                  de su pedido de eliminación.
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Para confirmar, escribí {confirmationToken}
                <input
                  ref={confirmationRef}
                  type="text"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={isDeleting}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 border border-ink/15 bg-white px-3 font-mono text-sm uppercase outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:cursor-wait disabled:opacity-60"
                />
              </label>

              <div aria-live="assertive">
                {error ? (
                  <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm font-medium leading-6 text-red-800">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isDeleting}
                  className="inline-flex h-11 items-center justify-center border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze disabled:cursor-wait disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex h-11 min-w-52 items-center justify-center gap-2 bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-4" aria-hidden="true" />
                  )}
                  {isDeleting ? "Eliminando datos..." : "Eliminar definitivamente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
