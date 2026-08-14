import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    legalPage: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logServerError: mocks.logServerError,
}));

import {
  getAdminLegalPages,
  getPublicLegalPage,
} from "@/lib/legal-data";

describe("legal data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serves only a published CMS document", async () => {
    const updatedAt = new Date("2026-07-20T12:00:00.000Z");
    mocks.findUnique.mockResolvedValue({
      content: "Contenido aprobado y publicado desde el panel.",
      seoDescription: "Descripción publicada para buscadores.",
      seoTitle: "Privacidad publicada | Arqvia",
      slug: "privacidad",
      status: "PUBLISHED",
      summary: "Resumen público del documento aprobado.",
      title: "Privacidad publicada",
      updatedAt,
    });

    await expect(getPublicLegalPage("privacidad")).resolves.toEqual({
      content: "Contenido aprobado y publicado desde el panel.",
      seoDescription: "Descripción publicada para buscadores.",
      seoTitle: "Privacidad publicada | Arqvia",
      slug: "privacidad",
      summary: "Resumen público del documento aprobado.",
      title: "Privacidad publicada",
      updatedAt,
    });
  });

  it("keeps the protected baseline when the CMS row is a draft", async () => {
    mocks.findUnique.mockResolvedValue({
      content: "Borrador todavía incompleto",
      status: "DRAFT",
    });

    const page = await getPublicLegalPage("privacidad");
    expect(page.title).toMatch(/privacidad/i);
    expect(page.content).not.toBe("Borrador todavía incompleto");
    expect(page.updatedAt).toBeNull();
  });

  it("reports database errors and preserves the public baseline", async () => {
    mocks.findUnique.mockRejectedValue(new Error("database unavailable"));

    const page = await getPublicLegalPage("cookies");
    expect(page.title).toMatch(/cookies/i);
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "public.legal_page.read_failed",
      expect.any(Error),
      { slug: "cookies" },
    );
  });

  it("always exposes the four fixed documents in the admin index", async () => {
    mocks.findMany.mockResolvedValue([]);

    const pages = await getAdminLegalPages();
    expect(pages).toHaveLength(4);
    expect(pages.every((page) => page.status === "DRAFT")).toBe(true);
    expect(pages.map((page) => page.slug)).toEqual([
      "privacidad",
      "terminos",
      "cookies",
      "aviso-presupuestos",
    ]);
  });
});
