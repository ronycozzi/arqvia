"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { TrackedAnchor } from "@/components/tracked-anchor";
import {
  estimateTierDetails,
  formatUsd,
  type EstimateTierValue,
} from "@/lib/estimator";
import { trackEvent } from "@/lib/analytics";
import { buildWhatsAppUrl } from "@/lib/utils";

type SavedEstimate = {
  projectTypeLabel: string;
  finishTier: EstimateTierValue;
  areaM2: number;
  totalMinUsd: number;
  totalMaxUsd: number;
  configVersion: number;
};

export function ThankYouEstimate({
  companyName,
  whatsapp,
}: {
  companyName: string;
  whatsapp: string;
}) {
  const [estimate, setEstimate] = useState<SavedEstimate | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("arqvia:last-estimate");
    if (!raw) return;
    let timer: number | undefined;
    try {
      const parsed = JSON.parse(raw) as SavedEstimate;
      timer = window.setTimeout(() => {
        setEstimate(parsed);
        trackEvent("thank_you_view", {
          hasEstimate: true,
          configVersion: parsed.configVersion,
        });
      }, 0);
    } catch {
      window.sessionStorage.removeItem("arqvia:last-estimate");
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  if (!estimate || !estimateTierDetails[estimate.finishTier]) return null;

  const range = `${formatUsd(estimate.totalMinUsd)} - ${formatUsd(estimate.totalMaxUsd)}`;
  const message = `Hola, ya envié mi consulta desde ${companyName}. La referencia calculada fue ${range} para ${estimate.projectTypeLabel}, ${estimate.areaM2} m² y nivel ${estimateTierDetails[estimate.finishTier].label}. Quiero sumar información para validar el alcance.`;

  return (
    <div className="mt-6 border-y border-bronze/25 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
        Rango asociado a tu consulta
      </p>
      <p className="mt-2 font-serif text-3xl leading-tight text-ink">{range}</p>
      <p className="mt-2 text-sm leading-6 text-ink/65">
        {estimate.projectTypeLabel} · {estimate.areaM2} m² · {estimateTierDetails[estimate.finishTier].label}
      </p>
      <TrackedAnchor
        href={buildWhatsAppUrl(message, whatsapp)}
        eventName="whatsapp_click"
        eventParams={{ source: "thank_you_estimate" }}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-bronze hover:text-bronze"
      >
        <MessageCircle className="size-4" /> Sumar información por WhatsApp
      </TrackedAnchor>
    </div>
  );
}
