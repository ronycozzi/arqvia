// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    auditLog: { create: vi.fn() },
    blogPost: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    projectImage: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    service: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    blogPostSafeParse: vi.fn(),
    committed: false,
    projectSafeParse: vi.fn(),
    revalidatePath: vi.fn(),
    serviceSafeParse: vi.fn(),
    syncContentRedirects: vi.fn(),
    transaction: vi.fn(),
    transactionClient,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  RedirectType: { replace: "replace" },
}));
vi.mock("@/lib/admin-auth", () => ({
  contentManagerRoles: ["ADMIN", "EDITOR"],
  getVerifiedAdminSession: vi.fn().mockResolvedValue({
    user: { id: "editor-1" },
  }),
}));
vi.mock("@/lib/content-redirects", () => ({
  buildContentPath: vi.fn((type: string, slug: string) => {
    const basePaths: Record<string, string> = {
      BLOG_POST: "/blog",
      PROJECT: "/proyectos",
      SERVICE: "/servicios",
    };
    return `${basePaths[type]}/${slug}`;
  }),
  ContentPathConflictError: class ContentPathConflictError extends Error {},
  deleteContentRedirects: vi.fn(),
  syncContentRedirects: mocks.syncContentRedirects,
}));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/validations", () => ({
  blogPostFormSchema: { safeParse: mocks.blogPostSafeParse },
  projectFormSchema: { safeParse: mocks.projectSafeParse },
  serviceFormSchema: { safeParse: mocks.serviceSafeParse },
}));

import { saveBlogPost } from "@/app/admin/(protected)/blog/actions";
import { saveProject } from "@/app/admin/(protected)/projects/actions";
import { saveService } from "@/app/admin/(protected)/services/actions";
import { CONTENT_CONCURRENCY_CONFLICT_MESSAGE } from "@/lib/content-concurrency";

const expectedUpdatedAt = "2026-07-15T12:00:00.000Z";
const savedUpdatedAt = new Date("2026-07-15T12:05:00.000Z");

const projectInput = {
  id: "project-1",
  publicationStatus: "DRAFT" as const,
  title: "Casa Patio Norte",
  slug: "casa-patio-norte",
  summary: "Resumen suficientemente largo del proyecto actualizado.",
  description: "Descripción suficientemente larga del proyecto actualizado.",
  location: "Córdoba",
  year: "2026",
  areaM2: 180,
  status: "Finalizado",
  clientType: "Familia",
  servicePerformed: "Diseño y construcción",
  coverImage: "/images/project.webp",
  gallery: "/images/project.webp | final | Casa terminada | Vista principal",
  challenge: "Desafío suficientemente detallado.",
  solution: "Solución suficientemente detallada.",
  process: "Proceso suficientemente detallado.",
  result: "Resultado suficientemente detallado.",
  optimized: "Circulaciones y luz natural",
  specialNote: "Patio central articulador",
  materials: "Hormigón, madera y vidrio",
  duration: "8 meses",
  constructionSystem: "Tradicional",
  currentStage: "Finalizado",
  responsibleTeam: "Equipo Arqvia",
  architectDirector: "Dirección Arqvia",
  supplier: "",
  budgetRange: "",
  featured: false,
  seoTitle: "Casa Patio Norte en Córdoba",
  seoDescription: "Descripción SEO suficientemente extensa para el proyecto.",
  seoCategory: "Vivienda",
  imageAlt: "Casa Patio Norte terminada",
  categoryId: "project-category-1",
  serviceId: "service-1",
};

const serviceInput = {
  id: "service-1",
  publicationStatus: "PUBLISHED" as const,
  title: "Construcción llave en mano",
  slug: "construccion-llave-en-mano",
  categoryId: "service-category-1",
  icon: "Building2",
  shortDescription: "Servicio integral para construir con previsibilidad.",
  description: "Descripción suficientemente larga del servicio actualizado.",
  coverImage: "/images/service.webp",
  mainBenefit: "Un único equipo coordina todo el proyecto.",
  audience: "Familias que quieren construir con acompañamiento profesional.",
  included: "Proyecto\nDocumentación\nDirección",
  benefits: "Previsibilidad\nCoordinación\nSeguimiento",
  process: "Diagnóstico\nProyecto\nObra",
  faq: "¿Cómo empezamos? | Con una reunión de diagnóstico.",
  whatsappMessage: "Hola, quiero consultar por construcción llave en mano.",
  featured: true,
  seoTitle: "Construcción llave en mano en Córdoba",
  seoDescription: "Descripción SEO suficientemente extensa para el servicio.",
};

const blogPostInput = {
  id: "post-1",
  title: "Cómo planificar una obra sin sobrecostos",
  slug: "como-planificar-una-obra",
  excerpt: "Una guía clara para ordenar decisiones antes de empezar la obra.",
  content:
    "Planificar una obra requiere definir alcance, prioridades y presupuesto antes de contratar. Este contenido desarrolla cada decisión con el detalle necesario.",
  coverImage: "/images/blog.webp",
  category: "Construcción",
  status: "PUBLISHED" as const,
  seoTitle: "Cómo planificar una obra en Córdoba",
  seoDescription: "Guía completa para planificar una obra con mayor previsibilidad.",
};

function versionedFormData() {
  const formData = new FormData();
  formData.set("expectedUpdatedAt", expectedUpdatedAt);
  return formData;
}

describe("CMS optimistic concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.committed = false;
    mocks.projectSafeParse.mockReturnValue({ success: true, data: projectInput });
    mocks.serviceSafeParse.mockReturnValue({ success: true, data: serviceInput });
    mocks.blogPostSafeParse.mockReturnValue({ success: true, data: blogPostInput });

    mocks.transactionClient.project.findUnique.mockResolvedValue({
      publishedAt: null,
      slug: "casa-patio",
    });
    mocks.transactionClient.project.findUniqueOrThrow.mockResolvedValue({
      ...projectInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.project.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.project.findMany.mockResolvedValue([
      { slug: "casa-patio-norte" },
    ]);
    mocks.transactionClient.projectImage.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.projectImage.createMany.mockResolvedValue({ count: 1 });

    mocks.transactionClient.service.findUnique.mockResolvedValue({
      publishedAt: new Date("2026-07-01T10:00:00.000Z"),
      slug: "obra-llave-en-mano",
    });
    mocks.transactionClient.service.findUniqueOrThrow.mockResolvedValue({
      ...serviceInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.service.updateMany.mockResolvedValue({ count: 1 });

    mocks.transactionClient.blogPost.findUnique.mockResolvedValue({
      publishedAt: new Date("2026-07-01T10:00:00.000Z"),
      slug: "planificar-una-obra",
    });
    mocks.transactionClient.blogPost.findUniqueOrThrow.mockResolvedValue({
      ...blogPostInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.blogPost.updateMany.mockResolvedValue({ count: 1 });

    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.syncContentRedirects.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) => {
        const result = await callback(mocks.transactionClient);
        mocks.committed = true;
        return result;
      },
    );
    mocks.revalidatePath.mockImplementation(() => {
      expect(mocks.committed).toBe(true);
    });
  });

  it("updates a project with the submitted version and commits related writes", async () => {
    const result = await saveProject(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toMatchObject({
      ok: true,
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      resource: { id: projectInput.id, slug: projectInput.slug },
    });
    expect(mocks.transactionClient.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectInput.id, updatedAt: new Date(expectedUpdatedAt) },
      }),
    );
    expect(mocks.transactionClient.projectImage.deleteMany).toHaveBeenCalled();
    expect(mocks.transactionClient.projectImage.createMany).toHaveBeenCalled();
    expect(mocks.syncContentRedirects).toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("rejects a stale project before gallery, redirects, audit, or revalidation", async () => {
    mocks.transactionClient.project.updateMany.mockResolvedValue({ count: 0 });

    const result = await saveProject(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      expectedUpdatedAt,
    });
    expect(mocks.transactionClient.project.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.transactionClient.projectImage.deleteMany).not.toHaveBeenCalled();
    expect(mocks.transactionClient.projectImage.createMany).not.toHaveBeenCalled();
    expect(mocks.syncContentRedirects).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("updates a service with the submitted version and keeps redirects atomic", async () => {
    const result = await saveService(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toMatchObject({
      ok: true,
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      resource: { id: serviceInput.id, slug: serviceInput.slug },
    });
    expect(mocks.transactionClient.service.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: serviceInput.id, updatedAt: new Date(expectedUpdatedAt) },
      }),
    );
    expect(mocks.syncContentRedirects).toHaveBeenCalled();
    expect(mocks.transactionClient.project.findMany).toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("rejects a stale service before redirects, relation reads, audit, or revalidation", async () => {
    mocks.transactionClient.service.updateMany.mockResolvedValue({ count: 0 });

    const result = await saveService(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      expectedUpdatedAt,
    });
    expect(mocks.transactionClient.service.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.syncContentRedirects).not.toHaveBeenCalled();
    expect(mocks.transactionClient.project.findMany).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("updates a blog post with the submitted version and keeps redirects atomic", async () => {
    const result = await saveBlogPost(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toMatchObject({
      ok: true,
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      resource: { id: blogPostInput.id, slug: blogPostInput.slug },
    });
    expect(mocks.transactionClient.blogPost.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: blogPostInput.id, updatedAt: new Date(expectedUpdatedAt) },
      }),
    );
    expect(mocks.syncContentRedirects).toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("rejects a stale blog post before redirects, audit, or revalidation", async () => {
    mocks.transactionClient.blogPost.updateMany.mockResolvedValue({ count: 0 });

    const result = await saveBlogPost(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      expectedUpdatedAt,
    });
    expect(mocks.transactionClient.blogPost.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.syncContentRedirects).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
