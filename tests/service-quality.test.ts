import { describe, expect, test } from "vitest";
import {
  evaluateServiceQuality,
  type ServiceQualityInput,
} from "../src/lib/service-quality";

const strongService: ServiceQualityInput = {
  audience:
    "Familias, estudios y empresas que necesitan ordenar alcance, tiempos y decisiones técnicas antes de iniciar una obra.",
  benefits:
    "Permite reducir cambios durante la ejecución, comparar presupuestos con criterios claros y sostener una dirección técnica coherente.",
  categoryName: "Arquitectura",
  coverImage: "/images/arqvia-hero-concrete-pool-generated-3840x2160.webp",
  description:
    "Servicio integral para diseñar, documentar y acompañar proyectos residenciales o comerciales con decisiones de distribución, materialidad, presupuesto y ejecución ordenadas desde el inicio.",
  faq: JSON.stringify([
    {
      question: "¿Se puede contratar solo esta etapa",
      answer:
        "Sí. Podemos acompañar una etapa puntual o integrar el servicio dentro de un proceso completo de diseño y obra.",
    },
    {
      question: "¿Qué información conviene preparar",
      answer:
        "Fotos, medidas, ubicación, referencias, presupuesto estimado y dudas principales ayudan a orientar la primera evaluación.",
    },
  ]),
  faqCount: 2,
  included:
    "Diagnóstico inicial\nPropuesta de alcance\nDocumentación técnica\nRevisión de presupuesto",
  mainBenefit:
    "Ordena el proyecto antes de invertir fuerte, para tomar mejores decisiones de diseño, costo y ejecución.",
  process:
    "Consulta inicial\nRelevamiento\nPropuesta técnica\nPlan de avance\nSeguimiento",
  projectCount: 1,
  seoDescription:
    "Servicio de arquitectura, documentación y dirección técnica en Córdoba para proyectos residenciales y comerciales.",
  seoTitle: "Servicio de arquitectura y dirección técnica en Córdoba | Arqvia",
  shortDescription:
    "Diseño, documentación y acompañamiento técnico para transformar una idea en una obra viable y ordenada.",
  title: "Diseño arquitectónico",
  whatsappMessage:
    "Hola, quiero consultar por diseño arquitectónico para ordenar un proyecto residencial o comercial.",
};

describe("evaluateServiceQuality", () => {
  test("marks a complete commercial service page as ready", () => {
    const result = evaluateServiceQuality(strongService);

    expect(result.status).toBe("strong");
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
  });

  test("flags weak service pages before they reach the public site", () => {
    const result = evaluateServiceQuality({
      ...strongService,
      benefits: "Mejora el proyecto.",
      description: "Servicio.",
      faq: "[]",
      faqCount: 0,
      included: "Consulta",
      process: "Consulta",
      projectCount: 0,
      seoDescription: "Arquitectura.",
      seoTitle: "Arquitectura",
      shortDescription: "Diseño.",
      whatsappMessage: "Consulta servicio",
    });

    expect(result.status).toBe("weak");
    expect(result.missing).toEqual(
      expect.arrayContaining([
        "Copy principal suficiente",
        "Incluye alcance y proceso desarrollados",
        "FAQ con al menos dos respuestas útiles",
        "Proyecto relacionado para dar prueba de trabajo",
      ]),
    );
  });

  test("accepts a contextual WhatsApp message that mentions the service", () => {
    const result = evaluateServiceQuality({
      ...strongService,
      whatsappMessage:
        "Hola, vi el servicio de diseño arquitectónico y quiero consultar por una vivienda en Córdoba.",
    });

    expect(result.missing).not.toContain("Mensaje de WhatsApp específico");
  });

  test("rejects a generic WhatsApp message that ends in servicio", () => {
    const result = evaluateServiceQuality({
      ...strongService,
      whatsappMessage: "Hola, quiero recibir información sobre el servicio.",
    });

    expect(result.missing).toContain("Mensaje de WhatsApp específico");
  });
});
