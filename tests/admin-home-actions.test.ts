// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackHomeContent } from "@/lib/home-content";
import { CONTENT_CONCURRENCY_CONFLICT_MESSAGE } from "@/lib/content-concurrency";

const mocks = vi.hoisted(() => {
  const tx = {
    auditLog: { create: vi.fn() },
    homeContent: {
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
  revalidateHomeContentSurfaces: mocks.revalidate,
}));

import { updateHomeContent } from "@/app/admin/(protected)/home/actions";

const expectedUpdatedAt = "2026-07-20T12:00:00.000Z";
const savedUpdatedAt = new Date("2026-07-20T12:05:00.000Z");

function homeFormData() {
  const content = fallbackHomeContent;
  const values: Record<string, string> = {
    expectedUpdatedAt,
    heroEyebrow: content.heroEyebrow,
    heroImageAlt: content.heroImageAlt,
    servicesTitle: content.servicesTitle,
    servicesDescription: content.servicesDescription,
    beforeAfterTitle: content.beforeAfterTitle,
    beforeAfterDescription: content.beforeAfterDescription,
    processTitle: content.processTitle,
    finalCtaTitle: content.finalCtaTitle,
    finalCtaDescription: content.finalCtaDescription,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
  };
  content.heroTrustItems.forEach((value, index) => {
    values[`heroTrustItem${index + 1}`] = value;
  });
  content.trustMetrics.forEach((metric, index) => {
    values[`metric${index + 1}Value`] = metric.value;
    values[`metric${index + 1}Label`] = metric.label;
  });
  content.processReasons.forEach((value, index) => {
    values[`processReason${index + 1}`] = value;
  });
  content.processSteps.forEach((step, index) => {
    values[`processStep${index + 1}Title`] = step.title;
    values[`processStep${index + 1}Description`] = step.description;
  });

  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("admin home content actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = { user: { id: "editor-1", role: "EDITOR" } };
    mocks.tx.homeContent.findUnique.mockResolvedValue({ id: "arqvia-home" });
    mocks.tx.homeContent.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.homeContent.findUniqueOrThrow.mockResolvedValue({
      id: "arqvia-home",
      updatedAt: savedUpdatedAt,
    });
    mocks.tx.auditLog.create.mockResolvedValue({ id: "audit-home-1" });
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );
  });

  it("updates structured home content with concurrency and audit controls", async () => {
    const result = await updateHomeContent(
      { message: "", ok: false },
      homeFormData(),
    );

    expect(result).toMatchObject({
      expectedUpdatedAt: savedUpdatedAt.toISOString(),
      ok: true,
      resource: { id: "arqvia-home" },
    });
    expect(mocks.tx.homeContent.updateMany).toHaveBeenCalledWith({
      where: {
        id: "arqvia-home",
        updatedAt: new Date(expectedUpdatedAt),
      },
      data: expect.objectContaining({
        heroTrustItemsJson: expect.any(String),
        processStepsJson: expect.any(String),
        trustMetricsJson: expect.any(String),
      }),
    });
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "HomeContent",
        entityId: "arqvia-home",
        userId: "editor-1",
      }),
    });
    expect(mocks.revalidate).toHaveBeenCalledTimes(1);
  });

  it("rejects stale writes before audit and public revalidation", async () => {
    mocks.tx.homeContent.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateHomeContent(
      { message: "", ok: false },
      homeFormData(),
    );

    expect(result).toEqual({
      expectedUpdatedAt,
      message: CONTENT_CONCURRENCY_CONFLICT_MESSAGE,
      ok: false,
    });
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("denies viewers and anonymous requests", async () => {
    mocks.session = null;

    const result = await updateHomeContent(
      { message: "", ok: false },
      homeFormData(),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no puede modificar/i);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
