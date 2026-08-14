-- CreateEnum
CREATE TYPE "TechnicalVisitStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitWindow" AS ENUM ('MORNING', 'AFTERNOON', 'FLEXIBLE');

-- CreateTable
CREATE TABLE "TechnicalVisit" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "TechnicalVisitStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedDate" TEXT,
    "preferredWindow" "VisitWindow" NOT NULL DEFAULT 'FLEXIBLE',
    "address" TEXT,
    "requestNotes" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "internalNotes" TEXT,
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalVisit_leadId_key" ON "TechnicalVisit"("leadId");

-- CreateIndex
CREATE INDEX "TechnicalVisit_status_scheduledAt_idx" ON "TechnicalVisit"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "TechnicalVisit_assignedUserId_scheduledAt_idx" ON "TechnicalVisit"("assignedUserId", "scheduledAt");

-- CreateIndex
CREATE INDEX "TechnicalVisit_requestedDate_idx" ON "TechnicalVisit"("requestedDate");

-- Backfill existing requests so they appear in the operational agenda.
INSERT INTO "TechnicalVisit" (
    "id",
    "leadId",
    "status",
    "preferredWindow",
    "durationMinutes",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('visit_', "Lead"."id"),
    "Lead"."id",
    'REQUESTED'::"TechnicalVisitStatus",
    'FLEXIBLE'::"VisitWindow",
    60,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Lead"
WHERE "Lead"."needsVisit" = true;

-- AddForeignKey
ALTER TABLE "TechnicalVisit" ADD CONSTRAINT "TechnicalVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalVisit" ADD CONSTRAINT "TechnicalVisit_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
