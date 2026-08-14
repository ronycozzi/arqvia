CREATE TYPE "LeadActivityType" AS ENUM (
  'STATUS_CHANGED',
  'ASSIGNED',
  'FOLLOW_UP_CHANGED',
  'COMMERCIAL_VALUE_UPDATED',
  'CONTACT_RECORDED',
  'NOTE_ADDED'
);

ALTER TABLE "Lead"
ADD COLUMN "assignedUserId" TEXT,
ADD COLUMN "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN "quotedAmountUsd" INTEGER,
ADD COLUMN "wonAmountUsd" INTEGER,
ADD COLUMN "lostReason" TEXT;

ALTER TABLE "Testimonial"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "TeamMember"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Faq"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "type" "LeadActivityType" NOT NULL,
  "summary" TEXT NOT NULL,
  "metadataJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,

  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_assignedUserId_status_idx"
ON "Lead"("assignedUserId", "status");

CREATE INDEX "Lead_nextFollowUpAt_status_idx"
ON "Lead"("nextFollowUpAt", "status");

CREATE INDEX "LeadActivity_leadId_createdAt_idx"
ON "LeadActivity"("leadId", "createdAt");

CREATE INDEX "LeadActivity_type_createdAt_idx"
ON "LeadActivity"("type", "createdAt");

CREATE INDEX "LeadActivity_userId_createdAt_idx"
ON "LeadActivity"("userId", "createdAt");

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_assignedUserId_fkey"
FOREIGN KEY ("assignedUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
ADD CONSTRAINT "LeadActivity_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
ADD CONSTRAINT "LeadActivity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
