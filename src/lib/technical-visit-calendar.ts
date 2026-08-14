type CalendarVisit = {
  durationMinutes: number;
  id: string;
  scheduledAt: Date;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED";
  address: string | null;
  internalNotes: string | null;
  lead: {
    city: string;
    name: string;
    projectType: string;
  };
};

function formatIcsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let current = "";

  for (const character of line) {
    const limit = chunks.length ? 74 : 75;
    if (Buffer.byteLength(current + character, "utf8") > limit && current) {
      chunks.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  chunks.push(current);

  return chunks
    .map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`))
    .join("\r\n");
}

export function buildTechnicalVisitCalendar(visit: CalendarVisit) {
  const startsAt = new Date(visit.scheduledAt);
  const endsAt = new Date(
    startsAt.getTime() + visit.durationMinutes * 60 * 1000,
  );
  const location = visit.address || visit.lead.city;
  const description = [
    `Proyecto: ${visit.lead.projectType}`,
    visit.internalNotes ? `Notas: ${visit.internalNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const calendarStatus =
    visit.status === "SCHEDULED" ? "TENTATIVE" : "CONFIRMED";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arqvia//Visitas Tecnicas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(`${visit.id}@arqvia`)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startsAt)}`,
    `DTEND:${formatIcsDate(endsAt)}`,
    `SUMMARY:${escapeIcsText(`Visita técnica - ${visit.lead.name}`)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `STATUS:${calendarStatus}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
