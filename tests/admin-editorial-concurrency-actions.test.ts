// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    area: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    clientConfig: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    faq: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    testimonial: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    areaSafeParse: vi.fn(),
    clientConfigSafeParse: vi.fn(),
    committed: false,
    faqSafeParse: vi.fn(),
    projectFindMany: vi.fn(),
    revalidateAreaSurfaces: vi.fn(),
    revalidateFaqSurfaces: vi.fn(),
    revalidatePath: vi.fn(),
    syncContentRedirects: vi.fn(),
    teamMemberSafeParse: vi.fn(),
    testimonialSafeParse: vi.fn(),
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
  adminOnlyRoles: ["ADMIN"],
  contentManagerRoles: ["ADMIN", "EDITOR"],
  getVerifiedAdminSession: vi.fn().mockResolvedValue({
    user: { email: "admin@arqvia.local", id: "admin-1" },
  }),
}));
vi.mock("@/lib/client-config", () => ({
  CLIENT_CONFIG_ID: "arqvia-config",
  fallbackClientConfig: {},
}));
vi.mock("@/lib/content-redirects", () => ({
  buildContentPath: vi.fn(
    (_type: string, slug: string) => `/zonas/${slug}`,
  ),
  ContentPathConflictError: class ContentPathConflictError extends Error {},
  deleteContentRedirects: vi.fn(),
  syncContentRedirects: mocks.syncContentRedirects,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    project: { findMany: mocks.projectFindMany },
  },
}));
vi.mock("@/lib/logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/revalidation", () => ({
  revalidateAreaSurfaces: mocks.revalidateAreaSurfaces,
  revalidateFaqSurfaces: mocks.revalidateFaqSurfaces,
}));
vi.mock("@/lib/validations", () => ({
  areaFormSchema: { safeParse: mocks.areaSafeParse },
  clientConfigSchema: { safeParse: mocks.clientConfigSafeParse },
  faqFormSchema: { safeParse: mocks.faqSafeParse },
  teamMemberFormSchema: { safeParse: mocks.teamMemberSafeParse },
  testimonialFormSchema: { safeParse: mocks.testimonialSafeParse },
}));

import { saveArea } from "@/app/admin/(protected)/areas/actions";
import { saveFaq } from "@/app/admin/(protected)/faq/actions";
import { updateClientSettings } from "@/app/admin/(protected)/settings/actions";
import { saveTeamMember } from "@/app/admin/(protected)/team/actions";
import { saveTestimonial } from "@/app/admin/(protected)/testimonials/actions";
import { CONTENT_CONCURRENCY_CONFLICT_MESSAGE } from "@/lib/content-concurrency";

const expectedUpdatedAt = "2026-07-16T12:00:00.000Z";
const savedUpdatedAt = new Date("2026-07-16T12:05:00.000Z");

const testimonialInput = {
  id: "testimonial-1",
  name: "Cliente Arqvia",
  role: "Remodelación integral",
  projectType: "Vivienda",
  location: "Córdoba Capital",
  quote:
    "El proceso fue claro desde el relevamiento inicial hasta la entrega final.",
  imageUrl: "",
  projectId: "",
  featured: true,
};

const teamMemberInput = {
  id: "member-1",
  name: "Ana Arquitecta",
  role: "Dirección técnica",
  specialty: "Arquitectura residencial",
  licenseNumber: "",
  bio: "Responsable de coordinar diseño, documentación y seguimiento técnico.",
  imageUrl: "/images/team/member.webp",
  linkedinUrl: "",
  sortOrder: 1,
  active: true,
};

const faqInput = {
  id: "faq-1",
  question: "¿Cómo se organiza el presupuesto de una obra?",
  answer:
    "Se ordena por etapas, alcance y decisiones materiales antes de comenzar.",
  category: "Presupuesto",
  sortOrder: 1,
  active: true,
  relatedServiceId: "",
};

const areaInput = {
  id: "area-1",
  name: "Villa Allende",
  slug: "villa-allende-zona-norte",
  description:
    "Cobertura para proyectos residenciales, remodelaciones y dirección de obra.",
  seoTitle: "Arquitectura y construcción en Villa Allende",
  seoDescription:
    "Diseño, dirección técnica y construcción para proyectos en Villa Allende.",
  active: true,
};

const settingsInput = {
  companyName: "Arqvia",
  logoUrl: "",
  primaryColor: "#25261f",
  secondaryColor: "#f4efe7",
  accentColor: "#8b5e2e",
  fontHeading: "Cormorant Garamond" as const,
  fontBody: "Inter" as const,
  whatsapp: "5493515551234",
  phone: "+54 351 555 1234",
  email: "estudio@arqvia.com",
  address: "Córdoba, Argentina",
  businessHours: "Lunes a viernes de 9 a 18 h",
  instagramUrl: "",
  linkedinUrl: "",
  facebookUrl: "",
  heroTitle: "Arquitectura pensada para construirse bien.",
  heroSubtitle:
    "Diseñamos y acompañamos proyectos desde la primera idea hasta la entrega.",
  heroImage: "/images/hero.webp",
  primaryCtaLabel: "Solicitar presupuesto",
  secondaryCtaLabel: "Ver proyectos",
};

function versionedFormData() {
  const formData = new FormData();
  formData.set("expectedUpdatedAt", expectedUpdatedAt);
  return formData;
}

describe("editorial optimistic concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.committed = false;
    mocks.testimonialSafeParse.mockReturnValue({
      success: true,
      data: testimonialInput,
    });
    mocks.teamMemberSafeParse.mockReturnValue({
      success: true,
      data: teamMemberInput,
    });
    mocks.faqSafeParse.mockReturnValue({ success: true, data: faqInput });
    mocks.areaSafeParse.mockReturnValue({ success: true, data: areaInput });
    mocks.clientConfigSafeParse.mockReturnValue({
      success: true,
      data: settingsInput,
    });

    mocks.transactionClient.testimonial.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.testimonial.findUniqueOrThrow.mockResolvedValue({
      ...testimonialInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.teamMember.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.teamMember.findUniqueOrThrow.mockResolvedValue({
      ...teamMemberInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.faq.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.faq.findUniqueOrThrow.mockResolvedValue({
      ...faqInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.area.findUnique.mockResolvedValue({
      slug: "villa-allende",
    });
    mocks.transactionClient.area.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.area.findUniqueOrThrow.mockResolvedValue({
      ...areaInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.clientConfig.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.clientConfig.findUniqueOrThrow.mockResolvedValue({
      id: "arqvia-config",
      ...settingsInput,
      updatedAt: savedUpdatedAt,
    });
    mocks.transactionClient.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.projectFindMany.mockResolvedValue([]);
    mocks.syncContentRedirects.mockResolvedValue(undefined);

    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.transactionClient) => Promise<unknown>) => {
        const result = await callback(mocks.transactionClient);
        mocks.committed = true;
        return result;
      },
    );
    const assertCommitted = () => {
      expect(mocks.committed).toBe(true);
    };
    mocks.revalidatePath.mockImplementation(assertCommitted);
    mocks.revalidateAreaSurfaces.mockImplementation(assertCommitted);
    mocks.revalidateFaqSurfaces.mockImplementation(assertCommitted);
  });

  it.each([
    {
      action: saveTestimonial,
      model: "testimonial" as const,
      resourceId: testimonialInput.id,
    },
    {
      action: saveTeamMember,
      model: "teamMember" as const,
      resourceId: teamMemberInput.id,
    },
    { action: saveFaq, model: "faq" as const, resourceId: faqInput.id },
    { action: saveArea, model: "area" as const, resourceId: areaInput.id },
  ])(
    "updates $model only when the submitted version matches",
    async ({ action, model, resourceId }) => {
      const result = await action(
        { ok: false, message: "" },
        versionedFormData(),
      );

      expect(result).toMatchObject({
        ok: true,
        expectedUpdatedAt: savedUpdatedAt.toISOString(),
        resource: { id: resourceId },
      });
      expect(mocks.transactionClient[model].updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: resourceId, updatedAt: new Date(expectedUpdatedAt) },
        }),
      );
      expect(mocks.transactionClient[model].findUniqueOrThrow).toHaveBeenCalled();
      expect(mocks.transactionClient.auditLog.create).toHaveBeenCalled();
    },
  );

  it.each([
    { action: saveTestimonial, model: "testimonial" as const },
    { action: saveTeamMember, model: "teamMember" as const },
    { action: saveFaq, model: "faq" as const },
    { action: saveArea, model: "area" as const },
  ])(
    "rejects a stale $model before audit and revalidation",
    async ({ action, model }) => {
      mocks.transactionClient[model].updateMany.mockResolvedValue({ count: 0 });

      const result = await action(
        { ok: false, message: "" },
        versionedFormData(),
      );

      expect(result).toEqual({
        ok: false,
        message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
        expectedUpdatedAt,
      });
      expect(mocks.transactionClient[model].findUniqueOrThrow).not.toHaveBeenCalled();
      expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
      expect(mocks.revalidateAreaSurfaces).not.toHaveBeenCalled();
      expect(mocks.revalidateFaqSurfaces).not.toHaveBeenCalled();
    },
  );

  it("updates settings with its version and returns the persisted version", async () => {
    const result = await updateClientSettings(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toMatchObject({
      ok: true,
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      resource: { id: "arqvia-config", title: "Arqvia" },
    });
    expect(mocks.transactionClient.clientConfig.updateMany).toHaveBeenCalledWith({
      where: {
        id: "arqvia-config",
        updatedAt: new Date(expectedUpdatedAt),
      },
      data: settingsInput,
    });
    expect(mocks.transactionClient.auditLog.create).toHaveBeenCalled();
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/", "layout"],
      ["/manifest.webmanifest"],
      ["/sitemap.xml"],
    ]);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/admin/settings");
  });

  it("rejects stale settings before audit and revalidation", async () => {
    mocks.transactionClient.clientConfig.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateClientSettings(
      { ok: false, message: "" },
      versionedFormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      expectedUpdatedAt,
    });
    expect(mocks.transactionClient.clientConfig.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an unversioned settings form when the singleton already exists", async () => {
    mocks.transactionClient.clientConfig.findUnique.mockResolvedValue({
      id: "arqvia-config",
    });

    const result = await updateClientSettings(
      { ok: false, message: "" },
      new FormData(),
    );

    expect(result).toEqual({
      ok: false,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      expectedUpdatedAt: undefined,
    });
    expect(mocks.transactionClient.clientConfig.create).not.toHaveBeenCalled();
    expect(mocks.transactionClient.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
