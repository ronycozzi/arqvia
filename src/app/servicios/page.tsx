import Link from "next/link";
import Image from "@/components/app-image";
import { ArrowUpRight } from "lucide-react";
import styles from "@/components/arqvia-dossier.module.css";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { getClientConfig } from "@/lib/client-config";
import { createPageMetadata } from "@/lib/seo";
import { getServiceGroups } from "@/lib/service-data";
import { buildWhatsAppUrl } from "@/lib/utils";

export const generateMetadata = createPageMetadata({
  title: "Servicios",
  description:
    "Servicios de arquitectura, construcción llave en mano, remodelaciones, dirección de obra e interiorismo en Córdoba.",
  canonical: "/servicios",
});

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [serviceGroups, config] = await Promise.all([
    getServiceGroups(),
    getClientConfig(),
  ]);
  const contactHref = "/contacto?origen=%2Fservicios";
  const whatsappHref = buildWhatsAppUrl(
    "Hola, quiero recibir orientación sobre qué servicio de Arqvia se ajusta a mi proyecto.",
    config.whatsapp,
  );

  return (
    <div className={styles.shell}>
      <header className={styles.header}><div><p className={styles.eyebrow}>Servicios / Arquitectura y construcción</p><h1>Diseño, dirección y construcción.</h1></div><p>Elegí el trabajo que necesitás: proyectar un espacio, reformar uno existente o coordinar su construcción. Cada servicio detalla su alcance y la forma de trabajo.</p></header>
      <nav className={styles.serviceNav} aria-label="Categorías de servicios">{serviceGroups.filter((group) => group.services.length).map((group) => <a key={group.slug} href={`#${group.slug}`}>{group.name}</a>)}</nav>
      {serviceGroups.filter((group) => group.services.length).map((group) => <section id={group.slug} key={group.slug} className={styles.serviceGroup} aria-labelledby={`category-${group.slug}`}><h2 id={`category-${group.slug}`}>{group.name}</h2><div className={styles.serviceList}>
        {group.services.map((service) => <Link key={service.slug} href={`/servicios/${service.slug}`} className={styles.serviceLink}><div className={styles.serviceThumb}><Image src={service.coverImage} alt="" fill quality={88} sizes="170px" /></div><div><h3>{service.title}</h3><p>{service.shortDescription}</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>)}
      </div></section>)}
      <section className={styles.callout}><div><h2>¿Todavía no sabés por dónde empezar?</h2><p>Contanos qué espacio querés transformar. Te ayudamos a definir qué necesitás antes de encargar un proyecto.</p></div><div className={styles.actions}><Link href={contactHref} className={styles.primary}>Contar mi idea</Link><TrackedAnchor href={whatsappHref} eventName="whatsapp_click" eventParams={{ source: "services_final_cta" }} className={styles.secondary}>WhatsApp</TrackedAnchor></div></section>
    </div>
  );
}
