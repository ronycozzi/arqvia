import { describe, expect, test } from "vitest";
import {
  evaluateProjectQuality,
  type ProjectQualityInput,
} from "../src/lib/project-quality";

const strongProject: ProjectQualityInput = {
  categoryName: "Remodelación",
  challenge:
    "La cocina original tenía poca luz, circulación incómoda y muebles sin capacidad suficiente para el uso diario.",
  constructionSystem: "Remodelación interior con mobiliario a medida",
  coverImage: "/images/arqvia-kitchen-after-remodel.webp",
  description:
    "El proyecto reorganizó una cocina existente para mejorar luz, guardado y relación con el comedor diario, cuidando tiempos de obra y decisiones de materiales.",
  duration: "7 semanas",
  imageAlt: "Cocina remodelada con mobiliario oscuro y luz cálida",
  images: [
    {
      type: "BEFORE",
      altText: "Cocina antes de la remodelación",
      caption: "Estado inicial de la cocina.",
    },
    {
      type: "AFTER",
      altText: "Cocina después de la remodelación",
      caption: "Resultado final de la misma cocina.",
    },
    { type: "PROCESS" },
  ],
  materials:
    "Madera, cuarzo, iluminación LED, revestimiento terracota y grifería negra.",
  process:
    "Relevamiento, propuesta espacial, presupuesto por rubros, compras críticas, ejecución y revisión final.",
  result:
    "Una cocina más cómoda, luminosa y conectada con el comedor diario, con mayor superficie de trabajo.",
  seoDescription:
    "Caso de remodelación de cocina en Córdoba con antes y después, ficha técnica, proceso de obra y decisiones de materiales.",
  seoTitle: "Remodelación de cocina en Córdoba Capital | Arqvia",
  solution:
    "Se definió una nueva distribución con mobiliario a medida, iluminación cálida y mejor superficie de trabajo.",
  summary:
    "Remodelación de cocina con nueva distribución, iluminación cálida, guardado a medida y conexión con comedor diario.",
};

describe("evaluateProjectQuality", () => {
  test("marks a complete remodeling case as ready to sell", () => {
    const result = evaluateProjectQuality(strongProject);

    expect(result.status).toBe("strong");
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
  });

  test("requires before and after pair for remodeling cases", () => {
    const result = evaluateProjectQuality({
      ...strongProject,
      images: [{ type: "BEFORE" }, { type: "PROCESS" }],
    });

    expect(result.status).toBe("review");
    expect(result.missing).toContain(
      "Antes/después completo para remodelaciones",
    );
  });

  test("requires before and after images from the same space", () => {
    const result = evaluateProjectQuality({
      ...strongProject,
      images: [
        {
          type: "BEFORE",
          altText: "Cocina antes de la remodelación",
          caption: "Estado inicial de la cocina.",
        },
        {
          type: "AFTER",
          altText: "Baño después de la remodelación",
          caption: "Resultado final de un baño.",
        },
      ],
    });

    expect(result.status).toBe("review");
    expect(result.missing).toContain("Antes/después del mismo ambiente");
  });

  test("flags weak SEO and narrative as content debt", () => {
    const result = evaluateProjectQuality({
      ...strongProject,
      challenge: "Poca luz.",
      description: "Cocina.",
      images: [],
      seoDescription: "Remodelación.",
      seoTitle: "Cocina",
      summary: "Cocina renovada.",
    });

    expect(result.status).toBe("weak");
    expect(result.missing).toEqual(
      expect.arrayContaining([
        "Galería con al menos dos imágenes",
        "Resumen y descripción desarrollados",
        "Narrativa completa de caso de estudio",
        "SEO title y description específicos",
      ]),
    );
  });
});
