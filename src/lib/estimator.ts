export const estimateTierValues = [
  "ESSENTIAL",
  "BALANCED",
  "PREMIUM",
] as const;

export type EstimateTierValue = (typeof estimateTierValues)[number];

export type PublicEstimateConfig = {
  version: number;
  enabled: boolean;
  headline: string;
  description: string;
  disclaimer: string;
  multipliers: Record<EstimateTierValue, number>;
};

export type PublicEstimateRule = {
  id: string;
  key: string;
  label: string;
  description: string;
  minUsdPerM2: number;
  maxUsdPerM2: number;
  minimumProjectUsd: number;
};

export type EstimateSelection = {
  ruleId: string;
  ruleKey: string;
  ruleLabel: string;
  tier: EstimateTierValue;
  areaM2: number;
  totalMinUsd: number;
  totalMaxUsd: number;
  configVersion: number;
};

export const estimateAreaLimits = { min: 10, max: 2000 } as const;

export function validateEstimateArea(areaM2: number) {
  if (!Number.isFinite(areaM2)) {
    return "Ingresá una superficie válida.";
  }
  if (!Number.isInteger(areaM2)) {
    return "La superficie debe expresarse en metros cuadrados enteros.";
  }
  if (areaM2 < estimateAreaLimits.min || areaM2 > estimateAreaLimits.max) {
    return `La superficie debe estar entre ${estimateAreaLimits.min} y ${estimateAreaLimits.max.toLocaleString("es-AR")} m².`;
  }
  return null;
}

export const estimateTierDetails: Record<
  EstimateTierValue,
  { label: string; description: string }
> = {
  ESSENTIAL: {
    label: "Esencial",
    description: "Prioriza funcionalidad, durabilidad y decisiones eficientes.",
  },
  BALANCED: {
    label: "Equilibrado",
    description: "Combina diseño, desempeño y una selección cuidada de materiales.",
  },
  PREMIUM: {
    label: "Superior",
    description: "Contempla mayor personalización, detalle y terminaciones especiales.",
  },
};

export function calculateEstimate(
  rule: PublicEstimateRule,
  areaM2: number,
  tier: EstimateTierValue,
  multipliers: PublicEstimateConfig["multipliers"],
) {
  const areaError = validateEstimateArea(areaM2);
  if (areaError) throw new RangeError(areaError);

  const normalizedArea = areaM2;
  const multiplier = multipliers[tier];
  const rawMinimum = Math.max(
    normalizedArea * rule.minUsdPerM2 * multiplier,
    rule.minimumProjectUsd * multiplier,
  );
  const rawMaximum = Math.max(
    normalizedArea * rule.maxUsdPerM2 * multiplier,
    rule.minimumProjectUsd * multiplier * 1.15,
  );
  const totalMinUsd = roundInvestment(rawMinimum);
  const roundedMaximum = roundInvestment(Math.max(rawMaximum, rawMinimum));
  const totalMaxUsd =
    roundedMaximum > totalMinUsd
      ? roundedMaximum
      : totalMinUsd + investmentStep(totalMinUsd);

  return {
    areaM2: normalizedArea,
    rateMinUsdM2: Math.round(rule.minUsdPerM2 * multiplier),
    rateMaxUsdM2: Math.round(rule.maxUsdPerM2 * multiplier),
    totalMinUsd,
    totalMaxUsd,
  };
}

export function formatUsd(value: number) {
  const amount = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
    style: "decimal",
  }).format(value);
  return `USD ${amount}`;
}

function roundInvestment(value: number) {
  const step = investmentStep(value);
  return Math.round(value / step) * step;
}

function investmentStep(value: number) {
  return value >= 100000 ? 5000 : value >= 30000 ? 2500 : 500;
}
