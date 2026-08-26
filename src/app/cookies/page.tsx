import { LegalPageView } from "@/components/legal-page-view";
import { getClientConfig } from "@/lib/client-config";
import { getPublicLegalPage } from "@/lib/legal-data";
import { buildLegalPageMetadata } from "@/lib/legal-seo";

export async function generateMetadata() {
  const [page, config] = await Promise.all([
    getPublicLegalPage("cookies"),
    getClientConfig(),
  ]);
  return buildLegalPageMetadata(page, config);
}

export default async function CookiesPage() {
  return <LegalPageView page={await getPublicLegalPage("cookies")} />;
}
