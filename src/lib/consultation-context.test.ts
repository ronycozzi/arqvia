import { describe, expect, it } from "vitest";
import { readConsultationContext } from "./consultation-context";

describe("consultation context", () => {
  it("carries known project choices into an editable contact brief", () => {
    expect(readConsultationContext({ tipo: "Obra nueva", etapa: "Tengo terreno", zona: "Villa Allende" }))
      .toEqual({ projectType: "Obra nueva", currentStatus: "Tengo terreno", city: "Villa Allende", message: "Mi punto de partida: tengo terreno." });
  });

  it("ignores duplicate, unsupported, oversized or markup query values", () => {
    expect(readConsultationContext({ tipo: ["Obra nueva", "Oficina"], etapa: "Etapa inventada", zona: "<script>alert(1)</script>" }))
      .toEqual({ projectType: undefined, currentStatus: undefined, city: undefined, message: undefined });
    expect(readConsultationContext({ zona: "a".repeat(121) }).city).toBeUndefined();
    expect(readConsultationContext({ zona: "https://example.com" }).city).toBeUndefined();
  });
});
