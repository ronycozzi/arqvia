"use client";

import type { ComponentType } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

type DeleteSubmitButtonProps = {
  disabled?: boolean;
  icon?: ComponentType<{ className?: string }>;
  idleLabel?: string;
  pendingLabel?: string;
};

export function DeleteSubmitButton({
  disabled = false,
  icon: Icon = Trash2,
  idleLabel = "Eliminar",
  pendingLabel = "Eliminando...",
}: DeleteSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className="inline-flex h-10 items-center justify-center gap-2 border border-red-300 px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <Icon className="size-4" />
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
