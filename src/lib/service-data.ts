import type { Service, ServiceCategory } from "@prisma/client";
import { cache } from "react";
import { serviceCategories, services as seedServices } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  canUseSeedContent,
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "@/lib/public-content-policy";
import type { PublicService, ServiceFaq } from "@/types/service";

type ServiceWithCategory = Service & {
  category: ServiceCategory;
};

export type PublicServiceLink = Pick<PublicService, "slug" | "title">;

const iconBySeedSlug: Record<string, string> = {
  "diseno-arquitectonico": "DraftingCompass",
  "construccion-llave-en-mano": "Building2",
  "remodelaciones-integrales": "Hammer",
  "diseno-interior": "LampDesk",
  "direccion-administracion-obra": "ClipboardCheck",
  "documentacion-tecnica": "Ruler",
  "relevamiento-diagnostico": "ClipboardCheck",
  "renders-visualizacion": "Sparkles",
  ampliaciones: "Home",
  "locales-comerciales": "Building2",
  oficinas: "LampDesk",
};

const seedBenefitsBySlug: Record<string, string[]> = {
  "diseno-arquitectonico": [
    "Decisiones de distribución y uso definidas antes de invertir en obra.",
    "Criterio estético alineado con presupuesto, terreno y forma de habitar.",
    "Base clara para avanzar hacia documentación, permisos y ejecución.",
  ],
  "construccion-llave-en-mano": [
    "Un solo equipo coordina planificación, materiales, gremios y seguimiento.",
    "Menos improvisación durante la obra gracias a etapas y responsables definidos.",
    "Mayor control sobre costos, tiempos y calidad de terminaciones.",
  ],
  "remodelaciones-integrales": [
    "Transformación del espacio sin perder de vista uso diario, obra limpia y tiempos.",
    "Mejor coordinación entre diseño, compras, gremios y ejecución.",
    "Decisiones de materiales y terminaciones tomadas con criterio técnico.",
  ],
  "diseno-interior": [
    "Interiores coherentes con la arquitectura, el mobiliario y la iluminación.",
    "Selección de materiales pensada para uso real, mantenimiento y presupuesto.",
    "Ambientes con identidad sin perder funcionalidad ni circulación.",
  ],
  "direccion-administracion-obra": [
    "Seguimiento técnico para detectar desvíos antes de que escalen.",
    "Mayor claridad en certificaciones, compras, avances y prioridades.",
    "Comunicación ordenada entre cliente, proveedores y equipos de obra.",
  ],
  "documentacion-tecnica": [
    "Planos y detalles preparados para cotizar, coordinar y ejecutar con menos dudas.",
    "Información técnica consistente para municipios, proveedores y obra.",
    "Menos riesgo de errores por decisiones incompletas o mal comunicadas.",
  ],
  "relevamiento-diagnostico": [
    "Punto de partida técnico para decidir con información y no con suposiciones.",
    "Detección temprana de restricciones, patologías o interferencias.",
    "Mejor base para presupuestar alcance, prioridades y etapas.",
  ],
  "renders-visualizacion": [
    "Visualización clara de proporciones, materiales y atmósfera antes de ejecutar.",
    "Mejores decisiones de diseño con menos cambios tardíos en obra.",
    "Piezas útiles para presentar, vender o validar el proyecto.",
  ],
  ampliaciones: [
    "Crecimiento de superficie integrado a la estructura y al lenguaje existente.",
    "Evaluación de factibilidad, interferencias y etapas antes de construir.",
    "Mayor control sobre convivencia entre obra nueva y espacios en uso.",
  ],
  "locales-comerciales": [
    "Espacios comerciales pensados para circulación, atención y operación diaria.",
    "Decisiones de fachada, iluminación y materialidad alineadas con la marca.",
    "Planificación de obra para reducir tiempos cerrados o improductivos.",
  ],
  oficinas: [
    "Distribución de puestos, salas y áreas de apoyo según dinámica de trabajo.",
    "Mejor equilibrio entre imagen institucional, acústica, luz y flexibilidad.",
    "Espacios preparados para crecer, reorganizarse y operar con comodidad.",
  ],
};

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaq(value: string): ServiceFaq[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "question" in item &&
          "answer" in item,
      )
    ) {
      return parsed.map((item) => {
        const faq = item as { question: unknown; answer: unknown };
        return {
          question: String(faq.question),
          answer: String(faq.answer),
        };
      });
    }
  } catch {
    return [];
  }

  return [];
}

function seedToPublicService(
  service: (typeof seedServices)[number],
): PublicService {
  const category = serviceCategories.find((item) => item.slug === service.category);

  return {
    id: service.slug,
    title: service.title,
    slug: service.slug,
    category: service.category,
    categoryName: category?.name || service.category,
    iconName: iconBySeedSlug[service.slug] || "Sparkles",
    shortDescription: service.shortDescription,
    description: service.description,
    mainBenefit: service.mainBenefit,
    benefits: seedBenefitsBySlug[service.slug] || service.included.slice(0, 3),
    audience: service.audience,
    included: service.included,
    process: service.process,
    faq: service.faq,
    whatsappMessage: service.whatsappMessage,
    seoTitle: service.seoTitle,
    seoDescription: service.seoDescription,
    coverImage: service.coverImage,
    featured: service.featured,
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
  };
}

function toPublicService(service: ServiceWithCategory): PublicService {
  return {
    id: service.id,
    title: service.title,
    slug: service.slug,
    category: service.category.slug,
    categoryName: service.category.name,
    iconName: iconBySeedSlug[service.slug] || service.icon || "Sparkles",
    shortDescription: service.shortDescription,
    description: service.description,
    mainBenefit: service.mainBenefit,
    benefits: splitLines(service.benefits),
    audience: service.audience,
    included: splitLines(service.included),
    process: splitLines(service.process),
    faq: parseFaq(service.faq),
    whatsappMessage: service.whatsappMessage,
    seoTitle: service.seoTitle,
    seoDescription: service.seoDescription,
    coverImage: service.coverImage,
    featured: service.featured,
    updatedAt: service.updatedAt,
  };
}

export async function getPublicServices(): Promise<PublicService[]> {
  try {
    const dbServices = await prisma.service.findMany({
      where: {
        publicationStatus: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
      include: { category: true },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    });

    if (dbServices.length) return dbServices.map(toPublicService);

    const serviceCount = await prisma.service.count();
    return serviceCount === 0
      ? seedCollectionOrEmpty(seedServices.map(seedToPublicService))
      : [];
  } catch (error) {
    return fallbackPublicContent(
      "services",
      seedServices.map(seedToPublicService),
      error,
    );
  }
}

export async function getPublicServiceLinks(): Promise<PublicServiceLink[]> {
  const seedLinks = seedServices.map(({ slug, title }) => ({ slug, title }));

  try {
    const rows = await prisma.service.findMany({
      where: {
        publicationStatus: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      select: { slug: true, title: true },
    });

    if (rows.length) return rows;

    const serviceCount = await prisma.service.count();
    return serviceCount === 0 ? seedCollectionOrEmpty(seedLinks) : [];
  } catch (error) {
    return fallbackPublicContent("service links", seedLinks, error);
  }
}

export const getPublicService = cache(async function getPublicService(
  slug: string,
): Promise<PublicService | null> {
  const seedService =
    seedServices.map(seedToPublicService).find((item) => item.slug === slug) ||
    null;

  try {
    const service = await prisma.service.findFirst({
      where: {
        slug,
        publicationStatus: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
      include: { category: true },
    });

    if (service) return toPublicService(service);

    if (!canUseSeedContent()) return null;

    const serviceCount = await prisma.service.count();
    return serviceCount === 0 ? seedService : null;
  } catch (error) {
    return fallbackPublicContent("service detail", seedService, error);
  }
});

export async function getServiceGroups() {
  const [services, categories] = await Promise.all([
    getPublicServices(),
    getServiceCategories(),
  ]);

  return categories.map((category) => ({
    ...category,
    services: services.filter((service) => service.category === category.slug),
  }));
}

export async function getServiceCategories() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
    });

    return categories.length
      ? categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
        }))
      : seedCollectionOrEmpty(serviceCategories);
  } catch (error) {
    return fallbackPublicContent("service categories", serviceCategories, error);
  }
}
