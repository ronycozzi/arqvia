import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import styles from "../journal.module.css";
import { publicSearchRobots } from "@/lib/search-indexing";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import {
  getBlogEditorialContext,
  getPostSections,
  getPublicBlogPost,
  getPublicBlogPosts,
  getRelatedPublicBlogPosts,
} from "@/lib/blog-data";
import { getClientConfig } from "@/lib/client-config";
import { getContentRedirectDestination } from "@/lib/content-redirects";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { absoluteUrl, formatDate, metadataTitle } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const posts = await getPublicBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [config, post] = await Promise.all([
    getClientConfig(),
    getPublicBlogPost(slug),
  ]);
  if (!post) {
    const destination = await getContentRedirectDestination(
      `/blog/${slug}`,
      "BLOG_POST",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }
  const resolvedTitle = metadataTitle(post.seoTitle, config.companyName);
  const socialTitle = resolvedTitle.absolute;

  return {
    title: resolvedTitle,
    description: post.seoDescription,
    robots: publicSearchRobots(siteConfig.url),
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: socialTitle,
      description: post.seoDescription,
      url: `/blog/${post.slug}`,
      images: [{ url: post.coverImage, alt: post.title }],
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: (post.updatedAt || post.publishedAt)?.toISOString(),
      locale: "es_AR",
      siteName: config.companyName,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: post.seoDescription,
      images: [post.coverImage],
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [config, post] = await Promise.all([
    getClientConfig(),
    getPublicBlogPost(slug),
  ]);
  if (!post) {
    const destination = await getContentRedirectDestination(
      `/blog/${slug}`,
      "BLOG_POST",
    );
    if (destination) permanentRedirect(destination);
    notFound();
  }
  const contactHref = `/contacto?origen=${encodeURIComponent(`/blog/${post.slug}`)}`;
  const sections = getPostSections(post);
  const relatedPosts = await getRelatedPublicBlogPosts(post);
  const editorialContext = getBlogEditorialContext(post);
  const publishedLabel = post.publishedAt ? formatDate(post.publishedAt) : "";
  const readingMinutes = Math.max(
    3,
    Math.ceil(post.content.split(/\s+/).filter(Boolean).length / 220),
  );

  return (
    <article className={styles.article}>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Article",
        headline: post.title, description: post.excerpt,
        image: absoluteUrl(post.coverImage, siteConfig.url),
        datePublished: post.publishedAt?.toISOString(),
        dateModified: (post.updatedAt || post.publishedAt)?.toISOString(),
        author: { "@type": "Organization", name: config.companyName, url: siteConfig.url },
        publisher: { "@type": "Organization", name: config.companyName, url: siteConfig.url },
        mainEntityOfPage: `${siteConfig.url}/blog/${post.slug}`,
      }} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Inicio", path: "/" }, { name: "Opiniones y guías", path: "/blog" },
        { name: post.title, path: `/blog/${post.slug}` },
      ])} />
      <Link href="/blog#guias" className={styles.back}><ArrowLeft size={14} /> Volver a las guías</Link>
      <header className={styles.articleHeader}>
        <div><p className={styles.eyebrow}>{post.category}</p><h1>{post.title}</h1><p>{post.excerpt}</p><small>{publishedLabel || config.companyName} · {readingMinutes} min de lectura</small></div>
        <div className={styles.cover}><Image src={post.coverImage} alt="" fill preload quality={88} sizes="(min-width: 760px) 480px, 100vw" className="object-cover" /></div>
      </header>
      <div className={styles.articleBody}>
        <nav className={styles.toc} aria-label="Índice del artículo"><h2>En esta guía</h2><ul>{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ul></nav>
        <div className={styles.prose}>
          {sections.map((section) => <section key={section.id} id={section.id}><h2>{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={`${section.id}-${index}`}>{paragraph}</p>)}</section>)}
          <aside className={styles.context} aria-labelledby="blog-contextual-cta-title" data-testid="blog-contextual-cta"><p className={styles.eyebrow}>{editorialContext.cta.eyebrow}</p><h2 id="blog-contextual-cta-title">{editorialContext.cta.title}</h2><p>{editorialContext.cta.description}</p><Link href={contactHref} className={styles.action}>{editorialContext.cta.label}</Link></aside>
          <section aria-labelledby="related-content-title"><h2 id="related-content-title">Para seguir explorando</h2><div className={styles.related}><Link href={editorialContext.service.href}><span>Servicio</span><h3>{editorialContext.service.title}</h3><p>{editorialContext.service.description}</p></Link>{relatedPosts.map((item) => <Link href={`/blog/${item.slug}`} key={item.slug}><span>Guía</span><h3>{item.title}</h3><p>{item.excerpt}</p></Link>)}</div></section>
          <aside className={styles.context}><h2>¿Te quedó una pregunta?</h2><p>Contanos qué estás pensando para tu espacio. Podemos ayudarte a ordenar el próximo paso.</p><Link href={contactHref} className={styles.action}>Conversar sobre esta guía</Link></aside>
        </div>
      </div>
    </article>
  );
}
