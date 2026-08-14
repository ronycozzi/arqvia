import { LegalPageView } from "@/components/legal-page-view";
import { getClientConfig } from "@/lib/client-config";
import { getPublicLegalPage } from "@/lib/legal-data";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const [page, config] = await Promise.all([
    getPublicLegalPage("terminos"),
    getClientConfig(),
  ]);
  return buildPageMetadata(
    {
      canonical: "/terminos",
      description: page.seoDescription,
      title: page.seoTitle,
    },
    config,
  );
}

export default async function TermsPage() {
  return <LegalPageView page={await getPublicLegalPage("terminos")} />;
}
