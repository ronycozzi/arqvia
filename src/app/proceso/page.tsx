import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { ProjectJourney } from "@/components/project-journey";
import { TrackedAnchor } from "@/components/tracked-anchor";
import styles from "@/components/institutional-pages.module.css";
import { getClientConfig } from "@/lib/client-config";
import { getInstitutionalPage } from "@/lib/institutional-data";
import { buildPageMetadata } from "@/lib/seo";
import { buildWhatsAppUrl } from "@/lib/utils";

export async function generateMetadata() {
  const [config, page] = await Promise.all([getClientConfig(), getInstitutionalPage("proceso")]);
  return buildPageMetadata({ canonical: "/proceso", title: page.seoTitle, description: page.seoDescription }, config);
}

export default async function ProcessPage() {
  const [config, page] = await Promise.all([getClientConfig(), getInstitutionalPage("proceso")]);
  return (
    <section className={styles.page} aria-labelledby="process-page-title">
      <header className={styles.intro}>
        <div><span className={styles.eyebrow}>Cómo trabajamos</span><h1 id="process-page-title">Qué se define en el plano.<br />Qué se resuelve en obra.</h1></div>
        <p>Una reforma y una obra nueva no arrancan en el mismo punto. Definimos qué hay que relevar, dibujar y coordinar en cada caso. Los planos se desarrollan antes de construir.</p>
      </header>
      <ProjectJourney light />
      <section className={styles.contact} aria-labelledby="process-contact-title">
        <div><h2 id="process-contact-title">Empecemos por lo que ya tenés.</h2><p>{page.finalCtaDescription}</p></div>
        <div className={styles.actions}>
          <Link href="/contacto?origen=%2Fproceso" className={styles.button}>Conversar mi proyecto<ArrowUpRight size={16} aria-hidden="true" /></Link>
          <TrackedAnchor href={buildWhatsAppUrl(page.whatsappMessage, config.whatsapp)} eventName="whatsapp_click" eventParams={{ source: "process_final_cta" }} className={styles.quietLink}><MessageCircle size={15} aria-hidden="true" />WhatsApp</TrackedAnchor>
        </div>
      </section>
    </section>
  );
}
