CREATE TABLE "InstitutionalPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "eyebrow" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "introduction" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "finalCtaTitle" TEXT NOT NULL,
  "finalCtaDescription" TEXT NOT NULL,
  "primaryCtaLabel" TEXT NOT NULL,
  "secondaryCtaLabel" TEXT NOT NULL,
  "whatsappMessage" TEXT NOT NULL,
  "seoTitle" TEXT NOT NULL,
  "seoDescription" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InstitutionalPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstitutionalPage_slug_key" ON "InstitutionalPage"("slug");
CREATE INDEX "InstitutionalPage_updatedAt_idx" ON "InstitutionalPage"("updatedAt");
