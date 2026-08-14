import { LegalPageView } from "@/components/legal-page-view";
import { getClientConfig } from "@/lib/client-config";
import { getPublicLegalPage } from "@/lib/legal-data";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const [page, config] = await Promise.all([
    getPublicLegalPage("privacidad"),
    getClientConfig(),
  ]);
  return buildPageMetadata(
    {
      canonical: "/privacidad",
      description: page.seoDescription,
      title: page.seoTitle,
    },
    config,
  );
}

export default async function PrivacyPage() {
  return <LegalPageView page={await getPublicLegalPage("privacidad")} />;
}
