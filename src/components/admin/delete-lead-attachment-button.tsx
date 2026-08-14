"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteLeadAttachmentButton({
  attachmentId,
  fileName,
  leadId,
  onDeleted,
}: {
  attachmentId: string;
  fileName: string;
  leadId: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteAttachment() {
    if (
      !window.confirm(
        `¿Eliminar ${fileName}? Esta acción también borra el archivo almacenado.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError("");
    const response = await fetch(
      `/api/admin/leads/${leadId}/attachments/${attachmentId}`,
      { method: "DELETE" },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message || "No pudimos eliminar el archivo.");
      setIsDeleting(false);
      return;
    }

    onDeleted?.();
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={deleteAttachment}
        disabled={isDeleting}
        className="inline-flex size-10 items-center justify-center border border-red-200 text-red-700 transition hover:border-red-700 hover:bg-red-700 hover:text-white disabled:cursor-wait disabled:opacity-60"
        aria-label={`Eliminar ${fileName}`}
        title={`Eliminar ${fileName}`}
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="size-4" aria-hidden="true" />
        )}
      </button>
      {error ? (
        <span role="alert" className="text-xs font-medium text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}
