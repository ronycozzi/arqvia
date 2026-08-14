export type LeadCommercialSnapshot = {
  assignedUserId: string | null;
  lostReason: string | null;
  nextFollowUpAt: Date | null;
  quotedAmountUsd: number | null;
  wonAmountUsd: number | null;
};

export type LeadCommercialActivityDraft = {
  metadataJson: string;
  summary: string;
  type: "ASSIGNED" | "FOLLOW_UP_CHANGED" | "COMMERCIAL_VALUE_UPDATED";
};

export function buildLeadCommercialActivities({
  assignedUserLabel,
  current,
  next,
}: {
  assignedUserLabel: string | null;
  current: LeadCommercialSnapshot;
  next: LeadCommercialSnapshot;
}): LeadCommercialActivityDraft[] {
  const activities: LeadCommercialActivityDraft[] = [];

  if (current.assignedUserId !== next.assignedUserId) {
    activities.push({
      type: "ASSIGNED",
      summary: next.assignedUserId
        ? `Asignó la consulta a ${assignedUserLabel || "un integrante del equipo"}.`
        : "Dejó la consulta sin responsable asignado.",
      metadataJson: JSON.stringify({ assignedUserId: next.assignedUserId }),
    });
  }

  if (!sameDate(current.nextFollowUpAt, next.nextFollowUpAt)) {
    activities.push({
      type: "FOLLOW_UP_CHANGED",
      summary: next.nextFollowUpAt
        ? `Programó el próximo seguimiento para ${formatActivityDate(next.nextFollowUpAt)}.`
        : "Retiró la fecha de próximo seguimiento.",
      metadataJson: JSON.stringify({
        nextFollowUpAt: next.nextFollowUpAt?.toISOString() || null,
      }),
    });
  }

  if (
    current.quotedAmountUsd !== next.quotedAmountUsd ||
    current.wonAmountUsd !== next.wonAmountUsd ||
    normalizeNullableText(current.lostReason) !==
      normalizeNullableText(next.lostReason)
  ) {
    activities.push({
      type: "COMMERCIAL_VALUE_UPDATED",
      summary: buildCommercialValueSummary(next),
      metadataJson: JSON.stringify({
        lostReason: next.lostReason,
        quotedAmountUsd: next.quotedAmountUsd,
        wonAmountUsd: next.wonAmountUsd,
      }),
    });
  }

  return activities;
}

function buildCommercialValueSummary(snapshot: LeadCommercialSnapshot) {
  const parts = [
    snapshot.quotedAmountUsd !== null
      ? `presupuesto USD ${snapshot.quotedAmountUsd.toLocaleString("es-AR")}`
      : null,
    snapshot.wonAmountUsd !== null
      ? `valor ganado USD ${snapshot.wonAmountUsd.toLocaleString("es-AR")}`
      : null,
    snapshot.lostReason ? "motivo de pérdida registrado" : null,
  ].filter(Boolean);

  return parts.length
    ? `Actualizó la información comercial: ${parts.join(", ")}.`
    : "Limpió la información de valor comercial de la consulta.";
}

function formatActivityDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Cordoba",
  }).format(date);
}

function normalizeNullableText(value: string | null) {
  return value?.trim() || null;
}

function sameDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}
