CREATE TYPE "PrivateObjectDeletionStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'FAILED',
  'DELETED'
);

ALTER TABLE "Lead"
ADD COLUMN "privacyErasureRequestedAt" TIMESTAMP(3);

CREATE INDEX "Lead_privacyErasureRequestedAt_idx"
ON "Lead"("privacyErasureRequestedAt");

CREATE TABLE "PrivateObjectDeletion" (
  "id" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" "PrivateObjectDeletionStatus" NOT NULL DEFAULT 'PENDING',
  "claimToken" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAttemptAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PrivateObjectDeletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrivateObjectDeletion_storageKey_key"
ON "PrivateObjectDeletion"("storageKey");

CREATE INDEX "PrivateObjectDeletion_status_nextAttemptAt_idx"
ON "PrivateObjectDeletion"("status", "nextAttemptAt");

CREATE INDEX "PrivateObjectDeletion_createdAt_idx"
ON "PrivateObjectDeletion"("createdAt");
