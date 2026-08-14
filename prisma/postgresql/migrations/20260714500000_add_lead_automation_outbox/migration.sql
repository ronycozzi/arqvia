-- CreateEnum
CREATE TYPE "LeadAutomationEvent" AS ENUM ('LEAD_CREATED', 'LEAD_RECONSULTED');

-- CreateEnum
CREATE TYPE "LeadAutomationStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'DEAD');

-- CreateTable
CREATE TABLE "LeadAutomationDelivery" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "event" "LeadAutomationEvent" NOT NULL,
    "status" "LeadAutomationStatus" NOT NULL DEFAULT 'PENDING',
    "payloadJson" TEXT NOT NULL,
    "claimToken" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAutomationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadAutomationDelivery_status_nextAttemptAt_idx" ON "LeadAutomationDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "LeadAutomationDelivery_leadId_createdAt_idx" ON "LeadAutomationDelivery"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAutomationDelivery_createdAt_idx" ON "LeadAutomationDelivery"("createdAt");

-- AddForeignKey
ALTER TABLE "LeadAutomationDelivery" ADD CONSTRAINT "LeadAutomationDelivery_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
