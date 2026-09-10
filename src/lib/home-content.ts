import { z } from "zod";
import type { HomeContentFormInput } from "@/lib/validations";

export const HOME_CONTENT_ID = "arqvia-home";

const trustItemSchema = z.string().trim().min(3).max(120);
export const homeTrustItemsSchema = z.array(trustItemSchema).length(3);

export const homeTrustMetricsSchema = z
  .array(
    z.object({
      value: z.string().trim().min(1).max(24),
      label: z.string().trim().min(3).max(120),
    }),
  )
  .length(4);

export const homeProcessReasonsSchema = z.array(trustItemSchema).length(3);

export const homeProcessStepsSchema = z
  .array(
    z.object({
      title: z.string().trim().min(3).max(120),
      description: z.string().trim().min(20).max(420),
    }),
  )
  .length(4);

export type HomeTrustMetric = z.infer<typeof homeTrustMetricsSchema>[number];
export type HomeProcessStep = z.infer<typeof homeProcessStepsSchema>[number];

export type PublicHomeContent = {
  heroEyebrow: string;
  heroImageAlt: string;
  heroTrustItems: string[];
  trustMetrics: HomeTrustMetric[];
  servicesTitle: string;
  servicesDescription: string;
  beforeAfterTitle: string;
  beforeAfterDescription: string;
  processTitle: string;
  processReasons: string[];
  processSteps: HomeProcessStep[];
  finalCtaTitle: string;
  finalCtaDescription: string;
  seoTitle: string;
  seoDescription: string;
};

/**
 * La columna `projectsTitle` sigue existiendo en la base aunque la home ya no
 * tenga sección de proyectos: la portada es el índice de obra. No se borra
 * para no forzar una migración por un campo que nadie lee; al guardar se
 * escribe un valor fijo y al leer se ignora.
 */
const LEGACY_PROJECTS_TITLE = "Obras terminadas. Resultados concretos.";

export type StoredHomeContent = Omit<
  PublicHomeContent,
  "heroTrustItems" | "trustMetrics" | "processReasons" | "processSteps"
> & {
  projectsTitle: string;
  heroTrustItemsJson: string;
  trustMetricsJson: string;
  processReasonsJson: string;
  processStepsJson: string;
};

export const fallbackHomeContent: PublicHomeContent = {
  heroEyebrow: "ARQUITECTURA, OBRA E INTERIORES",
  heroImageAlt:
    "Vivienda contemporánea de hormigón, madera y grandes ventanales presentada como una lámina arquitectónica",
  heroTrustItems: [
    "Presupuesto por etapas",
    "Dirección técnica",
    "Comunicación clara",
  ],
  trustMetrics: [
    { value: "+45", label: "Proyectos completados" },
    { value: "+12", label: "Años de experiencia" },
    { value: "+18.000", label: "m² diseñados/intervenidos" },
    { value: "7", label: "Zonas de trabajo" },
  ],
  servicesTitle: "Diseñamos, construimos y transformamos espacios.",
  servicesDescription:
    "Podemos resolver una etapa puntual o acompañar el proyecto completo.",
  beforeAfterTitle: "El mismo espacio, antes y después.",
  beforeAfterDescription:
    "Comparamos el mismo baño desde un encuadre equivalente para mostrar cómo cambian los materiales, la iluminación y el uso cotidiano.",
  processTitle: "Un camino claro desde la consulta hasta la entrega.",
  processReasons: [
    "Diseño y ejecución en un solo equipo",
    "Presupuesto organizado por etapas",
    "Seguimiento técnico durante la obra",
  ],
  processSteps: [
    {
      title: "Nos contás el proyecto",
      description:
        "Ubicación, tipo de obra, superficie y momento en el que estás.",
    },
    {
      title: "Evaluamos el punto de partida",
      description:
        "Revisamos necesidades, documentación y condiciones del lugar.",
    },
    {
      title: "Definimos alcance y presupuesto",
      description:
        "Ordenamos etapas, tiempos y decisiones antes de ejecutar.",
    },
    {
      title: "Construimos y acompañamos",
      description:
        "Coordinamos la obra y mantenemos una comunicación clara.",
    },
  ],
  finalCtaTitle: "¿Tenés un proyecto en mente?",
  finalCtaDescription:
    "Contanos qué querés construir, remodelar o desarrollar. Te ayudamos a definir el próximo paso.",
  seoTitle: "Arquitectura, construcción e interiores en Córdoba",
  seoDescription:
    "Arqvia diseña, planifica y acompaña proyectos residenciales y comerciales en Córdoba, desde la primera idea hasta la entrega final.",
};

function parseJson<T>(value: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function toPublicHomeContent(
  content: StoredHomeContent,
): PublicHomeContent | null {
  const heroTrustItems = parseJson(
    content.heroTrustItemsJson,
    homeTrustItemsSchema,
  );
  const trustMetrics = parseJson(
    content.trustMetricsJson,
    homeTrustMetricsSchema,
  );
  const processReasons = parseJson(
    content.processReasonsJson,
    homeProcessReasonsSchema,
  );
  const processSteps = parseJson(
    content.processStepsJson,
    homeProcessStepsSchema,
  );

  if (!heroTrustItems || !trustMetrics || !processReasons || !processSteps) {
    return null;
  }

  return {
    heroEyebrow: content.heroEyebrow,
    heroImageAlt: content.heroImageAlt,
    heroTrustItems,
    trustMetrics,
    servicesTitle: content.servicesTitle,
    servicesDescription: content.servicesDescription,
    beforeAfterTitle: content.beforeAfterTitle,
    beforeAfterDescription: content.beforeAfterDescription,
    processTitle: content.processTitle,
    processReasons,
    processSteps,
    finalCtaTitle: content.finalCtaTitle,
    finalCtaDescription: content.finalCtaDescription,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
  };
}

export function serializeHomeContent(content: PublicHomeContent): StoredHomeContent {
  return {
    projectsTitle: LEGACY_PROJECTS_TITLE,
    heroEyebrow: content.heroEyebrow,
    heroImageAlt: content.heroImageAlt,
    heroTrustItemsJson: JSON.stringify(content.heroTrustItems),
    trustMetricsJson: JSON.stringify(content.trustMetrics),
    servicesTitle: content.servicesTitle,
    servicesDescription: content.servicesDescription,
    beforeAfterTitle: content.beforeAfterTitle,
    beforeAfterDescription: content.beforeAfterDescription,
    processTitle: content.processTitle,
    processReasonsJson: JSON.stringify(content.processReasons),
    processStepsJson: JSON.stringify(content.processSteps),
    finalCtaTitle: content.finalCtaTitle,
    finalCtaDescription: content.finalCtaDescription,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
  };
}

export function homeContentFromForm(
  input: HomeContentFormInput,
): PublicHomeContent {
  return {
    heroEyebrow: input.heroEyebrow,
    heroImageAlt: input.heroImageAlt,
    heroTrustItems: [
      input.heroTrustItem1,
      input.heroTrustItem2,
      input.heroTrustItem3,
    ],
    trustMetrics: [1, 2, 3, 4].map((index) => ({
      value: input[`metric${index}Value` as keyof HomeContentFormInput] as string,
      label: input[`metric${index}Label` as keyof HomeContentFormInput] as string,
    })),
    servicesTitle: input.servicesTitle,
    servicesDescription: input.servicesDescription,
    beforeAfterTitle: input.beforeAfterTitle,
    beforeAfterDescription: input.beforeAfterDescription,
    processTitle: input.processTitle,
    processReasons: [
      input.processReason1,
      input.processReason2,
      input.processReason3,
    ],
    processSteps: [1, 2, 3, 4].map((index) => ({
      title: input[
        `processStep${index}Title` as keyof HomeContentFormInput
      ] as string,
      description: input[
        `processStep${index}Description` as keyof HomeContentFormInput
      ] as string,
    })),
    finalCtaTitle: input.finalCtaTitle,
    finalCtaDescription: input.finalCtaDescription,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
}
