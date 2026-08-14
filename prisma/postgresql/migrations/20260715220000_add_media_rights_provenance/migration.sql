ALTER TABLE "MediaAsset"
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "rightsNote" TEXT,
ADD COLUMN "rightsApprovedAt" TIMESTAMP(3),
ADD COLUMN "rightsApprovedBy" TEXT;

CREATE INDEX "MediaAsset_rightsApprovedAt_idx"
ON "MediaAsset"("rightsApprovedAt");
