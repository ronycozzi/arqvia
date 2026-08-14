import { describe, expect, it } from "vitest";
import {
  buildLeadInternalBrief,
  buildLeadResponseDraft,
  getLeadCommercialReading,
} from "./lead-utils";

const baseLead = {
  areaM2: null,
  budgetRange: null,
  city: "Cordoba Capital",
  currentStatus: null,
  hasPlans: false,
  message: "Quiero consultar por un proyecto.",
  needsVisit: false,
  projectType: "Otro",
  referenceLinks: null,
  startDate: null,
};

describe("getLeadCommercialReading", () => {
  it("scores a qualified high intent lead as high priority", () => {
    const reading = getLeadCommercialReading({
      ...baseLead,
      areaM2: "120 m2",
      budgetRange: "USD 80.000 - 150.000",
      currentStatus: "Necesito remodelar un espacio existente",
      hasPlans: true,
      message:
        "Queremos remodelar cocina y estar con dirección técnica, presupuesto por etapas y fecha de inicio cercana.",
      needsVisit: true,
      referenceLinks: "https://drive.google.com/arqvia-referencias",
      projectType: "Remodelación integral",
      startDate: "Próximos 3 meses",
    });

    expect(reading.label).toBe("Alta");
    expect(reading.score).toBeGreaterThanOrEqual(72);
    expect(reading.summary).toContain("contactar hoy");
    expect(reading.reasons).toContain("Presupuesto alto o amplio");
    expect(reading.reasons).toContain("Compartio links o referencias visuales");
    expect(reading.nextSteps[0]).toMatch(/visita|reunión/i);
  });

  it("keeps an early lead in initial priority and asks for missing data", () => {
    const reading = getLeadCommercialReading(baseLead);

    expect(reading.label).toBe("Inicial");
    expect(reading.missing).toContain("Definir rango de inversión aproximado");
    expect(reading.missing).toContain("Pedir superficie aproximada");
  });
});

describe("lead response helpers", () => {
  it("builds a response draft with project, budget and next step context", () => {
    const draft = buildLeadResponseDraft({
      ...baseLead,
      areaM2: "120 m2",
      budgetRange: "USD 80.000 - 150.000",
      city: "Villa Allende",
      name: "Laura Perez",
      projectType: "Construccion llave en mano",
      startDate: "Proximos 3 meses",
    });

    expect(draft).toContain("Hola Laura");
    expect(draft).toContain("Construccion llave en mano en Villa Allende");
    expect(draft).toContain("USD 80.000 - 150.000");
    expect(draft).toContain("llamada breve o visita");
  });

  it("builds an internal brief with contact and qualification fields", () => {
    const brief = buildLeadInternalBrief({
      ...baseLead,
      email: "laura@example.com",
      name: "Laura Perez",
      phone: "+54 351 555 0000",
      sourcePage: "/contacto",
    });

    expect(brief).toContain("Consulta: Laura Perez");
    expect(brief).toContain("Contacto: +54 351 555 0000");
    expect(brief).toContain("Links o referencias");
    expect(brief).toContain("Origen: /contacto");
  });
});
