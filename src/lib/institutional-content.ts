import { z } from "zod";
import type { InstitutionalPageFormInput } from "@/lib/validations";

export const institutionalPageSlugs = ["nosotros", "proceso"] as const;
export type InstitutionalPageSlug = (typeof institutionalPageSlugs)[number];

const textItemSchema = z.string().trim().min(20).max(420);
const titledItemSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: textItemSchema,
});

export const aboutPayloadSchema = z.object({
  decision: z.object({
    eyebrow: z.string().trim().min(3).max(120),
    title: z.string().trim().min(10).max(180),
    description: textItemSchema,
    items: z.array(textItemSchema).length(4),
  }),
  philosophy: z.object({
    eyebrow: z.string().trim().min(3).max(120),
    title: z.string().trim().min(10).max(180),
    description: textItemSchema,
    items: z.array(titledItemSchema).length(3),
  }),
  team: z.object({
    eyebrow: z.string().trim().min(3).max(120),
    title: z.string().trim().min(10).max(180),
    description: textItemSchema,
  }),
});

export const processPayloadSchema = z.object({
  steps: z.array(titledItemSchema).length(7),
});

export type AboutPagePayload = z.infer<typeof aboutPayloadSchema>;
export type ProcessPagePayload = z.infer<typeof processPayloadSchema>;

type InstitutionalPageBase = {
  slug: InstitutionalPageSlug;
  eyebrow: string;
  title: string;
  introduction: string;
  finalCtaTitle: string;
  finalCtaDescription: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  whatsappMessage: string;
  seoTitle: string;
  seoDescription: string;
};

export type AboutInstitutionalPage = InstitutionalPageBase & {
  slug: "nosotros";
  payload: AboutPagePayload;
};

export type ProcessInstitutionalPage = InstitutionalPageBase & {
  slug: "proceso";
  payload: ProcessPagePayload;
};

export type PublicInstitutionalPage =
  | AboutInstitutionalPage
  | ProcessInstitutionalPage;

export type InstitutionalPageMap = {
  nosotros: AboutInstitutionalPage;
  proceso: ProcessInstitutionalPage;
};

export type InstitutionalPageForSlug<T extends InstitutionalPageSlug> = Extract<
  PublicInstitutionalPage,
  { slug: T }
>;

export type StoredInstitutionalPage = Omit<
  InstitutionalPageBase,
  "slug"
> & {
  slug: string;
  payloadJson: string;
};

export const fallbackInstitutionalPages: InstitutionalPageMap = {
  nosotros: {
    slug: "nosotros",
    eyebrow: "Empresa",
    title: "Arquitectura, obra e interiores con método, criterio y seguimiento.",
    introduction:
      "Arqvia combina mirada de diseño, planificación técnica y seguimiento de obra para acompañar proyectos desde una idea inicial hasta una solución construible. Trabajamos con una metodología clara para transformar ideas en espacios funcionales, bien ejecutados y coherentes con la forma de vivir o trabajar de cada cliente.",
    payload: {
      decision: {
        eyebrow: "Forma de trabajo",
        title: "Cómo tomamos decisiones.",
        description:
          "Analizamos cada proyecto desde el uso real, el presupuesto disponible, la documentación necesaria, la viabilidad constructiva y el mantenimiento futuro. La estética importa, pero siempre vinculada a función, ejecución y tiempo.",
        items: [
          "Coordinamos diseño y obra para que las decisiones puedan ejecutarse.",
          "Definimos alcance antes de presupuestar para reducir ambigüedades.",
          "Registramos prioridades, cambios y próximos pasos durante el proceso.",
          "Evaluamos calidad por uso, durabilidad, terminación y mantenimiento.",
        ],
      },
      philosophy: {
        eyebrow: "Filosofía",
        title:
          "Diseñar con intención, presupuestar con claridad y ejecutar con seguimiento.",
        description:
          "Creemos que un buen proyecto no depende solo de una imagen atractiva. También necesita decisiones claras, documentación precisa, presupuesto ordenado y acompañamiento durante la ejecución.",
        items: [
          {
            title: "Criterio profesional",
            description:
              "Analizamos cada proyecto desde su uso real, ubicación, orientación, presupuesto, mantenimiento y posibilidades constructivas antes de definir una propuesta.",
          },
          {
            title: "Proceso trazable",
            description:
              "Ordenamos etapas, entregables y decisiones para que el cliente sepa qué se está resolviendo en cada momento y qué falta para avanzar.",
          },
          {
            title: "Calidad verificable",
            description:
              "Priorizamos soluciones que puedan construirse correctamente, mantenerse en el tiempo y responder al nivel de terminación esperado.",
          },
        ],
      },
      team: {
        eyebrow: "Equipo",
        title: "Un equipo visible para decisiones importantes.",
        description:
          "Trabajamos con responsables claros en diseño, documentación, interiorismo, dirección y coordinación de obra.",
      },
    },
    finalCtaTitle: "¿Querés saber si podemos acompañar tu proyecto?",
    finalCtaDescription:
      "Contanos en qué etapa estás y qué necesitás resolver. Podemos ayudarte a ordenar alcance, prioridades y próximos pasos.",
    primaryCtaLabel: "Solicitar evaluación con Arqvia",
    secondaryCtaLabel: "Consultar por WhatsApp",
    whatsappMessage:
      "Hola, conocí al equipo y la forma de trabajo de Arqvia y quiero consultar si pueden acompañar mi proyecto.",
    seoTitle: "Nosotros y equipo | Arqvia",
    seoDescription:
      "Conocé el método, la filosofía y el equipo de Arqvia para proyectos de arquitectura, construcción e interiores en Córdoba.",
  },
  proceso: {
    slug: "proceso",
    eyebrow: "Proceso",
    title: "Un método claro para diseñar, presupuestar y ejecutar.",
    introduction:
      "Ordenamos decisiones, documentación, presupuesto y ejecución para que cada etapa tenga un objetivo concreto.",
    payload: {
      steps: [
        {
          title: "Consulta inicial",
          description:
            "Escuchamos la idea, el estado actual del proyecto y los objetivos principales.",
        },
        {
          title: "Relevamiento",
          description:
            "Analizamos terreno, vivienda, local o espacio existente para detectar posibilidades, límites y prioridades.",
        },
        {
          title: "Propuesta de diseño",
          description:
            "Definimos criterios de distribución, materialidad, estética y uso real.",
        },
        {
          title: "Presupuesto y planificación",
          description:
            "Organizamos rubros, etapas, tiempos y decisiones que impactan en el costo final.",
        },
        {
          title: "Documentación técnica",
          description:
            "Preparamos la información necesaria para avanzar con mayor precisión.",
        },
        {
          title: "Obra o supervisión",
          description:
            "Acompañamos la ejecución con seguimiento técnico, coordinación y control de avances.",
        },
        {
          title: "Entrega final",
          description: "Revisamos terminaciones, detalles y cierre del proyecto.",
        },
      ],
    },
    finalCtaTitle: "Empezá con la información que ya tenés.",
    finalCtaDescription:
      "Ubicación, tipo de proyecto, fotos o planos y una idea de tiempos son suficientes para una primera evaluación.",
    primaryCtaLabel: "Coordinar evaluación inicial",
    secondaryCtaLabel: "Consultar por WhatsApp",
    whatsappMessage:
      "Hola, quiero entender el proceso de trabajo de Arqvia para mi proyecto.",
    seoTitle: "Cómo trabajamos | Arqvia",
    seoDescription:
      "Conocé el proceso de Arqvia para proyectos de arquitectura, construcción, remodelación e interiorismo en Córdoba.",
  },
};

export function isInstitutionalPageSlug(
  value: string,
): value is InstitutionalPageSlug {
  return institutionalPageSlugs.includes(value as InstitutionalPageSlug);
}

export function toPublicInstitutionalPage(
  page: StoredInstitutionalPage,
): PublicInstitutionalPage | null {
  if (!isInstitutionalPageSlug(page.slug)) return null;

  try {
    const rawPayload: unknown = JSON.parse(page.payloadJson);
    const payload =
      page.slug === "nosotros"
        ? aboutPayloadSchema.safeParse(rawPayload)
        : processPayloadSchema.safeParse(rawPayload);
    if (!payload.success) return null;

    const base = {
      slug: page.slug,
      eyebrow: page.eyebrow,
      title: page.title,
      introduction: page.introduction,
      finalCtaTitle: page.finalCtaTitle,
      finalCtaDescription: page.finalCtaDescription,
      primaryCtaLabel: page.primaryCtaLabel,
      secondaryCtaLabel: page.secondaryCtaLabel,
      whatsappMessage: page.whatsappMessage,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
    };

    return page.slug === "nosotros"
      ? { ...base, slug: "nosotros", payload: payload.data as AboutPagePayload }
      : { ...base, slug: "proceso", payload: payload.data as ProcessPagePayload };
  } catch {
    return null;
  }
}

export function serializeInstitutionalPage(
  page: PublicInstitutionalPage,
): StoredInstitutionalPage {
  return {
    slug: page.slug,
    eyebrow: page.eyebrow,
    title: page.title,
    introduction: page.introduction,
    payloadJson: JSON.stringify(page.payload),
    finalCtaTitle: page.finalCtaTitle,
    finalCtaDescription: page.finalCtaDescription,
    primaryCtaLabel: page.primaryCtaLabel,
    secondaryCtaLabel: page.secondaryCtaLabel,
    whatsappMessage: page.whatsappMessage,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  };
}

export function institutionalPageFromForm(
  input: InstitutionalPageFormInput,
): PublicInstitutionalPage {
  const base = {
    eyebrow: input.eyebrow,
    title: input.title,
    introduction: input.introduction,
    finalCtaTitle: input.finalCtaTitle,
    finalCtaDescription: input.finalCtaDescription,
    primaryCtaLabel: input.primaryCtaLabel,
    secondaryCtaLabel: input.secondaryCtaLabel,
    whatsappMessage: input.whatsappMessage,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };

  if (input.slug === "nosotros") {
    return {
      ...base,
      slug: "nosotros",
      payload: {
        decision: {
          eyebrow: input.decisionEyebrow,
          title: input.decisionTitle,
          description: input.decisionDescription,
          items: [
            input.decisionItem1,
            input.decisionItem2,
            input.decisionItem3,
            input.decisionItem4,
          ],
        },
        philosophy: {
          eyebrow: input.philosophyEyebrow,
          title: input.philosophyTitle,
          description: input.philosophyDescription,
          items: [1, 2, 3].map((index) => ({
            title: input[
              `philosophyItem${index}Title` as keyof typeof input
            ] as string,
            description: input[
              `philosophyItem${index}Description` as keyof typeof input
            ] as string,
          })),
        },
        team: {
          eyebrow: input.teamEyebrow,
          title: input.teamTitle,
          description: input.teamDescription,
        },
      },
    };
  }

  return {
    ...base,
    slug: "proceso",
    payload: {
      steps: [1, 2, 3, 4, 5, 6, 7].map((index) => ({
        title: input[`processStep${index}Title` as keyof typeof input] as string,
        description: input[
          `processStep${index}Description` as keyof typeof input
        ] as string,
      })),
    },
  };
}
