import { describe, expect, it } from "vitest";
import {
  formatRequestedVisitDate,
  formatTechnicalVisitDateTime,
  getCordobaDateTimeInputParts,
  parseCordobaDateTime,
  technicalVisitStatusClassNames,
  technicalVisitStatusLabels,
  technicalVisitStatusValues,
  visitWindowLabels,
  visitWindowValues,
} from "../src/lib/technical-visit-config";
import { technicalVisitAdminSchema } from "../src/lib/validations";
import { buildTechnicalVisitCalendar } from "../src/lib/technical-visit-calendar";
import { buildTechnicalVisitScheduleUpdate } from "../src/lib/technical-visit-update";

const validAdminInput = {
  leadId: " lead-123 ",
  status: "REQUESTED",
  scheduledDate: "",
  scheduledTime: "",
  durationMinutes: "60",
  address: " Av. Rafael Nunez 6200 ",
  assignedUserId: "",
  internalNotes: " Revisar el acceso lateral ",
};

describe("technical visit configuration", () => {
  it("clears the confirmed slot when a visit is cancelled", () => {
    expect(
      buildTechnicalVisitScheduleUpdate({
        assignedUserId: "user-2",
        durationMinutes: 90,
        scheduledAt: null,
        status: "CANCELLED",
      }),
    ).toEqual({ scheduledAt: null });
  });

  it("keeps every persisted status aligned with its label and visual class", () => {
    expect(technicalVisitStatusValues).toEqual([
      "REQUESTED",
      "SCHEDULED",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(technicalVisitStatusLabels).toEqual({
      REQUESTED: "Solicitada",
      SCHEDULED: "Agendada",
      CONFIRMED: "Confirmada",
      COMPLETED: "Realizada",
      CANCELLED: "Cancelada",
    });
    expect(Object.keys(technicalVisitStatusClassNames)).toEqual([
      ...technicalVisitStatusValues,
    ]);
    expect(
      technicalVisitStatusValues.every(
        (status) => technicalVisitStatusClassNames[status].length > 0,
      ),
    ).toBe(true);
  });

  it("keeps every public preference window aligned with its admin label", () => {
    expect(visitWindowValues).toEqual(["MORNING", "AFTERNOON", "FLEXIBLE"]);
    expect(visitWindowLabels).toEqual({
      MORNING: "Por la ma\u00f1ana",
      AFTERNOON: "Por la tarde",
      FLEXIBLE: "Horario flexible",
    });
  });

  it("formats confirmed and requested dates in the Cordoba time zone", () => {
    expect(
      formatTechnicalVisitDateTime("2026-07-14T16:30:00.000Z").replace(
        /\s+/g,
        " ",
      ),
    ).toBe("14 jul 2026, 1:30 p. m.");
    expect(formatRequestedVisitDate("2026-07-14")).toBe(
      "14 de julio de 2026",
    );
    expect(formatRequestedVisitDate(null)).toBe("Sin fecha preferida");
  });

  it("converts instants to Cordoba form fields across a UTC day boundary", () => {
    expect(getCordobaDateTimeInputParts("2026-07-15T01:30:00.000Z")).toEqual({
      date: "2026-07-14",
      time: "22:30",
    });
    expect(getCordobaDateTimeInputParts(null)).toEqual({ date: "", time: "" });
  });

  it("parses Cordoba form fields back to the expected instant", () => {
    expect(
      parseCordobaDateTime("2026-07-14", "13:45")?.toISOString(),
    ).toBe("2026-07-14T16:45:00.000Z");
    expect(parseCordobaDateTime("", "13:45")).toBeNull();
    expect(parseCordobaDateTime("not-a-date", "13:45")).toBeNull();
  });
});

describe("technicalVisitAdminSchema", () => {
  it("accepts an uncoordinated request and normalizes FormData values", () => {
    const result = technicalVisitAdminSchema.parse(validAdminInput);

    expect(result).toMatchObject({
      leadId: "lead-123",
      status: "REQUESTED",
      durationMinutes: 60,
      address: "Av. Rafael Nunez 6200",
      internalNotes: "Revisar el acceso lateral",
    });
  });

  it.each(["SCHEDULED", "CONFIRMED", "COMPLETED"])(
    "accepts %s when confirmed date and time are present",
    (status) => {
      const result = technicalVisitAdminSchema.safeParse({
        ...validAdminInput,
        status,
        scheduledDate: "2026-08-20",
        scheduledTime: "14:30",
      });

      expect(result.success).toBe(true);
    },
  );

  it.each(["SCHEDULED", "CONFIRMED", "COMPLETED"])(
    "requires confirmed date and time for %s",
    (status) => {
      const result = technicalVisitAdminSchema.safeParse({
        ...validAdminInput,
        status,
        scheduledDate: "",
        scheduledTime: "14:30",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.scheduledDate).toContain(
        "Indic\u00e1 fecha y hora para este estado",
      );
    },
  );

  it("allows cancelling without assigning a confirmed slot", () => {
    expect(
      technicalVisitAdminSchema.safeParse({
        ...validAdminInput,
        status: "CANCELLED",
      }).success,
    ).toBe(true);
  });

  it.each(["30", "240"])(
    "accepts the duration boundary of %s minutes",
    (durationMinutes) => {
      expect(
        technicalVisitAdminSchema.safeParse({
          ...validAdminInput,
          durationMinutes,
        }).success,
      ).toBe(true);
    },
  );

  it.each([
    ["blank lead", { leadId: "   " }, "leadId"],
    ["unknown status", { status: "IN_PROGRESS" }, "status"],
    ["impossible date", { scheduledDate: "2026-02-30" }, "scheduledDate"],
    ["invalid time", { scheduledTime: "24:00" }, "scheduledTime"],
    ["short duration", { durationMinutes: "29" }, "durationMinutes"],
    ["long duration", { durationMinutes: "241" }, "durationMinutes"],
    ["fractional duration", { durationMinutes: "60.5" }, "durationMinutes"],
  ])("rejects %s", (_label, override, expectedPath) => {
    const result = technicalVisitAdminSchema.safeParse({
      ...validAdminInput,
      ...override,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path[0])).toContain(
      expectedPath,
    );
  });
});

describe("technical visit calendar", () => {
  it("folds long UTF-8 lines and keeps scheduled visits tentative", () => {
    const calendar = buildTechnicalVisitCalendar({
      id: "visit-long-line",
      scheduledAt: new Date("2026-08-20T17:30:00.000Z"),
      durationMinutes: 90,
      status: "SCHEDULED",
      address:
        "Avenida Circunvalación 1234, acceso por portón lateral junto al estacionamiento principal",
      internalNotes:
        "Revisar estructura existente, instalaciones, niveles, asoleamiento y accesos de obra.",
      lead: {
        city: "Córdoba Capital",
        name: "Consulta con un nombre suficientemente extenso para validar interoperabilidad",
        projectType: "Remodelación integral residencial",
      },
    });

    expect(calendar).toContain("STATUS:TENTATIVE");
    expect(calendar).toContain("\r\n ");
    for (const line of calendar.split("\r\n").filter(Boolean)) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
  });
});
