import { describe, expect, it } from "vitest";
import {
  getLegalPageFallback,
  isLegalPageSlug,
  legalPageDefinitions,
  legalPageSlugs,
} from "@/lib/legal-content";
import { legalPageFormSchema } from "@/lib/validations";

const validInput = {
  content:
    "Este documento explica el alcance del tratamiento y las condiciones aplicables. ".repeat(
      3,
    ),
  reviewedBy: "Asesoría legal",
  seoDescription:
    "Información legal de Arqvia sobre privacidad, servicios y canales de contacto.",
  seoTitle: "Política de privacidad | Arqvia",
  slug: "privacidad",
  status: "PUBLISHED",
  summary:
    "Información sobre el tratamiento de datos enviados por los canales de consulta.",
  title: "Política de privacidad",
};

describe("legal content", () => {
  it("keeps the four institutional routes explicit and complete", () => {
    expect(legalPageSlugs).toEqual([
      "privacidad",
      "terminos",
      "cookies",
      "aviso-presupuestos",
    ]);
    expect(legalPageDefinitions).toHaveLength(4);
    expect(
      legalPageDefinitions.every(
        (page) =>
          page.content.length >= 120 &&
          page.summary.length >= 20 &&
          page.seoDescription.length >= 20,
      ),
    ).toBe(true);
    expect(getLegalPageFallback("cookies").title).toMatch(/cookies/i);
  });

  it("rejects arbitrary legal routes", () => {
    expect(isLegalPageSlug("privacidad")).toBe(true);
    expect(isLegalPageSlug("condiciones-inventadas")).toBe(false);
    expect(
      legalPageFormSchema.safeParse({
        ...validInput,
        slug: "condiciones-inventadas",
      }).success,
    ).toBe(false);
  });

  it("requires review evidence only when publishing", () => {
    expect(legalPageFormSchema.safeParse(validInput).success).toBe(true);
    expect(
      legalPageFormSchema.safeParse({ ...validInput, reviewedBy: "" }).success,
    ).toBe(false);
    expect(
      legalPageFormSchema.safeParse({
        ...validInput,
        reviewedBy: "",
        status: "DRAFT",
      }).success,
    ).toBe(true);
  });
});
