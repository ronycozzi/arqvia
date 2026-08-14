"use client";

import { Download, FileText, ImageIcon } from "lucide-react";
import { useState } from "react";
import { DeleteLeadAttachmentButton } from "@/components/admin/delete-lead-attachment-button";
import { formatAttachmentBytes } from "@/lib/lead-attachment-config";

export function LeadAttachmentRow({
  attachment,
  canManage,
  createdAtLabel,
  leadId,
}: {
  attachment: {
    id: string;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
  };
  canManage: boolean;
  createdAtLabel: string;
  leadId: string;
}) {
  const [isRemoved, setIsRemoved] = useState(false);
  if (isRemoved) return null;

  const AttachmentIcon = attachment.mimeType.startsWith("image/")
    ? ImageIcon
    : FileText;

  return (
    <li className="flex flex-col gap-4 border border-ink/10 bg-mist p-4 sm:flex-row sm:items-center">
      <span className="inline-flex size-11 shrink-0 items-center justify-center bg-ink text-paper">
        <AttachmentIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {attachment.originalName}
        </p>
        <p className="mt-1 text-xs text-ink/55">
          {attachment.mimeType === "application/pdf"
            ? "Documento PDF"
            : "Imagen optimizada"}{" "}
          · {formatAttachmentBytes(attachment.sizeBytes)} · {createdAtLabel}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`/api/admin/leads/${leadId}/attachments/${attachment.id}`}
          download
          className="inline-flex h-10 items-center justify-center gap-2 border border-ink/15 px-3 text-xs font-semibold text-ink transition hover:border-bronze hover:text-bronze"
        >
          <Download className="size-4" aria-hidden="true" />
          Descargar
        </a>
        {canManage ? (
          <DeleteLeadAttachmentButton
            attachmentId={attachment.id}
            fileName={attachment.originalName}
            leadId={leadId}
            onDeleted={() => setIsRemoved(true)}
          />
        ) : null}
      </div>
    </li>
  );
}
