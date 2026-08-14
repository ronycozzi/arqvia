import { LocalSeoPage } from "@/components/local-seo-page";
import { localSeoPages } from "@/lib/local-seo";
import { createLocalSeoMetadata } from "@/lib/local-seo-metadata";

const page = localSeoPages.find(
  (item) => item.slug === "construccion-llave-en-mano-cordoba",
)!;

export const generateMetadata = createLocalSeoMetadata(page);

export default function ConstruccionLlaveEnManoCordobaPage() {
  return <LocalSeoPage page={page} />;
}
