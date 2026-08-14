import { notFound, permanentRedirect } from "next/navigation";
import { isLegalPageSlug, legalPageSlugs } from "@/lib/legal-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return legalPageSlugs.map((slug) => ({ slug }));
}

export default async function LegalRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isLegalPageSlug(slug)) {
    notFound();
  }

  permanentRedirect(`/${slug}`);
}
