import type { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getLegalPageFallback,
  legalPageDefinitions,
  type LegalPageSlug,
} from "@/lib/legal-content";
import { logServerError } from "@/lib/logger";

export type PublicLegalPage = {
  content: string;
  seoDescription: string;
  seoTitle: string;
  slug: LegalPageSlug;
  summary: string;
  title: string;
  updatedAt: Date | null;
};

export type AdminLegalPage = PublicLegalPage & {
  id: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  status: ContentStatus;
  usesPublishedContent: boolean;
};

function toPublicFallback(slug: LegalPageSlug): PublicLegalPage {
  return {
    ...getLegalPageFallback(slug),
    updatedAt: null,
  };
}

export async function getPublicLegalPage(
  slug: LegalPageSlug,
): Promise<PublicLegalPage> {
  try {
    const page = await prisma.legalPage.findUnique({ where: { slug } });
    if (page?.status === "PUBLISHED") {
      return {
        content: page.content,
        seoDescription: page.seoDescription,
        seoTitle: page.seoTitle,
        slug,
        summary: page.summary,
        title: page.title,
        updatedAt: page.updatedAt,
      };
    }
  } catch (error) {
    logServerError("public.legal_page.read_failed", error, { slug });
  }

  return toPublicFallback(slug);
}

export async function getAdminLegalPages(): Promise<AdminLegalPage[]> {
  const rows = await prisma.legalPage.findMany({
    where: { slug: { in: legalPageDefinitions.map((page) => page.slug) } },
    orderBy: { slug: "asc" },
  });
  const rowsBySlug = new Map(rows.map((row) => [row.slug, row]));

  return legalPageDefinitions.map((fallback) => {
    const row = rowsBySlug.get(fallback.slug);
    return {
      content: row?.content ?? fallback.content,
      id: row?.id ?? null,
      reviewedAt: row?.reviewedAt ?? null,
      reviewedBy: row?.reviewedBy ?? null,
      seoDescription: row?.seoDescription ?? fallback.seoDescription,
      seoTitle: row?.seoTitle ?? fallback.seoTitle,
      slug: fallback.slug,
      status: row?.status ?? "DRAFT",
      summary: row?.summary ?? fallback.summary,
      title: row?.title ?? fallback.title,
      updatedAt: row?.updatedAt ?? null,
      usesPublishedContent: row?.status === "PUBLISHED",
    };
  });
}

export async function getAdminLegalPage(slug: LegalPageSlug) {
  const pages = await getAdminLegalPages();
  return pages.find((page) => page.slug === slug)!;
}
