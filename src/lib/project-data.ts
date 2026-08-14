import type {
  Project as DbProject,
  ProjectCategory,
  ProjectImage,
  Service,
  Testimonial,
} from "@prisma/client";
import { cache } from "react";
import { projects as seedProjects } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  canUseSeedContent,
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "@/lib/public-content-policy";
import { rankRelatedProjects } from "@/lib/project-recommendations";
import { getRecommendedProjectSlugs } from "@/lib/service-project-mapping";
import type {
  PublicBeforeAfter,
  PublicProject,
  PublicProjectImage,
} from "@/types/project";

type ProjectWithRelations = DbProject & {
  category: ProjectCategory;
  images: ProjectImage[];
  service: Service | null;
  testimonials: Testimonial[];
};

type SeedProject = (typeof seedProjects)[number];

const projectInclude = {
  category: true,
  service: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  testimonials: { where: { featured: true }, take: 1 },
};

function toPublicProject(project: ProjectWithRelations): PublicProject {
  const gallery = project.images.length
    ? project.images.map((image) => image.url)
    : [project.coverImage];
  const galleryImages = project.images.length
    ? project.images.map((image, index) => ({
        url: image.url,
        altText: image.altText || `${project.title} imagen ${index + 1}`,
        caption: image.caption,
        type: image.type.toLowerCase(),
      }))
    : [
        {
          url: project.coverImage,
          altText: project.imageAlt,
          caption: "Imagen principal del proyecto",
          type: "final",
        },
      ];
  const beforeAfter = resolveBeforeAfter(
    project,
    galleryImages,
  );
  const keyDecisions = resolveKeyDecisions(project);

  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    category: project.category.name,
    serviceSlug: project.service?.slug || "",
    location: project.location,
    year: project.year,
    areaM2: project.areaM2,
    status: project.status,
    clientType: project.clientType,
    servicePerformed: project.servicePerformed,
    coverImage: project.coverImage,
    gallery,
    galleryImages,
    beforeAfter,
    keyDecisions,
    summary: project.summary,
    description: project.description,
    challenge: project.challenge,
    solution: project.solution,
    process: project.process,
    result: project.result,
    optimized: project.optimized,
    specialNote: project.specialNote,
    materials: project.materials,
    duration: project.duration,
    constructionSystem: project.constructionSystem,
    currentStage: project.currentStage,
    responsibleTeam: project.responsibleTeam,
    architectDirector: project.architectDirector,
    supplier: project.supplier,
    budgetRange: project.budgetRange,
    featured: project.featured,
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    imageAlt: project.imageAlt,
    updatedAt: project.updatedAt,
    testimonial: project.testimonials[0]?.quote,
  };
}

function seedToPublicProject(project: SeedProject): PublicProject {
  const galleryImages: PublicProjectImage[] = project.gallery.map((url, index) => ({
    url,
    altText: index === 0 ? project.imageAlt : `${project.title} imagen ${index + 1}`,
    caption: index === 0 ? "Imagen principal del proyecto" : null,
    type: "final",
  }));
  const beforeAfter = "beforeAfter" in project ? project.beforeAfter : undefined;

  return {
    id: project.slug,
    title: project.title,
    slug: project.slug,
    category: project.category,
    serviceSlug: project.serviceSlug,
    location: project.location,
    year: project.year,
    areaM2: project.areaM2,
    status: project.status,
    clientType: project.clientType,
    servicePerformed: project.servicePerformed,
    coverImage: project.coverImage,
    gallery: project.gallery,
    galleryImages,
    beforeAfter: beforeAfter ? { eyebrow: "Antes y después", ...beforeAfter } : undefined,
    keyDecisions: [
      project.solution ? `Solución adoptada: ${cleanSentence(project.solution)}.` : "",
      project.optimized
        ? `Optimización principal: ${cleanSentence(project.optimized)}.`
        : "",
      project.materials ? `Materialidad definida: ${cleanSentence(project.materials)}.` : "",
      project.specialNote ? `Detalle diferencial: ${cleanSentence(project.specialNote)}.` : "",
    ]
      .filter(Boolean)
      .slice(0, 4),
    summary: project.summary,
    description: project.description,
    challenge: project.challenge,
    solution: project.solution,
    process: project.process,
    result: project.result,
    optimized: project.optimized,
    specialNote: project.specialNote,
    materials: project.materials,
    duration: project.duration,
    constructionSystem: project.constructionSystem,
    currentStage: project.currentStage,
    responsibleTeam: project.responsibleTeam,
    architectDirector: project.architectDirector,
    supplier: project.supplier,
    budgetRange: project.budgetRange,
    featured: project.featured,
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    imageAlt: project.imageAlt,
    testimonial: project.testimonial,
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
  };
}

function cleanSentence(value: string) {
  return value.trim().replace(/\.$/, "");
}

function resolveKeyDecisions(project: ProjectWithRelations): string[] {
  const decisions = [
    project.solution
      ? `Solución adoptada: ${cleanSentence(project.solution)}.`
      : "",
    project.optimized
      ? `Optimización principal: ${cleanSentence(project.optimized)}.`
      : "",
    project.materials
      ? `Materialidad definida: ${cleanSentence(project.materials)}.`
      : "",
    project.process
      ? `Proceso de trabajo: ${cleanSentence(project.process)}.`
      : "",
    project.specialNote
      ? `Detalle diferencial: ${cleanSentence(project.specialNote)}.`
      : "",
  ];

  return decisions.filter(Boolean).slice(0, 5);
}

function resolveBeforeAfter(
  project: ProjectWithRelations,
  galleryImages: PublicProjectImage[],
): PublicBeforeAfter | undefined {
  const beforeImage = galleryImages.find((image) => image.type === "before");
  const afterImage = galleryImages.find((image) => image.type === "after");

  if (!beforeImage || !afterImage) return undefined;

  return {
    beforeImage: beforeImage.url,
    afterImage: afterImage.url,
    beforeAlt:
      beforeImage.altText ||
      `${project.title} antes de la intervención`,
    afterAlt:
      afterImage.altText ||
      `${project.title} después de la intervención`,
    contextNote:
      "muestra el mismo ambiente desde un encuadre comparable para entender qué cambió y por qué.",
    beforeNote:
      beforeImage.caption ||
      "estado inicial relevado antes de definir alcance, materiales y presupuesto.",
    afterNote:
      afterImage.caption ||
      "resultado final después de ordenar diseño, ejecución y terminaciones.",
    eyebrow: "Antes y después",
    title: `Antes y después de ${project.title}.`,
    description:
      "El caso se presenta con imágenes comparables del mismo ambiente para explicar la transformación con evidencia visual, no solo con una galería aislada.",
    ctaLabel: "Quiero una transformación similar",
    ctaHref: `/contacto?origen=${encodeURIComponent(`/proyectos/${project.slug}`)}`,
  };
}

export async function getPublicProjects(): Promise<PublicProject[]> {
  try {
    const dbProjects = await prisma.project.findMany({
      where: {
        publicationStatus: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
      include: projectInclude,
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    });

    if (dbProjects.length) return dbProjects.map(toPublicProject);

    const projectCount = await prisma.project.count();
    return projectCount === 0
      ? seedCollectionOrEmpty(seedProjects.map(seedToPublicProject))
      : [];
  } catch (error) {
    return fallbackPublicContent(
      "projects",
      seedProjects.map(seedToPublicProject),
      error,
    );
  }
}

export const getPublicProject = cache(async function getPublicProject(
  slug: string,
): Promise<PublicProject | null> {
  const seedProject =
    seedProjects.map(seedToPublicProject).find((item) => item.slug === slug) ||
    null;

  try {
    const project = await prisma.project.findFirst({
      where: {
        slug,
        publicationStatus: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
      include: projectInclude,
    });

    if (project) return toPublicProject(project);

    if (!canUseSeedContent()) return null;

    const projectCount = await prisma.project.count();
    return projectCount === 0 ? seedProject : null;
  } catch (error) {
    return fallbackPublicContent("project detail", seedProject, error);
  }
});

export async function getFeaturedPublicProjects(
  take = 3,
): Promise<PublicProject[]> {
  try {
    const publicWhere = {
      publicationStatus: "PUBLISHED" as const,
      publishedAt: { lte: new Date() },
    };
    let rows = await prisma.project.findMany({
      where: { ...publicWhere, featured: true },
      include: projectInclude,
      orderBy: { updatedAt: "desc" },
      take,
    });

    if (!rows.length) {
      rows = await prisma.project.findMany({
        where: publicWhere,
        include: projectInclude,
        orderBy: { updatedAt: "desc" },
        take,
      });
    }

    if (rows.length) return rows.map(toPublicProject);
    const projectCount = await prisma.project.count();
    if (projectCount > 0) return [];

    const seeds = seedCollectionOrEmpty(seedProjects.map(seedToPublicProject));
    const featured = seeds.filter((project) => project.featured);
    return (featured.length ? featured : seeds).slice(0, take);
  } catch (error) {
    const seeds = seedProjects.map(seedToPublicProject);
    const featured = seeds.filter((project) => project.featured);
    return fallbackPublicContent(
      "featured projects",
      (featured.length ? featured : seeds).slice(0, take),
      error,
    );
  }
}

export async function getPublicProjectsForService(
  serviceSlug: string,
  take = 3,
): Promise<PublicProject[]> {
  try {
    const publicWhere = {
      publicationStatus: "PUBLISHED" as const,
      publishedAt: { lte: new Date() },
    };
    const rows = await prisma.project.findMany({
      where: {
        ...publicWhere,
        service: { slug: serviceSlug },
      },
      include: projectInclude,
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take,
    });

    const recommendedSlugs = getRecommendedProjectSlugs(serviceSlug);
    if (rows.length < take && recommendedSlugs.length) {
      const recommendations = await prisma.project.findMany({
        where: {
          ...publicWhere,
          id: { notIn: rows.map((project) => project.id) },
          slug: { in: [...recommendedSlugs] },
        },
        include: projectInclude,
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        take: take - rows.length,
      });
      rows.push(...recommendations);
    }

    if (rows.length) return rows.map(toPublicProject);
    const projectCount = await prisma.project.count();
    if (projectCount > 0) return [];

    return seedCollectionOrEmpty(seedProjects.map(seedToPublicProject))
      .filter(
        (project) =>
          project.serviceSlug === serviceSlug ||
          recommendedSlugs.includes(project.slug),
      )
      .slice(0, take);
  } catch (error) {
    const recommendedSlugs = getRecommendedProjectSlugs(serviceSlug);
    return fallbackPublicContent(
      "service projects",
      seedProjects
        .map(seedToPublicProject)
        .filter(
          (project) =>
            project.serviceSlug === serviceSlug ||
            recommendedSlugs.includes(project.slug),
        )
        .slice(0, take),
      error,
    );
  }
}

export async function getRelatedPublicProjects(
  currentSlug: string,
  take = 3,
): Promise<PublicProject[]> {
  const projects = await getPublicProjects();
  const currentProject = projects.find((project) => project.slug === currentSlug);
  const candidates = projects.filter((project) => project.slug !== currentSlug);

  if (!currentProject) return candidates.slice(0, take);

  return rankRelatedProjects(currentProject, candidates).slice(0, take);
}
