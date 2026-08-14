CREATE TABLE "HomeContent" (
  "id" TEXT NOT NULL DEFAULT 'arqvia-home',
  "heroEyebrow" TEXT NOT NULL,
  "heroImageAlt" TEXT NOT NULL,
  "heroTrustItemsJson" TEXT NOT NULL,
  "trustMetricsJson" TEXT NOT NULL,
  "projectsTitle" TEXT NOT NULL,
  "servicesTitle" TEXT NOT NULL,
  "servicesDescription" TEXT NOT NULL,
  "beforeAfterTitle" TEXT NOT NULL,
  "beforeAfterDescription" TEXT NOT NULL,
  "processTitle" TEXT NOT NULL,
  "processReasonsJson" TEXT NOT NULL,
  "processStepsJson" TEXT NOT NULL,
  "finalCtaTitle" TEXT NOT NULL,
  "finalCtaDescription" TEXT NOT NULL,
  "seoTitle" TEXT NOT NULL,
  "seoDescription" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HomeContent_pkey" PRIMARY KEY ("id")
);
