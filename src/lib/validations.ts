import { z } from "zod";
import { isAllowedPublicImageSource } from "@/lib/public-image-source";
import {
  technicalVisitStatusValues,
  visitWindowValues,
} from "@/lib/technical-visit-config";
import { estimateTierValues } from "@/lib/estimator";

// Keep client-side validation compatible with the production CSP. Without
// this flag Zod probes `Function("")` before falling back to its safe parser.
z.config({ jitless: true });

const phoneRegex = /^[+()\d\s-]{7,24}$/;
const BCRYPT_MAX_PASSWORD_BYTES = 72;

function isBcryptPasswordLengthValid(value: string) {
  return new TextEncoder().encode(value).byteLength <= BCRYPT_MAX_PASSWORD_BYTES;
}

const bcryptPassword = z.string().refine(isBcryptPasswordLengthValid, {
  message: "La contraseña no puede superar los 72 bytes UTF-8",
});

const adminPassword = bcryptPassword
  .refine((value) => !value || /[a-z]/.test(value), {
    message: "Incluí al menos una letra minúscula",
  })
  .refine((value) => !value || /[A-Z]/.test(value), {
    message: "Incluí al menos una letra mayúscula",
  })
  .refine((value) => !value || /\d/.test(value), {
    message: "Incluí al menos un número",
  })
  .refine((value) => !value || /[^A-Za-z0-9]/.test(value), {
    message: "Incluí al menos un símbolo",
  });

const formBoolean = z.preprocess((value) => {
  if (value === true || value === "true" || value === "1" || value === "on") {
    return true;
  }
  if (
    value === false ||
    value === "false" ||
    value === "0" ||
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return false;
  }
  return value;
}, z.boolean());

function currentCordobaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
  }).format(new Date());
}

const optionalEstimatorArea = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  z
    .number()
    .int("La superficie debe ser un número entero")
    .min(10, "La superficie mínima para estimar es 10 m²")
    .max(2000, "La superficie máxima para estimar es 2.000 m²")
    .optional(),
);

const optionalEstimateTier = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.enum(estimateTierValues).optional(),
);

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre completo").max(120),
  email: z.string().trim().email("Ingresá un email válido").max(160),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Ingresá un WhatsApp válido")
    .refine(
      (value) => value.replace(/\D/g, "").length >= 7,
      "Ingresá un WhatsApp con al menos 7 números",
    ),
  city: z.string().trim().min(2, "Indicá ciudad o zona").max(120),
  clientType: z.string().trim().max(80).optional().or(z.literal("")),
  projectType: z.string().trim().min(2, "Seleccioná el tipo de proyecto").max(120),
  currentStatus: z.string().trim().max(120).optional().or(z.literal("")),
  areaM2: z.string().trim().max(80).optional().or(z.literal("")),
  budgetRange: z.string().trim().max(120).optional().or(z.literal("")),
  estimateRuleId: z.string().trim().max(80).optional().or(z.literal("")),
  estimateTier: optionalEstimateTier,
  estimateAreaM2: optionalEstimatorArea,
  estimateConfigVersion: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? undefined
        : Number(value),
    z.number().int().min(1).optional(),
  ),
  startDate: z.string().trim().max(120).optional().or(z.literal("")),
  needsVisit: formBoolean.default(false),
  visitPreferredDate: z
    .string()
    .trim()
    .refine(
      (value) => !value || isValidIsoDate(value),
      "Elegí una fecha válida",
    )
    .refine(
      (value) => !value || value >= currentCordobaDate(),
      "Elegí una fecha de hoy en adelante",
    )
    .optional()
    .or(z.literal("")),
  visitPreferredWindow: z.enum(visitWindowValues).default("FLEXIBLE"),
  visitAddress: z.string().trim().max(180).optional().or(z.literal("")),
  visitNotes: z.string().trim().max(500).optional().or(z.literal("")),
  hasPlans: formBoolean.default(false),
  referenceLinks: z.string().trim().max(900).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Contanos brevemente qué necesitás resolver")
    .max(1600),
  sourcePage: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .regex(/^\/[a-z0-9\-/?=&%#]*$/i, "Origen inválido"),
  website: z.string().trim().max(120).optional().default(""),
}).superRefine((value, ctx) => {
  const hasEstimate = Boolean(
    value.estimateRuleId ||
      value.estimateTier ||
      value.estimateAreaM2 ||
      value.estimateConfigVersion,
  );
  if (!hasEstimate) return;

  if (!value.estimateRuleId) {
    ctx.addIssue({
      code: "custom",
      message: "Seleccioná el tipo de proyecto del estimador",
      path: ["estimateRuleId"],
    });
  }
  if (!value.estimateTier) {
    ctx.addIssue({
      code: "custom",
      message: "Seleccioná el nivel de terminación",
      path: ["estimateTier"],
    });
  }
  if (!value.estimateAreaM2) {
    ctx.addIssue({
      code: "custom",
      message: "Indicá la superficie estimada",
      path: ["estimateAreaM2"],
    });
  }
  if (!value.estimateConfigVersion) {
    ctx.addIssue({
      code: "custom",
      message: "La versión del estimador es inválida",
      path: ["estimateConfigVersion"],
    });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: bcryptPassword.min(
    8,
    "La contraseña debe tener al menos 8 caracteres",
  ),
});

export const leadStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "WON", "LOST"]),
});

export const leadContactSchema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL"]),
});

export const leadNoteSchema = z.object({
  leadId: z.string().trim().min(1, "Consulta inválida"),
  body: z
    .string()
    .trim()
    .min(4, "Agrega una nota con algo de contexto")
    .max(1200, "La nota no puede superar 1200 caracteres"),
});

const optionalCommercialAmount = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce
    .number()
    .int("Ingresá un monto entero en USD")
    .min(0, "El monto no puede ser negativo")
    .max(100_000_000, "Revisá el monto ingresado")
    .optional(),
);

export const leadCommercialProfileSchema = z.object({
  leadId: z.string().trim().min(1, "Consulta inválida"),
  assignedUserId: z.string().trim().optional().or(z.literal("")),
  nextFollowUpAt: z
    .string()
    .trim()
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      "Elegí una fecha y hora válidas",
    )
    .optional()
    .or(z.literal("")),
  quotedAmountUsd: optionalCommercialAmount,
  wonAmountUsd: optionalCommercialAmount,
  lostReason: z
    .string()
    .trim()
    .max(500, "El motivo no puede superar 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type LeadCommercialProfileInput = z.infer<
  typeof leadCommercialProfileSchema
>;

export const technicalVisitAdminSchema = z
  .object({
    leadId: z.string().trim().min(1, "Consulta inválida"),
    status: z.enum(technicalVisitStatusValues),
    scheduledDate: z
      .string()
      .trim()
      .refine(
        (value) => !value || isValidIsoDate(value),
        "Elegí una fecha válida",
      )
      .optional()
      .or(z.literal("")),
    scheduledTime: z
      .string()
      .trim()
      .regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, "Elegí un horario válido"),
    durationMinutes: z.coerce
      .number()
      .int()
      .min(30, "La visita debe durar al menos 30 minutos")
      .max(240, "La visita no puede superar 4 horas"),
    address: z.string().trim().max(180).optional().or(z.literal("")),
    assignedUserId: z.string().trim().optional().or(z.literal("")),
    internalNotes: z.string().trim().max(900).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (
      ["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(value.status) &&
      (!value.scheduledDate || !value.scheduledTime)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá fecha y hora para este estado",
        path: ["scheduledDate"],
      });
    }
  });

export type TechnicalVisitAdminInput = z.infer<
  typeof technicalVisitAdminSchema
>;

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usá un color hexadecimal válido, por ejemplo #1c211d");

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => !value || isAbsoluteUrl(value), "Usá una URL válida, por ejemplo https://arqvia.com")
  .optional()
  .or(z.literal(""));

const optionalUrlOrPath = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || isAllowedPublicImageSource(value),
    "Usá una ruta pública local o una URL del almacenamiento configurado",
  )
  .optional()
  .or(z.literal(""));

const requiredUrlOrPath = z
  .string()
  .trim()
  .min(4, "Indicá una ruta o URL de imagen")
  .max(500)
  .refine(
    isAllowedPublicImageSource,
    "Usá una ruta pública local o una URL del almacenamiento configurado",
  );

const gallerySchema = z
  .string()
  .trim()
  .min(4, "Agregá al menos una imagen")
  .max(6000)
  .refine(
    hasValidGalleryPaths,
    "Cada línea de galería debe usar una ruta pública local o una URL del almacenamiento configurado",
  );

const whatsappNumber = z
  .string()
  .trim()
  .max(40)
  .refine(
    (value) =>
      !value ||
      (/^\+?[0-9\s().-]+$/.test(value) &&
        value.replace(/\D/g, "").length >= 8 &&
        value.replace(/\D/g, "").length <= 15),
    "Ingresá un número de WhatsApp válido con código de país y área",
  )
  .optional()
  .or(z.literal(""));

export const clientConfigSchema = z.object({
  companyName: z.string().trim().min(2, "Ingresá el nombre de la empresa").max(120),
  logoUrl: optionalUrlOrPath,
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  fontHeading: z.enum(["Newsreader", "Cormorant Garamond", "Georgia", "Times New Roman"]),
  fontBody: z.enum(["Manrope", "Inter", "System UI", "Arial"]),
  whatsapp: whatsappNumber,
  phone: z.string().trim().min(6, "Ingresá un teléfono").max(60),
  email: z.string().trim().email("Ingresá un email válido").max(160),
  address: z.string().trim().min(4, "Ingresá una dirección o zona").max(180),
  businessHours: z.string().trim().min(4, "Ingresá horarios de atención").max(180),
  instagramUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  facebookUrl: optionalUrl,
  heroTitle: z.string().trim().min(12, "El título debe ser más específico").max(180),
  heroSubtitle: z.string().trim().min(20, "La bajada debe explicar la propuesta").max(360),
  heroImage: requiredUrlOrPath,
  primaryCtaLabel: z.string().trim().min(3).max(50),
  secondaryCtaLabel: z.string().trim().min(3).max(50),
});

export type ClientConfigInput = z.infer<typeof clientConfigSchema>;

const homeShortText = z.string().trim().min(3, "Completá este texto").max(120);
const homeSectionTitle = z
  .string()
  .trim()
  .min(10, "El título necesita más contexto")
  .max(180);
const homeDescription = z
  .string()
  .trim()
  .min(20, "La descripción necesita más contexto")
  .max(420);

export const homeContentFormSchema = z.object({
  heroEyebrow: z
    .string()
    .trim()
    .min(8, "Ingresá una categoría clara")
    .max(100),
  heroImageAlt: z
    .string()
    .trim()
    .min(20, "Describí la imagen para lectores de pantalla")
    .max(220),
  heroTrustItem1: homeShortText,
  heroTrustItem2: homeShortText,
  heroTrustItem3: homeShortText,
  metric1Value: z.string().trim().min(1, "Ingresá el valor").max(24),
  metric1Label: homeShortText,
  metric2Value: z.string().trim().min(1, "Ingresá el valor").max(24),
  metric2Label: homeShortText,
  metric3Value: z.string().trim().min(1, "Ingresá el valor").max(24),
  metric3Label: homeShortText,
  metric4Value: z.string().trim().min(1, "Ingresá el valor").max(24),
  metric4Label: homeShortText,
  projectsTitle: homeSectionTitle,
  servicesTitle: homeSectionTitle,
  servicesDescription: homeDescription,
  beforeAfterTitle: homeSectionTitle,
  beforeAfterDescription: homeDescription,
  processTitle: homeSectionTitle,
  processReason1: homeShortText,
  processReason2: homeShortText,
  processReason3: homeShortText,
  processStep1Title: homeShortText,
  processStep1Description: homeDescription,
  processStep2Title: homeShortText,
  processStep2Description: homeDescription,
  processStep3Title: homeShortText,
  processStep3Description: homeDescription,
  processStep4Title: homeShortText,
  processStep4Description: homeDescription,
  finalCtaTitle: homeSectionTitle,
  finalCtaDescription: homeDescription,
  seoTitle: z.string().trim().min(20, "Ingresá un título SEO claro").max(70),
  seoDescription: z
    .string()
    .trim()
    .min(70, "La descripción SEO necesita al menos 70 caracteres")
    .max(180),
});

export type HomeContentFormInput = z.infer<typeof homeContentFormSchema>;

const institutionalBaseFields = {
  eyebrow: z.string().trim().min(3, "Ingresá una categoría").max(80),
  title: z.string().trim().min(12, "El título necesita más contexto").max(200),
  introduction: z
    .string()
    .trim()
    .min(40, "La introducción necesita más desarrollo")
    .max(900),
  finalCtaTitle: homeSectionTitle,
  finalCtaDescription: homeDescription,
  primaryCtaLabel: z.string().trim().min(4, "Ingresá el CTA principal").max(70),
  secondaryCtaLabel: z
    .string()
    .trim()
    .min(4, "Ingresá el CTA secundario")
    .max(70),
  whatsappMessage: z
    .string()
    .trim()
    .min(20, "El mensaje necesita más contexto")
    .max(360),
  seoTitle: z.string().trim().min(8, "Ingresá el título SEO").max(70),
  seoDescription: z
    .string()
    .trim()
    .min(70, "La descripción SEO necesita al menos 70 caracteres")
    .max(180),
};

const aboutPageFormSchema = z.object({
  slug: z.literal("nosotros"),
  ...institutionalBaseFields,
  decisionEyebrow: homeShortText,
  decisionTitle: homeSectionTitle,
  decisionDescription: homeDescription,
  decisionItem1: homeDescription,
  decisionItem2: homeDescription,
  decisionItem3: homeDescription,
  decisionItem4: homeDescription,
  philosophyEyebrow: homeShortText,
  philosophyTitle: homeSectionTitle,
  philosophyDescription: homeDescription,
  philosophyItem1Title: homeShortText,
  philosophyItem1Description: homeDescription,
  philosophyItem2Title: homeShortText,
  philosophyItem2Description: homeDescription,
  philosophyItem3Title: homeShortText,
  philosophyItem3Description: homeDescription,
  teamEyebrow: homeShortText,
  teamTitle: homeSectionTitle,
  teamDescription: homeDescription,
});

const processPageFormSchema = z.object({
  slug: z.literal("proceso"),
  ...institutionalBaseFields,
  processStep1Title: homeShortText,
  processStep1Description: homeDescription,
  processStep2Title: homeShortText,
  processStep2Description: homeDescription,
  processStep3Title: homeShortText,
  processStep3Description: homeDescription,
  processStep4Title: homeShortText,
  processStep4Description: homeDescription,
  processStep5Title: homeShortText,
  processStep5Description: homeDescription,
  processStep6Title: homeShortText,
  processStep6Description: homeDescription,
  processStep7Title: homeShortText,
  processStep7Description: homeDescription,
});

export const institutionalPageFormSchema = z.discriminatedUnion("slug", [
  aboutPageFormSchema,
  processPageFormSchema,
]);

export type InstitutionalPageFormInput = z.infer<
  typeof institutionalPageFormSchema
>;

export const estimateConfigSchema = z
  .object({
    enabled: formBoolean.default(false),
    headline: z.string().trim().min(12, "Ingresá un título claro").max(140),
    description: z
      .string()
      .trim()
      .min(24, "Explicá qué calcula el estimador")
      .max(420),
    disclaimer: z
      .string()
      .trim()
      .min(40, "El aviso debe explicar los límites del rango")
      .max(900),
    essentialMultiplier: z.coerce.number().min(0.5).max(3),
    balancedMultiplier: z.coerce.number().min(0.5).max(3),
    premiumMultiplier: z.coerce.number().min(0.5).max(3),
  })
  .refine(
    (value) =>
      value.essentialMultiplier <= value.balancedMultiplier &&
      value.balancedMultiplier <= value.premiumMultiplier,
    {
      message: "Los multiplicadores deben crecer de Esencial a Superior",
      path: ["balancedMultiplier"],
    },
  );

export type EstimateConfigInput = z.infer<typeof estimateConfigSchema>;

export const estimateRuleSchema = z
  .object({
    id: z.string().trim().optional().or(z.literal("")),
    key: z
      .string()
      .trim()
      .min(3, "Ingresá una clave")
      .max(80)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Usá una clave como remodelacion-integral",
      ),
    label: z.string().trim().min(3, "Ingresá un nombre").max(120),
    description: z
      .string()
      .trim()
      .min(20, "Explicá qué contempla esta categoría")
      .max(420),
    minUsdPerM2: z.coerce.number().int().min(1).max(10000),
    maxUsdPerM2: z.coerce.number().int().min(1).max(10000),
    minimumProjectUsd: z.coerce.number().int().min(0).max(10000000),
    active: formBoolean.default(false),
    sortOrder: z.coerce.number().int().min(0).max(9999),
  })
  .refine((value) => value.minUsdPerM2 <= value.maxUsdPerM2, {
    message: "El máximo por m² debe ser mayor o igual al mínimo",
    path: ["maxUsdPerM2"],
  });

export type EstimateRuleInput = z.infer<typeof estimateRuleSchema>;

export const projectFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  publicationStatus: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  title: z.string().trim().min(3, "Ingresá un título").max(140),
  slug: z
    .string()
    .trim()
    .min(3, "Ingresá un slug")
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá un slug limpio, por ejemplo casa-patio-norte"),
  summary: z.string().trim().min(20, "El resumen debe explicar el proyecto").max(420),
  description: z.string().trim().min(20, "Ingresá una descripción").max(1600),
  location: z.string().trim().min(2, "Indicá la ubicación").max(120),
  year: z.string().trim().min(4, "Indicá el año").max(20),
  areaM2: z.coerce.number().int().min(1, "Indicá la superficie").max(100000),
  status: z.string().trim().min(2, "Indicá el estado").max(80),
  clientType: z.string().trim().min(2, "Indicá el tipo de cliente").max(120),
  servicePerformed: z.string().trim().min(3, "Indicá el servicio realizado").max(160),
  coverImage: requiredUrlOrPath,
  gallery: gallerySchema,
  challenge: z.string().trim().min(10, "Describí el desafío").max(1600),
  solution: z.string().trim().min(10, "Describí la solución").max(1600),
  process: z.string().trim().min(10, "Describí el proceso").max(1600),
  result: z.string().trim().min(10, "Describí el resultado").max(1600),
  optimized: z.string().trim().min(4, "Indicá qué se optimizó").max(600),
  specialNote: z.string().trim().min(4, "Indicá qué lo hizo especial").max(600),
  materials: z.string().trim().min(3, "Indicá materiales").max(600),
  duration: z.string().trim().min(2, "Indicá duración").max(120),
  constructionSystem: z.string().trim().min(2, "Indicá sistema constructivo").max(160),
  currentStage: z.string().trim().min(2, "Indicá etapa actual").max(120),
  responsibleTeam: z.string().trim().min(2, "Indicá equipo responsable").max(160),
  architectDirector: z.string().trim().min(2, "Indicá responsable técnico").max(160),
  supplier: z.string().trim().max(160).optional().or(z.literal("")),
  budgetRange: z.string().trim().max(160).optional().or(z.literal("")),
  featured: formBoolean.default(false),
  categoryId: z.string().trim().min(1, "Elegí categoría"),
  serviceId: z.string().trim().optional().or(z.literal("")),
  seoTitle: z.string().trim().min(8, "Ingresá SEO title").max(180),
  seoDescription: z.string().trim().min(20, "Ingresá SEO description").max(260),
  seoCategory: z.string().trim().min(2, "Indicá categoría SEO").max(120),
  imageAlt: z.string().trim().min(8, "Ingresá texto alternativo").max(180),
});

export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const serviceFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  publicationStatus: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  title: z.string().trim().min(3, "Ingresá un título").max(140),
  slug: z
    .string()
    .trim()
    .min(3, "Ingresá un slug")
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá un slug limpio, por ejemplo construccion-llave-en-mano"),
  categoryId: z.string().trim().min(1, "Elegí categoría"),
  icon: z.string().trim().min(2, "Elegí un icono").max(80),
  shortDescription: z.string().trim().min(12, "Ingresá una descripción corta").max(320),
  description: z.string().trim().min(20, "Ingresá una descripción").max(1400),
  coverImage: requiredUrlOrPath,
  mainBenefit: z.string().trim().min(10, "Indicá el beneficio principal").max(600),
  audience: z.string().trim().min(10, "Indicá para quién es").max(600),
  benefits: z.string().trim().min(10, "Indicá beneficios comerciales").max(1200),
  included: z.string().trim().min(4, "Agregá qué incluye").max(2200),
  process: z.string().trim().min(4, "Agregá pasos del proceso").max(2200),
  faq: z.string().trim().min(4, "Agregá al menos una pregunta frecuente").max(2200),
  whatsappMessage: z.string().trim().min(10, "Agregá mensaje de WhatsApp").max(320),
  featured: formBoolean.default(false),
  seoTitle: z.string().trim().min(8, "Ingresá SEO title").max(180),
  seoDescription: z.string().trim().min(20, "Ingresá SEO description").max(260),
});

export type ServiceFormInput = z.infer<typeof serviceFormSchema>;

export const blogPostFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(5, "Ingresá un título").max(180),
  slug: z
    .string()
    .trim()
    .min(3, "Ingresá un slug")
    .max(180)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Usá un slug limpio, por ejemplo construccion-llave-en-mano",
    ),
  excerpt: z.string().trim().min(20, "Ingresá una bajada").max(420),
  content: z.string().trim().min(80, "El contenido debe tener más desarrollo").max(12000),
  coverImage: requiredUrlOrPath,
  category: z.string().trim().min(2, "Indicá categoría").max(80),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  seoTitle: z.string().trim().min(8, "Ingresá SEO title").max(180),
  seoDescription: z.string().trim().min(20, "Ingresá SEO description").max(260),
});

export type BlogPostFormInput = z.infer<typeof blogPostFormSchema>;

export const legalPageFormSchema = z
  .object({
    slug: z.enum(["privacidad", "terminos", "cookies", "aviso-presupuestos"]),
    title: z.string().trim().min(5, "Ingresá un título claro").max(180),
    summary: z.string().trim().min(20, "La bajada necesita más contexto").max(420),
    content: z
      .string()
      .trim()
      .min(120, "El documento necesita más desarrollo")
      .max(30000),
    status: z.enum(["DRAFT", "PUBLISHED"]),
    seoTitle: z.string().trim().min(8, "Ingresá el título SEO").max(180),
    seoDescription: z
      .string()
      .trim()
      .min(20, "Ingresá la descripción SEO")
      .max(260),
    reviewedBy: z.string().trim().max(160).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.status === "PUBLISHED" && !value.reviewedBy) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá quién revisó el documento antes de publicarlo",
        path: ["reviewedBy"],
      });
    }
  });

export type LegalPageFormInput = z.infer<typeof legalPageFormSchema>;

export const faqFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  question: z.string().trim().min(8, "Ingresá una pregunta clara").max(220),
  answer: z.string().trim().min(20, "La respuesta necesita más contexto").max(1800),
  category: z.string().trim().min(2, "Indicá una categoría").max(80),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: formBoolean.default(false),
  relatedServiceId: z.string().trim().optional().or(z.literal("")),
});

export type FaqFormInput = z.infer<typeof faqFormSchema>;

export const testimonialFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Ingresá el nombre del cliente").max(120),
  role: z.string().trim().max(160).optional().or(z.literal("")),
  projectType: z.string().trim().min(3, "Indicá el tipo de proyecto").max(140),
  location: z.string().trim().min(2, "Indicá la ubicación").max(120),
  quote: z.string().trim().min(30, "El testimonio necesita más contexto").max(900),
  imageUrl: optionalUrlOrPath,
  projectId: z.string().trim().optional().or(z.literal("")),
  featured: formBoolean.default(false),
});

export type TestimonialFormInput = z.infer<typeof testimonialFormSchema>;

export const teamMemberFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Ingresá el nombre").max(120),
  role: z.string().trim().min(2, "Ingresá el rol").max(140),
  specialty: z.string().trim().min(2, "Ingresá la especialidad").max(160),
  licenseNumber: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().min(20, "La bio necesita más contexto").max(900),
  imageUrl: requiredUrlOrPath,
  linkedinUrl: optionalUrl,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: formBoolean.default(false),
});

export type TeamMemberFormInput = z.infer<typeof teamMemberFormSchema>;

export const areaFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Ingresá el nombre del área").max(120),
  slug: z
    .string()
    .trim()
    .min(3, "Ingresá un slug")
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá un slug limpio, por ejemplo zona-norte-cordoba"),
  description: z.string().trim().min(20, "La descripción necesita más contexto").max(900),
  seoTitle: z.string().trim().min(8, "Ingresá SEO title").max(180),
  seoDescription: z.string().trim().min(20, "Ingresá SEO description").max(260),
  active: formBoolean.default(false),
});

export type AreaFormInput = z.infer<typeof areaFormSchema>;

export const categoryFormSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  type: z.enum(["project", "service"]),
  name: z.string().trim().min(2, "Ingresá el nombre").max(120),
  slug: z
    .string()
    .trim()
    .min(3, "Ingresá un slug")
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá un slug limpio, por ejemplo remodelaciones"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const adminUserFormSchema = z
  .object({
    id: z.string().optional().or(z.literal("")),
    updatedAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
    name: z.string().trim().min(2, "Ingresá el nombre").max(120),
    email: z.string().trim().email("Ingresá un email válido").max(160),
    password: adminPassword.optional().or(z.literal("")),
    role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
    active: formBoolean.default(false),
  })
  .superRefine((value, ctx) => {
    if (value.id && !value.updatedAt) {
      ctx.addIssue({
        code: "custom",
        message: "Recargá el usuario antes de guardar cambios",
        path: ["updatedAt"],
      });
    }

    if (!value.id && (!value.password || value.password.trim().length < 12)) {
      ctx.addIssue({
        code: "custom",
        message: "La contraseña debe tener al menos 12 caracteres",
        path: ["password"],
      });
    }

    if (
      value.password &&
      value.password.length > 0 &&
      value.password.trim().length < 12
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La contraseña debe tener al menos 12 caracteres",
        path: ["password"],
      });
    }
  });

export type AdminUserFormInput = z.infer<typeof adminUserFormSchema>;

function isAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function hasValidGalleryPaths(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .every((line) => {
      const [url] = line.split("|").map((part) => part.trim());
      return isAllowedPublicImageSource(url);
    });
}
