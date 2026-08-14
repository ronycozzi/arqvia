CREATE TYPE "RedirectResourceType" AS ENUM ('PROJECT', 'SERVICE', 'BLOG_POST', 'AREA');

CREATE TABLE "ContentRedirect" (
  "id" TEXT NOT NULL,
  "sourcePath" TEXT NOT NULL,
  "destinationPath" TEXT NOT NULL,
  "resourceType" "RedirectResourceType" NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentRedirect_sourcePath_key"
  ON "ContentRedirect"("sourcePath");

CREATE INDEX "ContentRedirect_resourceType_resourceId_idx"
  ON "ContentRedirect"("resourceType", "resourceId");

CREATE INDEX "ContentRedirect_destinationPath_idx"
  ON "ContentRedirect"("destinationPath");
