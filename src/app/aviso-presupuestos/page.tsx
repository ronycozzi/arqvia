import { LegalPageView } from "@/components/legal-page-view";
import { getClientConfig } from "@/lib/client-config";
import { getPublicLegalPage } from "@/lib/legal-data";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const [page, config] = await Promise.all([
    getPublicLegalPage("aviso-presupuestos"),
    getClientConfig(),
  ]);
  return buildPageMetadata(
    {
      canonical: "/aviso-presupuestos",
      description: page.seoDescription,
      title: page.seoTitle,
    },
    config,
  );
}

export default async function QuoteDisclaimerPage() {
  return (
    <LegalPageView page={await getPublicLegalPage("aviso-presupuestos")} />
  );
}
