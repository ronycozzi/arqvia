-- CreateEnum
CREATE TYPE "EstimateTier" AS ENUM ('ESSENTIAL', 'BALANCED', 'PREMIUM');

-- CreateTable
CREATE TABLE "EstimateConfig" (
    "id" TEXT NOT NULL DEFAULT 'arqvia-estimator',
    "version" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "essentialMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "balancedMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "premiumMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minUsdPerM2" INTEGER NOT NULL,
    "maxUsdPerM2" INTEGER NOT NULL,
    "minimumProjectUsd" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEstimate" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "ruleId" TEXT,
    "projectTypeKey" TEXT NOT NULL,
    "projectTypeLabel" TEXT NOT NULL,
    "finishTier" "EstimateTier" NOT NULL,
    "areaM2" INTEGER NOT NULL,
    "rateMinUsdM2" INTEGER NOT NULL,
    "rateMaxUsdM2" INTEGER NOT NULL,
    "totalMinUsd" INTEGER NOT NULL,
    "totalMaxUsd" INTEGER NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstimateRule_key_key" ON "EstimateRule"("key");

-- CreateIndex
CREATE INDEX "EstimateRule_active_sortOrder_idx" ON "EstimateRule"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "EstimateRule_updatedAt_idx" ON "EstimateRule"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadEstimate_leadId_key" ON "LeadEstimate"("leadId");

-- CreateIndex
CREATE INDEX "LeadEstimate_ruleId_idx" ON "LeadEstimate"("ruleId");

-- CreateIndex
CREATE INDEX "LeadEstimate_finishTier_idx" ON "LeadEstimate"("finishTier");

-- CreateIndex
CREATE INDEX "LeadEstimate_calculatedAt_idx" ON "LeadEstimate"("calculatedAt");

-- AddForeignKey
ALTER TABLE "LeadEstimate" ADD CONSTRAINT "LeadEstimate_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEstimate" ADD CONSTRAINT "LeadEstimate_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EstimateRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Initial assumptions. Review these ranges with Arqvia before the production launch.
INSERT INTO "EstimateConfig" (
    "id", "enabled", "headline", "description", "disclaimer",
    "essentialMultiplier", "balancedMultiplier", "premiumMultiplier",
    "createdAt", "updatedAt"
) VALUES (
    'arqvia-estimator', false,
    'Estimá un rango inicial para tu proyecto.',
    'Combiná tipo de obra, superficie y nivel de terminación para obtener una primera referencia de inversión.',
    'El resultado es orientativo y no constituye una cotización. El alcance, el estado del inmueble, la ubicación, la documentación, la estructura y la selección final de materiales pueden modificarlo.',
    0.9, 1, 1.25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "EstimateRule" (
    "id", "key", "label", "description", "minUsdPerM2", "maxUsdPerM2",
    "minimumProjectUsd", "active", "sortOrder", "createdAt", "updatedAt"
) VALUES
    ('estimate-rule-new-build', 'obra-nueva', 'Obra nueva', 'Construcción residencial con materiales, mano de obra y coordinación general.', 850, 1350, 80000, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('estimate-rule-remodel', 'remodelacion-integral', 'Remodelación integral', 'Intervención completa de espacios existentes, instalaciones y terminaciones.', 450, 900, 15000, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('estimate-rule-extension', 'ampliacion', 'Ampliación', 'Nuevos metros cubiertos integrados a una construcción existente.', 700, 1150, 25000, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('estimate-rule-interiors', 'diseno-interior', 'Diseño interior', 'Materialidad, iluminación, equipamiento y ambientación del espacio.', 180, 420, 6000, true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('estimate-rule-retail', 'local-comercial', 'Local comercial', 'Adecuación de marca, instalaciones, obra y terminaciones para uso comercial.', 500, 950, 15000, true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('estimate-rule-office', 'oficina', 'Oficina', 'Distribución, instalaciones, acústica, iluminación y terminaciones de trabajo.', 450, 850, 12000, true, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
