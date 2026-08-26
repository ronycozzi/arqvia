import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { buildReleaseGate } from "../src/lib/release-readiness";
import { hasApprovedLegalReview } from "../src/lib/legal-approval";
import { countUniqueReleaseFailures } from "../src/lib/release-check-summary";
import {
  printEnvironmentChecks,
  validateProductionEnvironment,
} from "./validate-environment";

loadEnvConfig(process.cwd());

async function main() {
  const environmentChecks = validateProductionEnvironment();
  printEnvironmentChecks(environmentChecks);

  const [
    { prisma },
    { CLIENT_CONFIG_ID, fallbackClientConfig, toPublicClientConfig },
    { getPublicMediaRightsSnapshot },
  ] =
    await Promise.all([
      import("../src/lib/db"),
      import("../src/lib/client-config"),
      import("../src/lib/media-rights-readiness"),
    ]);

  try {
    const now = new Date();
    const [
      configRow,
      clientConfigs,
      estimator,
      projects,
      services,
      blogPosts,
      faqs,
      areas,
      teamMembers,
      testimonials,
      seedMedia,
      localMedia,
      legalPages,
      homeContents,
      institutionalPages,
      mediaRights,
      leadIdentityBacklog,
      technicalVisitBacklog,
      privacyErasureBacklog,
      privateObjectDeletionBacklog,
    ] = await Promise.all([
      prisma.clientConfig.findUnique({ where: { id: CLIENT_CONFIG_ID } }),
      prisma.clientConfig.count(),
      prisma.estimateConfig.findUnique({ where: { id: "arqvia-estimator" } }),
      prisma.project.count({
        where: {
          publicationStatus: "PUBLISHED",
          publishedAt: { lte: now },
        },
      }),
      prisma.service.count({
        where: {
          publicationStatus: "PUBLISHED",
          publishedAt: { lte: now },
        },
      }),
      prisma.blogPost.count({
        where: { status: "PUBLISHED", publishedAt: { lte: now } },
      }),
      prisma.faq.count({ where: { active: true } }),
      prisma.area.count({ where: { active: true } }),
      prisma.teamMember.count({ where: { active: true } }),
      prisma.testimonial.count({ where: { featured: true } }),
      prisma.mediaAsset.count({ where: { source: "seed" } }),
      prisma.mediaAsset.count({ where: { url: { startsWith: "/uploads/" } } }),
      prisma.legalPage.findMany({
        where: { status: "PUBLISHED" },
        select: {
          reviewedAt: true,
          reviewedBy: true,
          slug: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.homeContent.count(),
      prisma.institutionalPage.count(),
      getPublicMediaRightsSnapshot(now),
      prisma.lead.count({ where: { normalizedEmail: null } }),
      prisma.lead.count({
        where: { needsVisit: true, technicalVisit: null },
      }),
      prisma.lead.count({
        where: { privacyErasureRequestedAt: { not: null } },
      }),
      prisma.privateObjectDeletion.count({
        where: { status: { not: "DELETED" } },
      }),
    ]);
    const approvedLegalPages = legalPages.filter(hasApprovedLegalReview);
    const legalLatestUpdatedAt = approvedLegalPages.reduce<Date | null>(
      (latest, page) =>
        !latest || page.updatedAt > latest ? page.updatedAt : latest,
      null,
    );
    const releaseConfig = configRow
      ? toPublicClientConfig(configRow)
      : fallbackClientConfig;
    const content = {
      areas,
      blogPosts,
      clientConfigs,
      faqs,
      localMedia,
      legalLatestUpdatedAt: legalLatestUpdatedAt?.toISOString() || null,
      legalPages: approvedLegalPages.length,
      legalPageSlugs: approvedLegalPages.map((page) => page.slug).sort(),
      homeContents,
      institutionalPages,
      leadIdentityBacklog,
      privateObjectDeletionBacklog,
      privacyErasureBacklog,
      ...mediaRights,
      projects,
      seedMedia,
      services,
      teamMembers,
      testimonials,
      technicalVisitBacklog,
    };
    const releaseEstimator = estimator
      ? { enabled: estimator.enabled, version: estimator.version }
      : null;
    const [
      areasState,
      blogPostsState,
      estimateRulesState,
      faqsState,
      homeContentsState,
      institutionalPagesState,
      legalPagesState,
      mediaAssetsState,
      projectCategoriesState,
      projectImagesState,
      projectsState,
      serviceCategoriesState,
      servicesState,
      teamMembersState,
      testimonialsState,
    ] = await Promise.all([
      prisma.area.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.blogPost.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.estimateRule.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.faq.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.homeContent.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.institutionalPage.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.legalPage.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.mediaAsset.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.projectCategory.findMany({ orderBy: { id: "asc" } }),
      prisma.projectImage.findMany({ orderBy: { id: "asc" } }),
      prisma.project.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.serviceCategory.findMany({ orderBy: { id: "asc" } }),
      prisma.service.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.teamMember.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
      prisma.testimonial.findMany({ orderBy: { id: "asc" }, select: { id: true, updatedAt: true } }),
    ]);
    const databaseState = {
      areas: areasState,
      blogPosts: blogPostsState,
      estimateConfig: estimator
        ? { id: estimator.id, updatedAt: estimator.updatedAt }
        : null,
      estimateRules: estimateRulesState,
      faqs: faqsState,
      homeContents: homeContentsState,
      institutionalPages: institutionalPagesState,
      legalPages: legalPagesState,
      mediaAssets: mediaAssetsState,
      projectCategories: projectCategoriesState,
      projectImages: projectImagesState,
      projects: projectsState,
      serviceCategories: serviceCategoriesState,
      services: servicesState,
      teamMembers: teamMembersState,
      testimonials: testimonialsState,
    };
    const result = buildReleaseGate({
      config: releaseConfig,
      content,
      env: process.env,
      estimator: releaseEstimator,
    });

    console.log("\nArqvia content and operations release gate\n");
    for (const item of result.checks) {
      console.log(`${item.ok ? "PASS" : "BLOCK"}  ${item.id}  ${item.label}`);
      if (!item.ok) console.log(`       ${item.detail}`);
    }

    if (!configRow) {
      console.error("\nBLOCK  RG-CONFIG-001  No existe ClientConfig en la base.");
    }

    const failedCount = countUniqueReleaseFailures({
      configExists: Boolean(configRow),
      environmentChecks,
      releaseChecks: result.checks,
    });

    if (failedCount > 0) {
      console.error(
        `\nRELEASE BLOCKED: ${failedCount} control(es) pendiente(s) entre ambiente, contenido y operacion.`,
      );
      process.exitCode = 1;
      return;
    }

    const evidencePath = process.env.ARQVIA_RELEASE_EVIDENCE_PATH?.trim();
    if (evidencePath) {
      const stateFingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            config: releaseConfig,
            content,
            databaseState,
            estimator: releaseEstimator,
          }),
        )
        .digest("hex");
      const absoluteEvidencePath = path.resolve(evidencePath);
      mkdirSync(path.dirname(absoluteEvidencePath), { recursive: true });
      writeFileSync(
        absoluteEvidencePath,
        `${JSON.stringify(
          {
            checkedAt: new Date().toISOString(),
            checks: result.checks.map(({ id, ok }) => ({ id, ok })),
            schemaVersion: 1,
            sourceRevision: process.env.ARQVIA_RELEASE_SOURCE_REVISION || null,
            stateFingerprint,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }

    console.log("\nRELEASE READY: todos los controles deterministas pasaron.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    "Release gate could not complete database checks. Review DATABASE_URL connectivity and applied migrations.",
  );
  process.exitCode = 1;
});
