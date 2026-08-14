ALTER TABLE "Project"
  ALTER COLUMN "publicationStatus" SET DEFAULT 'DRAFT';

ALTER TABLE "Service"
  ALTER COLUMN "publicationStatus" SET DEFAULT 'DRAFT';

ALTER TABLE "TeamMember"
  ALTER COLUMN "active" SET DEFAULT false;

ALTER TABLE "Faq"
  ALTER COLUMN "active" SET DEFAULT false;

ALTER TABLE "Area"
  ALTER COLUMN "active" SET DEFAULT false;
