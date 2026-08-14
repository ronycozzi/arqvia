import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  fallbackInstitutionalPages,
  type InstitutionalPageForSlug,
  type InstitutionalPageSlug,
  type PublicInstitutionalPage,
  toPublicInstitutionalPage,
} from "@/lib/institutional-content";
import { fallbackPublicContent } from "@/lib/public-content-policy";

const getInstitutionalPageCached = cache(
  async (slug: InstitutionalPageSlug): Promise<PublicInstitutionalPage> => {
    try {
      const page = await prisma.institutionalPage.findUnique({
        where: { slug },
      });
      const publicPage = page ? toPublicInstitutionalPage(page) : null;

      return publicPage
        ? publicPage
        : fallbackPublicContent(
            `institutional page ${slug}`,
            fallbackInstitutionalPages[slug],
          );
    } catch (error) {
      return fallbackPublicContent(
        `institutional page ${slug}`,
        fallbackInstitutionalPages[slug],
        error,
      );
    }
  },
);

export async function getInstitutionalPage<T extends InstitutionalPageSlug>(
  slug: T,
): Promise<InstitutionalPageForSlug<T>> {
  return getInstitutionalPageCached(slug) as Promise<
    InstitutionalPageForSlug<T>
  >;
}
