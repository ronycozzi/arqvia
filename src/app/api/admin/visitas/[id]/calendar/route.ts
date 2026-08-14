import { NextResponse } from "next/server";
import { commercialManagerRoles, getVerifiedAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { buildTechnicalVisitCalendar } from "@/lib/technical-visit-calendar";
import { getCordobaDateTimeInputParts } from "@/lib/technical-visit-config";

type CalendarRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CalendarRouteContext) {
  const session = await getVerifiedAdminSession(commercialManagerRoles);
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const visit = await prisma.technicalVisit.findUnique({
    where: { id },
    select: {
      address: true,
      durationMinutes: true,
      id: true,
      internalNotes: true,
      scheduledAt: true,
      status: true,
      lead: {
        select: {
          city: true,
          name: true,
          projectType: true,
        },
      },
    },
  });

  if (
    !visit?.scheduledAt ||
    !["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(visit.status)
  ) {
    return NextResponse.json(
      { message: "La visita no tiene fecha confirmada" },
      { status: 404 },
    );
  }

  const calendar = buildTechnicalVisitCalendar({
    ...visit,
    scheduledAt: visit.scheduledAt,
    status: visit.status as "SCHEDULED" | "CONFIRMED" | "COMPLETED",
  });
  const date = getCordobaDateTimeInputParts(visit.scheduledAt).date;

  return new Response(calendar, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="visita-arqvia-${date}.ics"`,
      "Content-Type": "text/calendar; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
