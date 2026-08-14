"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, LogOut, ShieldOff, Trash2, X } from "lucide-react";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";

type DeleteAction = (formData: FormData) => void | Promise<void>;

type DeleteConfirmationFormProps = {
  action: DeleteAction;
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  disabled?: boolean;
  fields: Record<string, string>;
  impactNote?: string;
  intent?: "delete" | "revoke-access" | "revoke-sessions";
  pendingLabel?: string;
  title: string;
  triggerLabel?: string;
};

export function DeleteConfirmationForm({
  action,
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar eliminación",
  description,
  disabled = false,
  fields,
  impactNote = "Esta acción puede afectar contenido publicado y quedará registrada en la actividad del panel cuando corresponda.",
  intent = "delete",
  pendingLabel = "Eliminando...",
  title,
  triggerLabel = "Eliminar",
}: DeleteConfirmationFormProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const TriggerIcon =
    intent === "revoke-access"
      ? ShieldOff
      : intent === "revoke-sessions"
        ? LogOut
        : Trash2;

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement;
    const triggerElement = triggerRef.current;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 border border-red-300 px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <TriggerIcon className="size-4" aria-hidden="true" />
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/62 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-lg border border-paper/12 bg-paper p-5 text-ink shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center border border-red-300 bg-red-50 text-red-700">
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <h2 id={titleId} className="font-serif text-3xl leading-tight">
                    {title}
                  </h2>
                  <p id={descriptionId} className="mt-2 text-sm leading-6 text-ink/72">
                    {description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center border border-ink/10 text-ink/65 transition hover:border-bronze hover:text-bronze"
                aria-label="Cerrar confirmación"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 border border-bronze/20 bg-bronze/10 p-4 text-sm leading-6 text-ink/75">
              {impactNote}
            </div>

            <form action={action} className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {Object.entries(fields).map(([name, value]) => (
                <input key={name} name={name} type="hidden" value={value} />
              ))}
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center border border-ink/15 px-4 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
              >
                {cancelLabel}
              </button>
              <DeleteSubmitButton
                disabled={disabled}
                idleLabel={confirmLabel}
                pendingLabel={pendingLabel}
              />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
