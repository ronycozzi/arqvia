import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, Quote } from "lucide-react";
import { getPublicBlogPosts } from "@/lib/blog-data";
import { getPublicTestimonials } from "@/lib/testimonial-data";
import { createPageMetadata } from "@/lib/seo";
import styles from "./journal.module.css";

export const generateMetadata = createPageMetadata({
  title: "Opiniones y guías de arquitectura",
  description: "Experiencias compartidas y guías de Arqvia sobre diseño, construcción y remodelación en Córdoba. Consultá dudas y prepará tu proyecto.",
  canonical: "/blog",
});
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const [posts, testimonials] = await Promise.all([getPublicBlogPosts(), getPublicTestimonials(12)]);
  const categories = [...new Set(posts.map((post) => post.category))];
  return (
    <div className={styles.journal}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Opiniones y guías</p><h1>Antes de construir,<br />hay preguntas que conviene hacer.</h1></div>
        <p>Permisos, presupuesto y materiales: guías para preparar una obra y experiencias de quienes ya pasaron por una.</p>
      </header>
      <nav className={styles.sectionNav} aria-label="Explorar opiniones y guías">
        <a href="#experiencias">Experiencias compartidas</a><a href="#guias">Guías para tu proyecto</a><Link href="/contacto?origen=%2Fblog">Hacer una consulta <ArrowUpRight size={15} /></Link>
      </nav>
      <section className={styles.conversations} id="experiencias" aria-labelledby="experiences-title">
        <div className={styles.conversationIntro}>
          <p className={styles.eyebrow}>Experiencias compartidas</p>
          <h2 id="experiences-title">Después de la entrega.</h2>
          <p>Cómo se vivió la obra, qué decisiones ayudaron y qué se podría hacer mejor.</p>
          <Link href="/contacto?origen=%2Fblog%23experiencias&tipo=Otro" className={styles.action}>Compartir mi experiencia <ArrowUpRight size={16} /></Link>
          <small>Contanos tu experiencia desde el formulario de contacto. Las opiniones se revisan antes de publicarse.</small>
        </div>
        <div className={styles.opinions}>
          {testimonials.length ? testimonials.map((item) => (
            <figure className={styles.quote} key={`${item.name}-${item.quote}`}><Quote size={20} aria-hidden="true" /><blockquote>{item.quote}</blockquote><figcaption><strong>{item.name}</strong><span>{item.projectType} · {item.location}</span></figcaption></figure>
          )) : <div className={styles.empty}><MessageSquare size={22} strokeWidth={1.3} aria-hidden="true" /><h3>Aún no hay opiniones publicadas.</h3><p>Si trabajaste con el estudio, contanos cómo fue el proceso. Tu comentario llegará al equipo para su revisión.</p></div>}
        </div>
      </section>
      <section id="guias" className={styles.guides} aria-labelledby="guides-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Guías para tu proyecto</p><h2 id="guides-title">Lo que necesitás tener en cuenta.</h2></div><p>Elegí un tema para revisar las decisiones que pueden cambiar el alcance, los tiempos o el costo de tu obra.</p></div>
        <nav className={styles.topics} aria-label="Temas de las guías">{categories.map((category, index) => <a key={category} href={`#tema-${index}`}>{category}</a>)}</nav>
        {categories.map((category, index) => <section id={`tema-${index}`} className={styles.category} key={category}><h3>{category}</h3><div className={styles.articleList}>{posts.filter((post) => post.category === category).map((post) => <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.articleCard}><div className={styles.articleImage}><Image src={post.coverImage} alt="" fill sizes="(max-width: 600px) 110px, 230px" quality={88} className="object-cover" /></div><div><h4>{post.title}</h4><p>{post.excerpt}</p><span>Leer guía <ArrowUpRight size={15} /></span></div></Link>)}</div></section>)}
      </section>
    </div>
  );
}
