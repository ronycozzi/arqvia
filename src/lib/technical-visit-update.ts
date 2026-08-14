import type { TechnicalVisitStatus } from "@prisma/client";

export function buildTechnicalVisitScheduleUpdate({
  assignedUserId,
  durationMinutes,
  scheduledAt,
  status,
}: {
  assignedUserId: string | null;
  durationMinutes: number;
  scheduledAt: Date | null;
  status: TechnicalVisitStatus;
}) {
  if (status === "CANCELLED") return { scheduledAt: null };

  return {
    assignedUserId,
    durationMinutes,
    scheduledAt,
  };
}
