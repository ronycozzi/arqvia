import { describe, expect, test } from "vitest";
import { rankRelatedProjects } from "../src/lib/project-recommendations";

const current = {
  category: "Residencial",
  clientType: "Familia",
  location: "Villa Allende",
  serviceSlug: "construccion-llave-en-mano",
  slug: "casa-patio",
};

describe("rankRelatedProjects", () => {
  test("prioritizes shared category and service over unrelated recent work", () => {
    const ranked = rankRelatedProjects(current, [
      {
        category: "Comercial",
        clientType: "Empresa",
        location: "Córdoba Capital",
        serviceSlug: "locales-comerciales",
        slug: "local",
      },
      {
        category: "Residencial",
        clientType: "Familia",
        location: "Mendiolaza",
        serviceSlug: "construccion-llave-en-mano",
        slug: "casa-relacionada",
      },
      {
        category: "Residencial",
        clientType: "Particular",
        location: "Villa Carlos Paz",
        serviceSlug: "diseno-arquitectonico",
        slug: "casa-secundaria",
      },
    ]);

    expect(ranked.map((project) => project.slug)).toEqual([
      "casa-relacionada",
      "casa-secundaria",
      "local",
    ]);
  });

  test("keeps the original order when projects have the same relevance", () => {
    const candidates = [
      { ...current, slug: "primero", location: "La Calera" },
      { ...current, slug: "segundo", location: "Mendiolaza" },
    ];

    expect(rankRelatedProjects(current, candidates).map((item) => item.slug)).toEqual([
      "primero",
      "segundo",
    ]);
  });
});
