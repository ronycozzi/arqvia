import type { ContentStatus, LegalPage } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getLegalPageFallback,
  legalPageDefinitions,
  type LegalPageSlug,
} from "@/lib/legal-content";
import { hasApprovedLegalReview } from "@/lib/legal-approval";
import { logServerError } from "@/lib/logger";

export type PublicLegalPage = {
  content: string;
  contentSource: "approved" | "fallback";
  isApproved: boolean;
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

export function isApprovedLegalPage(
  page: LegalPage | null | undefined,
): page is LegalPage {
  return hasApprovedLegalReview(page);
}

function toPublicFallback(slug: LegalPageSlug): PublicLegalPage {
  return {
    ...getLegalPageFallback(slug),
    contentSource: "fallback",
    isApproved: false,
    updatedAt: null,
  };
}

function toApprovedPublicPage(page: LegalPage): PublicLegalPage {
  return {
    content: page.content,
    contentSource: "approved",
    isApproved: true,
    seoDescription: page.seoDescription,
    seoTitle: page.seoTitle,
    slug: page.slug as LegalPageSlug,
    summary: page.summary,
    title: page.title,
    updatedAt: page.updatedAt,
  };
}

export async function getPublicLegalPage(
  slug: LegalPageSlug,
): Promise<PublicLegalPage> {
  try {
    const page = await prisma.legalPage.findUnique({ where: { slug } });
    if (isApprovedLegalPage(page)) {
      return toApprovedPublicPage(page);
    }
  } catch (error) {
    logServerError("public.legal_page.read_failed", error, { slug });
  }

  return toPublicFallback(slug);
}

export async function getApprovedPublicLegalPages(): Promise<
  PublicLegalPage[]
> {
  try {
    const rows = await prisma.legalPage.findMany({
      where: {
        slug: { in: legalPageDefinitions.map((page) => page.slug) },
        status: "PUBLISHED",
      },
    });
    const approvedBySlug = new Map(
      rows
        .filter(isApprovedLegalPage)
        .map((row) => [row.slug, toApprovedPublicPage(row)]),
    );

    return legalPageDefinitions.flatMap((definition) => {
      const page = approvedBySlug.get(definition.slug);
      return page ? [page] : [];
    });
  } catch (error) {
    logServerError("public.legal_pages.read_failed", error);
    return [];
  }
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
      contentSource: isApprovedLegalPage(row) ? "approved" : "fallback",
      id: row?.id ?? null,
      isApproved: isApprovedLegalPage(row),
      reviewedAt: row?.reviewedAt ?? null,
      reviewedBy: row?.reviewedBy ?? null,
      seoDescription: row?.seoDescription ?? fallback.seoDescription,
      seoTitle: row?.seoTitle ?? fallback.seoTitle,
      slug: fallback.slug,
      status: row?.status ?? "DRAFT",
      summary: row?.summary ?? fallback.summary,
      title: row?.title ?? fallback.title,
      updatedAt: row?.updatedAt ?? null,
      usesPublishedContent: isApprovedLegalPage(row),
    };
  });
}

export async function getAdminLegalPage(slug: LegalPageSlug) {
  const pages = await getAdminLegalPages();
  return pages.find((page) => page.slug === slug)!;
}
