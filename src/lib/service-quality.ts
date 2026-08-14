export type ServiceQualityInput = {
  audience: string;
  benefits: string;
  categoryName: string;
  coverImage: string;
  description: string;
  faq: string;
  faqCount?: number;
  included: string;
  mainBenefit: string;
  process: string;
  projectCount?: number;
  seoDescription: string;
  seoTitle: string;
  shortDescription: string;
  title: string;
  whatsappMessage: string;
};

export type ServiceQualityResult = {
  badgeClassName: string;
  label: string;
  missing: string[];
  score: number;
  status: "strong" | "review" | "weak";
};

function hasEnoughText(value: string, minLength: number) {
  return value.trim().length >= minLength;
}

function countLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

export function countServiceFaqItems(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return 0;

    return parsed.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "question" in item &&
        "answer" in item &&
        hasEnoughText(String((item as { question: unknown }).question), 12) &&
        hasEnoughText(String((item as { answer: unknown }).answer), 35),
    ).length;
  } catch {
    return 0;
  }
}

export function evaluateServiceQuality(
  service: ServiceQualityInput,
): ServiceQualityResult {
  const faqItems = Math.max(
    countServiceFaqItems(service.faq),
    service.faqCount || 0,
  );
  const missing: string[] = [];

  const checks = [
    {
      ok:
        hasEnoughText(service.title, 6) &&
        hasEnoughText(service.shortDescription, 60) &&
        hasEnoughText(service.description, 120),
      label: "Copy principal suficiente",
    },
    {
      ok:
        hasEnoughText(service.mainBenefit, 55) &&
        hasEnoughText(service.audience, 45),
      label: "Beneficio y público objetivo claros",
    },
    {
      ok: countLines(service.included) >= 4 && countLines(service.process) >= 4,
      label: "Incluye alcance y proceso desarrollados",
    },
    {
      ok: hasEnoughText(service.benefits, 60),
      label: "Beneficios comerciales desarrollados",
    },
    {
      ok: faqItems >= 2,
      label: "FAQ con al menos dos respuestas útiles",
    },
    {
      ok:
        hasEnoughText(service.whatsappMessage, 45) &&
        !/\b(?:servicio|consulta)\.?$/i.test(service.whatsappMessage.trim()),
      label: "Mensaje de WhatsApp específico",
    },
    {
      ok:
        hasEnoughText(service.seoTitle, 35) &&
        hasEnoughText(service.seoDescription, 90),
      label: "SEO title y description específicos",
    },
    {
      ok: Boolean(service.coverImage.trim()),
      label: "Imagen principal cargada",
    },
    {
      ok: (service.projectCount || 0) > 0,
      label: "Proyecto relacionado para dar prueba de trabajo",
    },
  ];

  for (const check of checks) {
    if (!check.ok) missing.push(check.label);
  }

  const score = Math.round(
    ((checks.length - missing.length) / checks.length) * 100,
  );
  const status =
    missing.length === 0 ? "strong" : score >= 60 ? "review" : "weak";

  return {
    badgeClassName:
      status === "strong"
        ? "border-olive/25 bg-olive/10 text-olive"
        : status === "review"
          ? "border-bronze/25 bg-bronze/10 text-bronze"
          : "border-red-300 bg-red-50 text-red-700",
    label:
      status === "strong"
        ? "Lista para vender"
        : status === "review"
          ? "Revisar antes de publicar"
          : "Contenido débil",
    missing,
    score,
    status,
  };
}
