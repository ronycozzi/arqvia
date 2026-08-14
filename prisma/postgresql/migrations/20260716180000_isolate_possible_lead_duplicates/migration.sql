ALTER TABLE "Lead"
ADD COLUMN "possibleDuplicateOfId" TEXT;

CREATE INDEX "Lead_possibleDuplicateOfId_idx"
ON "Lead"("possibleDuplicateOfId");

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_possibleDuplicateOfId_fkey"
FOREIGN KEY ("possibleDuplicateOfId") REFERENCES "Lead"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
