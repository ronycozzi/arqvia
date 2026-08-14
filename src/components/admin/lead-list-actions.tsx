import Link from "next/link";
import { EllipsisVertical, Eye, Mail, MessageCircle } from "lucide-react";
import { LeadContactLink } from "@/components/admin/lead-contact-link";

export function LeadListActions({
  emailHref,
  leadId,
  leadLabel,
  whatsappHref,
}: {
  emailHref?: string;
  leadId: string;
  leadLabel: string;
  whatsappHref?: string;
}) {
  return (
    <details className="group/actions w-fit max-w-full">
      <summary
        aria-label={`Más acciones para ${leadLabel}`}
        className="grid size-10 cursor-pointer list-none place-items-center border border-ink/15 bg-white text-ink transition hover:border-bronze hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze [&::-webkit-details-marker]:hidden"
      >
        <EllipsisVertical className="size-4" aria-hidden="true" />
      </summary>
      <div
        className="mt-2 grid w-[min(13rem,calc(100vw-3rem))] gap-1 border border-ink/12 bg-paper p-2 shadow-[0_14px_32px_rgb(17_19_15/0.14)]"
        aria-label={`Acciones para ${leadLabel}`}
      >
        <Link
          href={`/admin/leads/${leadId}`}
          className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-ink transition hover:bg-mist hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze"
        >
          <Eye className="size-4" aria-hidden="true" />
          Abrir ficha
        </Link>
        {whatsappHref ? (
          <LeadContactLink
            channel="WHATSAPP"
            leadId={leadId}
            href={whatsappHref}
            className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-ink transition hover:bg-mist hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Abrir WhatsApp
          </LeadContactLink>
        ) : null}
        {emailHref ? (
          <LeadContactLink
            channel="EMAIL"
            leadId={leadId}
            href={emailHref}
            className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-ink transition hover:bg-mist hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-bronze"
          >
            <Mail className="size-4" aria-hidden="true" />
            Enviar email
          </LeadContactLink>
        ) : null}
      </div>
    </details>
  );
}
