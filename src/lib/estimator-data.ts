import "server-only";

import { prisma } from "@/lib/db";
import type {
  PublicEstimateConfig,
  PublicEstimateRule,
} from "@/lib/estimator";

export const fallbackEstimateConfig: PublicEstimateConfig = {
  version: 1,
  enabled: false,
  headline: "Estimá un rango inicial para tu proyecto.",
  description:
    "Combiná tipo de obra, superficie y nivel de terminación para obtener una primera referencia de inversión.",
  disclaimer:
    "El resultado es orientativo y no constituye una cotización. El alcance, el estado del inmueble, la ubicación, la documentación, la estructura y la selección final de materiales pueden modificarlo.",
  multipliers: {
    ESSENTIAL: 0.9,
    BALANCED: 1,
    PREMIUM: 1.25,
  },
};

// Fallback assumptions support setup previews; public use remains disabled until seeded.
export const fallbackEstimateRules: PublicEstimateRule[] = [
  {
    id: "estimate-rule-new-build",
    key: "obra-nueva",
    label: "Obra nueva",
    description:
      "Construcción residencial con materiales, mano de obra y coordinación general.",
    minUsdPerM2: 850,
    maxUsdPerM2: 1350,
    minimumProjectUsd: 80000,
  },
  {
    id: "estimate-rule-remodel",
    key: "remodelacion-integral",
    label: "Remodelación integral",
    description:
      "Intervención completa de espacios existentes, instalaciones y terminaciones.",
    minUsdPerM2: 450,
    maxUsdPerM2: 900,
    minimumProjectUsd: 15000,
  },
  {
    id: "estimate-rule-extension",
    key: "ampliacion",
    label: "Ampliación",
    description:
      "Nuevos metros cubiertos integrados a una construcción existente.",
    minUsdPerM2: 700,
    maxUsdPerM2: 1150,
    minimumProjectUsd: 25000,
  },
  {
    id: "estimate-rule-interiors",
    key: "diseno-interior",
    label: "Diseño interior",
    description:
      "Materialidad, iluminación, equipamiento y ambientación del espacio.",
    minUsdPerM2: 180,
    maxUsdPerM2: 420,
    minimumProjectUsd: 6000,
  },
  {
    id: "estimate-rule-retail",
    key: "local-comercial",
    label: "Local comercial",
    description:
      "Adecuación de marca, instalaciones, obra y terminaciones para uso comercial.",
    minUsdPerM2: 500,
    maxUsdPerM2: 950,
    minimumProjectUsd: 15000,
  },
  {
    id: "estimate-rule-office",
    key: "oficina",
    label: "Oficina",
    description:
      "Distribución, instalaciones, acústica, iluminación y terminaciones de trabajo.",
    minUsdPerM2: 450,
    maxUsdPerM2: 850,
    minimumProjectUsd: 12000,
  },
];

export async function getPublicEstimatorAvailability() {
  try {
    const [config, activeRules] = await Promise.all([
      prisma.estimateConfig.findUnique({
        where: { id: "arqvia-estimator" },
        select: { enabled: true },
      }),
      prisma.estimateRule.count({ where: { active: true } }),
    ]);

    return Boolean(config?.enabled && activeRules > 0);
  } catch {
    return false;
  }
}

export async function getPublicEstimatorData() {
  try {
    const [config, rules] = await Promise.all([
      prisma.estimateConfig.findUnique({
        where: { id: "arqvia-estimator" },
      }),
      prisma.estimateRule.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      }),
    ]);

    return {
      config: config
        ? {
            version: config.version,
            enabled: config.enabled,
            headline: config.headline,
            description: config.description,
            disclaimer: config.disclaimer,
            multipliers: {
              ESSENTIAL: config.essentialMultiplier,
              BALANCED: config.balancedMultiplier,
              PREMIUM: config.premiumMultiplier,
            },
          }
        : fallbackEstimateConfig,
      rules: rules.map((rule) => ({
            id: rule.id,
            key: rule.key,
            label: rule.label,
            description: rule.description,
            minUsdPerM2: rule.minUsdPerM2,
            maxUsdPerM2: rule.maxUsdPerM2,
            minimumProjectUsd: rule.minimumProjectUsd,
          })),
    } satisfies {
      config: PublicEstimateConfig;
      rules: PublicEstimateRule[];
    };
  } catch {
    return {
      config: fallbackEstimateConfig,
      rules: fallbackEstimateRules,
    };
  }
}
