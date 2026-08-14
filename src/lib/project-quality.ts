export type ProjectQualityImage = {
  altText?: string | null;
  caption?: string | null;
  type: string;
};

export type ProjectQualityInput = {
  categoryName: string;
  challenge: string;
  constructionSystem: string;
  coverImage: string;
  description: string;
  duration: string;
  imageAlt: string;
  images: ProjectQualityImage[];
  materials: string;
  process: string;
  result: string;
  seoDescription: string;
  seoTitle: string;
  solution: string;
  summary: string;
};

export type ProjectQualityResult = {
  badgeClassName: string;
  label: string;
  missing: string[];
  score: number;
  status: "strong" | "review" | "weak";
};

function hasEnoughText(value: string, minLength: number) {
  return value.trim().length >= minLength;
}

function hasImageType(images: ProjectQualityImage[], type: string) {
  return images.some((image) => image.type.toUpperCase() === type);
}

const comparableSpacePatterns = [
  { label: "cocina", pattern: /\bcocina(s)?\b/i },
  { label: "bano", pattern: /\b(baño|banio|bano|toilette|sanitario)(s)?\b/i },
  { label: "living", pattern: /\b(living|estar|comedor|sala)(es)?\b/i },
  { label: "dormitorio", pattern: /\b(dormitorio|habitacion|habitación|suite)(s)?\b/i },
  { label: "oficina", pattern: /\b(oficina|workspace|sala de reunion|reunión)(s)?\b/i },
  { label: "local", pattern: /\b(local|comercial|showroom|tienda)(es)?\b/i },
  { label: "fachada", pattern: /\b(fachada|frente|acceso|exterior)(s)?\b/i },
  { label: "patio", pattern: /\b(patio|terraza|galeria|galería|jardin|jardín)(es)?\b/i },
];

function imageText(image: ProjectQualityImage) {
  return `${image.altText || ""} ${image.caption || ""}`.trim();
}

function getImageSpaceLabels(image: ProjectQualityImage) {
  const text = imageText(image);

  return comparableSpacePatterns
    .filter((item) => item.pattern.test(text))
    .map((item) => item.label);
}

export function hasComparableBeforeAfterPair(images: ProjectQualityImage[]) {
  const beforeImage = images.find((image) => image.type.toUpperCase() === "BEFORE");
  const afterImage = images.find((image) => image.type.toUpperCase() === "AFTER");

  if (!beforeImage || !afterImage) return false;

  const beforeLabels = getImageSpaceLabels(beforeImage);
  const afterLabels = getImageSpaceLabels(afterImage);

  if (!beforeLabels.length || !afterLabels.length) return false;

  return beforeLabels.some((label) => afterLabels.includes(label));
}

export function evaluateProjectQuality(
  project: ProjectQualityInput,
): ProjectQualityResult {
  const missing: string[] = [];
  const isRemodeling = /remodel|reforma|cocina|baño|bano/i.test(
    project.categoryName,
  );
  const hasBefore = hasImageType(project.images, "BEFORE");
  const hasAfter = hasImageType(project.images, "AFTER");
  const hasComparablePair = hasComparableBeforeAfterPair(project.images);

  const checks = [
    {
      ok: Boolean(project.coverImage.trim()) && hasEnoughText(project.imageAlt, 18),
      label: "Imagen principal con alt descriptivo",
    },
    {
      ok: project.images.length >= 2,
      label: "Galería con al menos dos imágenes",
    },
    {
      ok: !isRemodeling || (hasBefore && hasAfter),
      label: "Antes/después completo para remodelaciones",
    },
    {
      ok: !isRemodeling || hasComparablePair,
      label: "Antes/después del mismo ambiente",
    },
    {
      ok:
        hasEnoughText(project.summary, 70) &&
        hasEnoughText(project.description, 120),
      label: "Resumen y descripción desarrollados",
    },
    {
      ok:
        hasEnoughText(project.challenge, 45) &&
        hasEnoughText(project.solution, 45) &&
        hasEnoughText(project.process, 45) &&
        hasEnoughText(project.result, 45),
      label: "Narrativa completa de caso de estudio",
    },
    {
      ok:
        hasEnoughText(project.materials, 18) &&
        hasEnoughText(project.duration, 2) &&
        hasEnoughText(project.constructionSystem, 8),
      label: "Ficha técnica suficiente",
    },
    {
      ok:
        hasEnoughText(project.seoTitle, 35) &&
        hasEnoughText(project.seoDescription, 90),
      label: "SEO title y description específicos",
    },
  ];

  for (const check of checks) {
    if (!check.ok) missing.push(check.label);
  }

  const score = Math.round(
    ((checks.length - missing.length) / checks.length) * 100,
  );
  const status =
    missing.length === 0 ? "strong" : score >= 58 ? "review" : "weak";

  return {
    badgeClassName:
      status === "strong"
        ? "border-olive/25 bg-olive/10 text-olive"
        : status === "review"
          ? "border-bronze/25 bg-bronze/10 text-bronze"
          : "border-red-300 bg-red-50 text-red-700",
    label:
      status === "strong"
        ? "Listo para vender"
        : status === "review"
          ? "Revisar antes de publicar"
          : "Contenido débil",
    missing,
    score,
    status,
  };
}
