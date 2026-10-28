import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, MessageCircle } from "lucide-react";
import { TrackedAnchor } from "@/components/tracked-anchor";
import styles from "@/components/institutional-pages.module.css";
import { getClientConfig } from "@/lib/client-config";
import { team as exampleTeam } from "@/lib/content";
import { getInstitutionalPage } from "@/lib/institutional-data";
import { buildPageMetadata } from "@/lib/seo";
import { getPublicTeamMembers } from "@/lib/team-data";
import { buildWhatsAppUrl } from "@/lib/utils";

export async function generateMetadata() {
  const [config, page] = await Promise.all([getClientConfig(), getInstitutionalPage("nosotros")]);
  return buildPageMetadata({ canonical: "/nosotros", title: page.seoTitle, description: page.seoDescription }, config);
}

export default async function AboutPage() {
  const [config, teamMembers, page] = await Promise.all([getClientConfig(), getPublicTeamMembers(), getInstitutionalPage("nosotros")]);
  const exampleNames = new Set(exampleTeam.map((member) => member.name));
  const publishedTeam = teamMembers.filter((member) => !exampleNames.has(member.name));
  return (
    <div className={styles.page}>
      <section className={styles.aboutLead} aria-labelledby="about-title">
        <div>
          <span className={styles.eyebrow}>El estudio · Arqvia</span>
          <h1 id="about-title">El espacio se dibuja.<br />La forma de vivirlo se conversa.</h1>
          <p>Antes de definir una fachada o elegir un revestimiento, hay que entender el lugar: la luz que recibe, los recorridos cotidianos y lo que hoy falta. Ese es el punto de partida para una vivienda, una reforma o un espacio de trabajo.</p>
          <div className={styles.actions}><Link href="/proceso" className={styles.button}>Nuestra forma de trabajar<ArrowUpRight size={16} aria-hidden="true" /></Link>{publishedTeam.length > 0 && <Link href="#equipo" className={styles.quietLink}>Conocer al equipo</Link>}</div>
        </div>
        <div className={styles.leadImage}>
          <Image src="/images/arqvia-casa-patio-norte-gallery.webp" alt="Relación entre materiales, interiores y patio en Casa Patio Norte" fill quality={88} sizes="(min-width: 1280px) 620px, (min-width: 640px) 55vw, 100vw" priority />
          <span className={styles.imageCaption}>Interior y patio · visualización conceptual</span>
        </div>
      </section>
      <section className={styles.decision} aria-labelledby="decisions-title">
        <div><span className={styles.eyebrow}>{page.payload.decision.eyebrow}</span><h2 id="decisions-title" className={styles.sectionTitle}>Qué revisamos antes de proponer.</h2><p className={styles.description}>El uso de cada ambiente, el presupuesto disponible y las condiciones para construir. Las decisiones de materiales también consideran su mantenimiento después de la entrega.</p></div>
        <div className={styles.decisionItems}>{page.payload.decision.items.map((item) => <p key={item}><Check size={15} aria-hidden="true" />{item}</p>)}</div>
      </section>
      {publishedTeam.length > 0 ? <section id="equipo" className={styles.team} aria-labelledby="team-title">
        <header className={styles.teamHeader}><div><span className={styles.eyebrow}>{page.payload.team.eyebrow}</span><h2 id="team-title" className={styles.sectionTitle}>Quién se ocupa de cada área.</h2></div><p className={styles.description}>{page.payload.team.description}</p></header>
        <div className={styles.teamGrid}>{publishedTeam.map((member) => <article key={member.name} className={styles.member}>
          <div className={styles.portrait}><Image src={member.imageUrl} alt={`${member.name}, ${member.role}`} fill quality={88} sizes="(min-width: 1280px) 380px, (min-width: 640px) 33vw, 105px" /></div>
          <h3>{member.name}</h3><p className={styles.role}>{member.role}</p><p>{member.specialty}</p>
          <details><summary>Conocer su enfoque</summary><p>{member.bio}</p>{member.licenseNumber && <p className={styles.license}>{member.licenseNumber}</p>}</details>
        </article>)}</div>
      </section> : <section className={styles.disciplines} aria-labelledby="disciplines-title">
        <header><span className={styles.eyebrow}>Áreas de trabajo</span><h2 id="disciplines-title" className={styles.sectionTitle}>Del espacio al detalle constructivo.</h2></header>
        <dl>
          <div><dt>Arquitectura</dt><dd>Implantación, distribución y relación entre los ambientes. Planos para definir cómo se organiza el conjunto.</dd></div>
          <div><dt>Interiorismo</dt><dd>Materiales, iluminación y mobiliario. Decisiones que cambian el uso diario de cada ambiente.</dd></div>
          <div><dt>Coordinación de obra</dt><dd>Secuencia de trabajos, consultas técnicas y revisión de avances. El alcance se acuerda para cada encargo.</dd></div>
        </dl>
      </section>}
      <section className={styles.contact} aria-labelledby="about-contact-title">
        <div><h2 id="about-contact-title">¿Ya tenés un lugar en mente?</h2><p>Contanos dónde está, cómo lo usás hoy y qué necesitás cambiar. No hace falta tener un proyecto dibujado para hacer la primera consulta.</p></div>
        <div className={styles.actions}><Link href="/contacto?origen=%2Fnosotros" className={styles.button}>Conversar mi proyecto<ArrowUpRight size={16} aria-hidden="true" /></Link><TrackedAnchor href={buildWhatsAppUrl(page.whatsappMessage, config.whatsapp)} eventName="whatsapp_click" eventParams={{ source: "about_final_cta" }} className={styles.quietLink}><MessageCircle size={15} aria-hidden="true" />WhatsApp</TrackedAnchor></div>
      </section>
    </div>
  );
}
