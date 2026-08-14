import { loadEnvConfig } from "@next/env";
import { buildReleaseGate } from "../src/lib/release-readiness";
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
      prisma.legalPage.count({ where: { status: "PUBLISHED" } }),
      prisma.homeContent.count(),
      prisma.institutionalPage.count(),
      getPublicMediaRightsSnapshot(now),
    ]);
    const result = buildReleaseGate({
      config: configRow ? toPublicClientConfig(configRow) : fallbackClientConfig,
      content: {
        areas,
        blogPosts,
        clientConfigs,
        faqs,
        localMedia,
        legalPages,
        homeContents,
        institutionalPages,
        ...mediaRights,
        projects,
        seedMedia,
        services,
        teamMembers,
        testimonials,
      },
      env: process.env,
      estimator: estimator
        ? { enabled: estimator.enabled, version: estimator.version }
        : null,
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
