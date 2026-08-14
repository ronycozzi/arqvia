import "dotenv/config";
import { existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { PrismaClient } from "@prisma/client";
import { HOME_CONTENT_ID, toPublicHomeContent } from "../src/lib/home-content";
import {
  institutionalPageSlugs,
  toPublicInstitutionalPage,
} from "../src/lib/institutional-content";

const prisma = new PrismaClient();
const publicDir = resolve("public");
const errors: string[] = [];
const warnings: string[] = [];

function addError(scope: string, message: string) {
  errors.push(`${scope}: ${message}`);
}

function checkText(scope: string, value: string | null | undefined, minimum = 1) {
  if (!value?.trim() || value.trim().length < minimum) {
    addError(scope, `requires at least ${minimum} characters`);
  }
}

function checkSeo(scope: string, title: string, description: string) {
  checkText(`${scope}.seoTitle`, title, 20);
  checkText(`${scope}.seoDescription`, description, 70);

  if (title.length > 70) warnings.push(`${scope}.seoTitle exceeds 70 characters`);
  if (description.length > 180) {
    warnings.push(`${scope}.seoDescription exceeds 180 characters`);
  }
}

function checkImage(scope: string, value: string | null | undefined) {
  if (!value?.trim()) {
    addError(scope, "image URL is required");
    return;
  }

  if (/^https:\/\//i.test(value)) return;
  if (/^http:\/\//i.test(value)) {
    addError(scope, "external images must use HTTPS");
    return;
  }
  if (!value.startsWith("/")) {
    addError(scope, "local image paths must start with /");
    return;
  }

  const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  const absolutePath = resolve(publicDir, `.${pathname}`);
  if (!absolutePath.startsWith(`${publicDir}${sep}`)) {
    addError(scope, "local image path escapes the public directory");
    return;
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    addError(scope, `local image does not exist: ${pathname}`);
  }
}

async function main() {
  const [
    configs,
    projects,
    services,
    posts,
    team,
    testimonials,
    media,
    activeAreas,
    activeFaqs,
    legalPages,
    homeContent,
    institutionalPages,
  ] = await Promise.all([
    prisma.clientConfig.findMany(),
    prisma.project.findMany({ include: { images: true } }),
    prisma.service.findMany(),
    prisma.blogPost.findMany(),
    prisma.teamMember.findMany({ where: { active: true } }),
    prisma.testimonial.findMany(),
    prisma.mediaAsset.findMany(),
    prisma.area.count({ where: { active: true } }),
    prisma.faq.count({ where: { active: true } }),
    prisma.legalPage.findMany(),
    prisma.homeContent.findUnique({ where: { id: HOME_CONTENT_ID } }),
    prisma.institutionalPage.findMany(),
  ]);

  const config = configs.find((item) => item.id === "arqvia-config") || null;
  if (configs.length !== 1) {
    addError(
      "ClientConfig",
      `exactly one single-client configuration is required; found ${configs.length}`,
    );
  }

  if (!config) {
    addError("ClientConfig", "missing brand configuration");
  } else {
    checkText("ClientConfig.companyName", config.companyName, 2);
    checkText("ClientConfig.heroTitle", config.heroTitle, 12);
    checkText("ClientConfig.heroSubtitle", config.heroSubtitle, 30);
    checkImage("ClientConfig.heroImage", config.heroImage);
    if (config.logoUrl) checkImage("ClientConfig.logoUrl", config.logoUrl);
  }

  if (!projects.length) addError("Project", "at least one project is required");
  for (const project of projects) {
    const scope = `Project(${project.slug})`;
    checkImage(`${scope}.coverImage`, project.coverImage);
    checkText(`${scope}.imageAlt`, project.imageAlt, 12);
    checkSeo(scope, project.seoTitle, project.seoDescription);
    if (project.publicationStatus === "PUBLISHED" && !project.publishedAt) {
      addError(`${scope}.publishedAt`, "published projects need a publication date");
    }

    const before = project.images.filter((image) => image.type === "BEFORE");
    const after = project.images.filter((image) => image.type === "AFTER");
    if ((before.length > 0) !== (after.length > 0)) {
      addError(`${scope}.images`, "before and after images must be provided as a pair");
    }

    for (const image of project.images) {
      checkImage(`${scope}.images(${image.id}).url`, image.url);
      checkText(`${scope}.images(${image.id}).altText`, image.altText, 12);
    }
  }

  if (!services.length) addError("Service", "at least one service is required");
  for (const service of services) {
    const scope = `Service(${service.slug})`;
    checkImage(`${scope}.coverImage`, service.coverImage);
    checkSeo(scope, service.seoTitle, service.seoDescription);
    if (service.publicationStatus === "PUBLISHED" && !service.publishedAt) {
      addError(`${scope}.publishedAt`, "published services need a publication date");
    }
  }

  if (!posts.length) addError("BlogPost", "at least one guide is required");
  for (const post of posts) {
    const scope = `BlogPost(${post.slug})`;
    checkImage(`${scope}.coverImage`, post.coverImage);
    checkSeo(scope, post.seoTitle, post.seoDescription);
    if (post.status === "PUBLISHED" && !post.publishedAt) {
      addError(`${scope}.publishedAt`, "published posts need a publication date");
    }
  }

  if (!team.length) addError("TeamMember", "at least one active team member is required");
  for (const member of team) checkImage(`TeamMember(${member.id}).imageUrl`, member.imageUrl);
  for (const testimonial of testimonials) {
    if (testimonial.imageUrl) {
      checkImage(`Testimonial(${testimonial.id}).imageUrl`, testimonial.imageUrl);
    }
  }
  for (const asset of media) checkImage(`MediaAsset(${asset.id}).url`, asset.url);

  if (!activeAreas) addError("Area", "at least one active work area is required");
  if (!activeFaqs) addError("Faq", "at least one active FAQ is required");

  const parsedHomeContent = homeContent
    ? toPublicHomeContent(homeContent)
    : null;
  if (!parsedHomeContent) {
    addError("HomeContent", "missing or structurally invalid home content");
  } else {
    checkText("HomeContent.heroEyebrow", parsedHomeContent.heroEyebrow, 8);
    checkText("HomeContent.heroImageAlt", parsedHomeContent.heroImageAlt, 20);
    checkSeo(
      "HomeContent",
      parsedHomeContent.seoTitle,
      parsedHomeContent.seoDescription,
    );
  }

  if (institutionalPages.length !== institutionalPageSlugs.length) {
    addError(
      "InstitutionalPage",
      `exactly ${institutionalPageSlugs.length} governed pages are required`,
    );
  }
  for (const page of institutionalPages) {
    const parsedPage = toPublicInstitutionalPage(page);
    const scope = `InstitutionalPage(${page.slug})`;
    if (!parsedPage) {
      addError(scope, "payload is invalid or the slug is not supported");
      continue;
    }
    checkText(`${scope}.title`, parsedPage.title, 12);
    checkText(`${scope}.introduction`, parsedPage.introduction, 40);
    checkSeo(scope, parsedPage.seoTitle, parsedPage.seoDescription);
  }

  if (legalPages.length !== 4) {
    addError("LegalPage", "exactly four institutional documents are required");
  }
  for (const page of legalPages) {
    const scope = `LegalPage(${page.slug})`;
    checkText(`${scope}.title`, page.title, 5);
    checkText(`${scope}.summary`, page.summary, 20);
    checkText(`${scope}.content`, page.content, 120);
    checkSeo(scope, page.seoTitle, page.seoDescription);
    if (page.status === "PUBLISHED" && (!page.reviewedAt || !page.reviewedBy)) {
      addError(scope, "published documents require review evidence");
    }
  }

  for (const warning of warnings) console.warn(`WARN ${warning}`);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`);
    throw new Error(`Content integrity failed with ${errors.length} error(s).`);
  }

  console.log(
    `Content integrity passed: ${projects.length} projects, ${services.length} services, ${posts.length} guides, ${media.length} media assets.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
