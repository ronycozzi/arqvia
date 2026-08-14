// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_CONCURRENCY_CONFLICT_MESSAGE } from "@/lib/content-concurrency";
import { fallbackInstitutionalPages } from "@/lib/institutional-content";

const mocks = vi.hoisted(() => {
  const tx = {
    auditLog: { create: vi.fn() },
    institutionalPage: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    revalidate: vi.fn(),
    session: { user: { id: "editor-1", role: "EDITOR" } } as {
      user: { id: string; role: string };
    } | null,
    transaction: vi.fn(),
    tx,
  };
});

vi.mock("@/lib/admin-auth", () => ({
  contentManagerRoles: ["ADMIN", "EDITOR"],
  getVerifiedAdminSession: vi.fn(() => Promise.resolve(mocks.session)),
}));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/revalidation", () => ({
  revalidateInstitutionalPageSurfaces: mocks.revalidate,
}));

import { updateInstitutionalPage } from "@/app/admin/(protected)/pages/actions";

const expectedUpdatedAt = "2026-07-20T12:00:00.000Z";
const savedUpdatedAt = new Date("2026-07-20T12:05:00.000Z");

function processFormData() {
  const page = fallbackInstitutionalPages.proceso;
  const values: Record<string, string> = {
    expectedUpdatedAt,
    slug: page.slug,
    eyebrow: page.eyebrow,
    title: page.title,
    introduction: page.introduction,
    finalCtaTitle: page.finalCtaTitle,
    finalCtaDescription: page.finalCtaDescription,
    primaryCtaLabel: page.primaryCtaLabel,
    secondaryCtaLabel: page.secondaryCtaLabel,
    whatsappMessage: page.whatsappMessage,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  };
  page.payload.steps.forEach((step, index) => {
    values[`processStep${index + 1}Title`] = step.title;
    values[`processStep${index + 1}Description`] = step.description;
  });

  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("admin institutional page actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = { user: { id: "editor-1", role: "EDITOR" } };
    mocks.tx.institutionalPage.findUnique.mockResolvedValue({
      id: "page-process-1",
    });
    mocks.tx.institutionalPage.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.institutionalPage.findUniqueOrThrow.mockResolvedValue({
      id: "page-process-1",
      slug: "proceso",
      title: fallbackInstitutionalPages.proceso.title,
      updatedAt: savedUpdatedAt,
    });
    mocks.tx.auditLog.create.mockResolvedValue({ id: "audit-page-1" });
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );
  });

  it("updates a structured page with concurrency, audit and revalidation", async () => {
    const result = await updateInstitutionalPage(
      { message: "", ok: false },
      processFormData(),
    );

    expect(result).toMatchObject({
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      ok: true,
      resource: {
        slug: "proceso",
        title: fallbackInstitutionalPages.proceso.title,
      },
    });
    expect(mocks.tx.institutionalPage.updateMany).toHaveBeenCalledWith({
      where: {
        id: "page-process-1",
        updatedAt: new Date(expectedUpdatedAt),
      },
      data: expect.objectContaining({
        payloadJson: expect.any(String),
        seoDescription: fallbackInstitutionalPages.proceso.seoDescription,
        slug: "proceso",
      }),
    });
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "InstitutionalPage",
        entityId: "page-process-1",
        userId: "editor-1",
      }),
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("proceso");
  });

  it("rejects stale writes before audit and public revalidation", async () => {
    mocks.tx.institutionalPage.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateInstitutionalPage(
      { message: "", ok: false },
      processFormData(),
    );

    expect(result).toEqual({
      expectedUpdatedAt,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      ok: false,
    });
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("denies an unauthorized session before opening a transaction", async () => {
    mocks.session = null;

    const result = await updateInstitutionalPage(
      { message: "", ok: false },
      processFormData(),
    );

    expect(result).toEqual({
      expectedUpdatedAt,
      message: expect.stringMatching(/no puede modificar/i),
      ok: false,
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
