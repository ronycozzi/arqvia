-- The original technical-visit backfill used the migration timestamp for old
-- requests. Correct only untouched synthetic rows, then rebuild lead activity
-- without treating the deployment date as a customer interaction.
WITH corrected_visits AS (
  UPDATE "TechnicalVisit" AS visit
  SET
    "createdAt" = lead."createdAt",
    "updatedAt" = lead."createdAt"
  FROM "Lead" AS lead
  WHERE
    visit."leadId" = lead.id
    AND visit.id = CONCAT('visit_', lead.id)
    AND visit.status = 'REQUESTED'::"TechnicalVisitStatus"
    AND visit."createdAt" = visit."updatedAt"
    AND visit."requestedDate" IS NULL
    AND visit.address IS NULL
    AND visit."requestNotes" IS NULL
    AND visit."scheduledAt" IS NULL
    AND visit."internalNotes" IS NULL
    AND visit."assignedUserId" IS NULL
  RETURNING visit."leadId"
)
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
    (SELECT MAX(activity."createdAt") FROM "LeadActivity" AS activity WHERE activity."leadId" = lead.id),
    lead."createdAt"
  ),
  COALESCE(
    (SELECT visit."updatedAt" FROM "TechnicalVisit" AS visit WHERE visit."leadId" = lead.id),
    lead."createdAt"
  )
)
WHERE lead.id IN (SELECT "leadId" FROM corrected_visits);
