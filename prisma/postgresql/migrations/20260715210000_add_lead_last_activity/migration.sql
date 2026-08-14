ALTER TABLE "Lead" ADD COLUMN "lastActivityAt" TIMESTAMP(3);

UPDATE "Lead" AS lead
SET "lastActivityAt" = GREATEST(
  lead."createdAt",
  lead."updatedAt",
  COALESCE(
    (SELECT MAX(note."createdAt") FROM "LeadNote" AS note WHERE note."leadId" = lead.id),
    lead."createdAt"
  ),
  COALESCE(
    (SELECT MAX(attachment."createdAt") FROM "LeadAttachment" AS attachment WHERE attachment."leadId" = lead.id),
    lead."createdAt"
  ),
  COALESCE(
    (SELECT visit."updatedAt" FROM "TechnicalVisit" AS visit WHERE visit."leadId" = lead.id),
    lead."createdAt"
  )
);

ALTER TABLE "Lead"
  ALTER COLUMN "lastActivityAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "lastActivityAt" SET NOT NULL;

CREATE INDEX "Lead_status_lastActivityAt_idx"
  ON "Lead"("status", "lastActivityAt");
