CREATE TABLE "LegalPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "seoTitle" TEXT NOT NULL,
  "seoDescription" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");
CREATE INDEX "LegalPage_status_idx" ON "LegalPage"("status");
CREATE INDEX "LegalPage_updatedAt_idx" ON "LegalPage"("updatedAt");
