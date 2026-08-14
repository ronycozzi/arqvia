import "dotenv/config";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ResidueCheck = {
  count: number;
  label: string;
};

async function uploadedFixtureCount() {
  try {
    const entries = await readdir(resolve("public", "uploads"));
    return entries.filter((entry) =>
      /(?:imagen-cms-|e2e-|arqvia-test)/i.test(entry),
    ).length;
  } catch {
    return 0;
  }
}

async function collectResidueChecks(): Promise<ResidueCheck[]> {
  const [
    users,
    leads,
    projects,
    services,
    blogPosts,
    faqs,
    testimonials,
    teamMembers,
    areas,
    mediaAssets,
    projectCategories,
    serviceCategories,
    legalPages,
    homeContent,
    institutionalPages,
    redirects,
    auditLogs,
    rateLimitBuckets,
    uploadedFiles,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        OR: [
          { email: { startsWith: "usuario-cms-" } },
          { email: { startsWith: "a11y-e2e-" } },
          { name: { startsWith: "Usuario CMS" } },
          { name: { startsWith: "A11y " } },
        ],
      },
    }),
    prisma.lead.count({
      where: {
        OR: [
          { email: { endsWith: "@arqvia.test" } },
          { email: { startsWith: "visita-e2e-" } },
          { name: { startsWith: "Consulta Arqvia " } },
          { name: { startsWith: "Exportacion masiva " } },
          { name: { startsWith: "Visita E2E " } },
        ],
      },
    }),
    prisma.project.count({
      where: {
        OR: [
          { title: { startsWith: "Casa CMS" } },
          { title: { startsWith: "Borrador CMS" } },
          { slug: { startsWith: "casa-cms" } },
          { slug: { startsWith: "borrador-cms" } },
        ],
      },
    }),
    prisma.service.count({
      where: {
        OR: [
          { title: { startsWith: "Servicio CMS" } },
          { title: { startsWith: "Borrador CMS" } },
          { slug: { startsWith: "servicio-cms" } },
          { slug: { startsWith: "borrador-cms" } },
        ],
      },
    }),
    prisma.blogPost.count({
      where: {
        OR: [
          { title: { startsWith: "Guía CMS" } },
          { slug: { startsWith: "guia-cms" } },
        ],
      },
    }),
    prisma.faq.count({
      where: {
        OR: [
          { question: { startsWith: "Pregunta CMS" } },
          { category: { startsWith: "Categoría CMS" } },
        ],
      },
    }),
    prisma.testimonial.count({
      where: {
        OR: [
          { name: { startsWith: "Cliente CMS" } },
          { quote: { contains: "testimonio creado desde el CMS" } },
        ],
      },
    }),
    prisma.teamMember.count({
      where: {
        OR: [
          { name: { startsWith: "Integrante CMS" } },
          { specialty: { startsWith: "Especialidad CMS" } },
        ],
      },
    }),
    prisma.area.count({
      where: {
        OR: [
          { name: { startsWith: "Área CMS" } },
          { slug: { startsWith: "area-cms" } },
        ],
      },
    }),
    prisma.mediaAsset.count({
      where: {
        OR: [
          { title: { startsWith: "Imagen CMS" } },
          { url: { contains: "imagen-cms" } },
        ],
      },
    }),
    prisma.projectCategory.count({
      where: {
        OR: [
          { name: { startsWith: "Categoría Proyecto CMS" } },
          { slug: { startsWith: "categoria-proyecto-cms" } },
          { slug: { startsWith: "categoria-proyecto-borrador-cms" } },
        ],
      },
    }),
    prisma.serviceCategory.count({
      where: {
        OR: [
          { name: { startsWith: "Categoría Servicio CMS" } },
          { slug: { startsWith: "categoria-servicio-cms" } },
          { slug: { startsWith: "categoria-servicio-borrador-cms" } },
        ],
      },
    }),
    prisma.legalPage.count({
      where: {
        OR: [
          { title: { contains: "Arqvia E2E" } },
          { reviewedBy: { contains: "E2E" } },
        ],
      },
    }),
    prisma.homeContent.count({
      where: {
        OR: [
          { projectsTitle: { contains: "Arqvia E2E" } },
          { finalCtaTitle: { contains: "Arqvia E2E" } },
        ],
      },
    }),
    prisma.institutionalPage.count({
      where: {
        OR: [
          { title: { contains: "Arqvia E2E" } },
          { finalCtaTitle: { contains: "Arqvia E2E" } },
        ],
      },
    }),
    prisma.contentRedirect.count({
      where: {
        OR: [
          { sourcePath: { contains: "-cms" } },
          { destinationPath: { contains: "-cms" } },
        ],
      },
    }),
    prisma.auditLog.count({
      where: {
        OR: [
          { summary: { contains: "Casa CMS" } },
          { summary: { contains: "Servicio CMS" } },
          { summary: { contains: "Usuario CMS" } },
          { summary: { contains: "Cliente CMS" } },
          { summary: { contains: "Integrante CMS" } },
          { summary: { contains: "Guía CMS" } },
          { summary: { contains: "Pregunta CMS" } },
          { summary: { contains: "Visita E2E" } },
          { summary: { contains: "Arqvia E2E" } },
          { summary: { contains: "@arqvia.test" } },
        ],
      },
    }),
    prisma.rateLimitBucket.count({
      where: {
        OR: [
          { key: { contains: "e2e" } },
          { key: { contains: "arqvia.test" } },
        ],
      },
    }),
    uploadedFixtureCount(),
  ]);

  return [
    { label: "usuarios", count: users },
    { label: "leads y datos asociados", count: leads },
    { label: "proyectos", count: projects },
    { label: "servicios", count: services },
    { label: "artículos", count: blogPosts },
    { label: "FAQ", count: faqs },
    { label: "testimonios", count: testimonials },
    { label: "equipo", count: teamMembers },
    { label: "áreas", count: areas },
    { label: "biblioteca multimedia", count: mediaAssets },
    { label: "categorías de proyectos", count: projectCategories },
    { label: "categorías de servicios", count: serviceCategories },
    { label: "documentos legales", count: legalPages },
    { label: "contenido de la home", count: homeContent },
    { label: "páginas institucionales", count: institutionalPages },
    { label: "redirecciones", count: redirects },
    { label: "auditoría", count: auditLogs },
    { label: "límites de solicitudes", count: rateLimitBuckets },
    { label: "archivos subidos", count: uploadedFiles },
  ];
}

async function main() {
  try {
    const residue = (await collectResidueChecks()).filter(
      (check) => check.count > 0,
    );

    if (residue.length) {
      console.error("E2E residue check failed:");
      for (const check of residue) {
        console.error(`- ${check.label}: ${check.count}`);
      }
      process.exitCode = 1;
    } else {
      console.log("E2E residue check: PASS (database and uploads are clean)");
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
