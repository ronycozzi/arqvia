import type { Metadata } from "next";
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
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: socialTitle,
      description: post.seoDescription,
      url: `/blog/${post.slug}`,
      images: [{ url: post.coverImage, alt: post.title }],
      type: "article",
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
  const relatedGridClass =
    relatedPosts.length > 1
      ? "md:grid-cols-3"
      : relatedPosts.length === 1
        ? "md:grid-cols-2"
        : "md:grid-cols-1";
  const publishedLabel = post.publishedAt ? formatDate(post.publishedAt) : "";
  const readingMinutes = Math.max(
    3,
    Math.ceil(post.content.split(/\s+/).filter(Boolean).length / 220),
  );

  return (
    <article className="min-w-0" style={{ overflowWrap: "anywhere" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          image: absoluteUrl(post.coverImage, siteConfig.url),
          datePublished: post.publishedAt?.toISOString(),
          dateModified: (post.updatedAt || post.publishedAt)?.toISOString(),
          author: {
            "@type": "Organization",
            name: config.companyName,
          },
          publisher: {
            "@type": "Organization",
            name: config.companyName,
          },
          mainEntityOfPage: `${siteConfig.url}/blog/${post.slug}`,
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <section className="relative min-h-[58vh] bg-ink text-paper">
        <Image
          src={post.coverImage}
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-ink/10" />
        <div className="relative mx-auto flex min-h-[58vh] max-w-4xl flex-col justify-end px-5 py-14 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
            {post.category}
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-paper/72">{post.excerpt}</p>
          <p className="mt-5 text-sm text-paper/70">
            {publishedLabel || config.companyName} · {post.category} ·{" "}
            {readingMinutes} min de lectura
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[160px_1fr]">
          <nav
            className="border-y border-ink/15 py-5"
            aria-label="Índice del artículo"
          >
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
              En esta guía
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-ink/70">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex gap-3 transition-colors hover:text-ink focus-visible:text-ink"
                  >
                    <span className="font-serif text-bronze" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 underline-offset-4 group-hover:underline">
                      {section.title}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0">
            <div className="space-y-12 md:space-y-16">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="border-b border-ink/10 pb-12 last:border-0 last:pb-0"
                  style={{ scrollMarginTop: "7rem" }}
                >
                  <h2 className="max-w-2xl font-serif text-4xl leading-tight text-ink md:text-5xl">
                    {section.title}
                  </h2>
                  <div className="mt-5 space-y-5">
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p
                        key={`${section.id}-${paragraphIndex}`}
                        className="text-lg leading-9 text-ink/72"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <aside
              className="mt-14 border-y border-ink/15 bg-mist px-6 py-8 md:px-9 md:py-10"
              aria-labelledby="blog-contextual-cta-title"
              data-testid="blog-contextual-cta"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
                {editorialContext.cta.eyebrow}
              </p>
              <h2
                id="blog-contextual-cta-title"
                className="mt-3 max-w-xl font-serif text-3xl leading-tight text-ink md:text-4xl"
              >
                {editorialContext.cta.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/72">
                {editorialContext.cta.description}
              </p>
              <Link
                href={contactHref}
                className="mt-6 inline-flex min-h-12 items-center justify-center bg-ink px-6 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
              >
                {editorialContext.cta.label}
              </Link>
            </aside>

            <section className="mt-14" aria-labelledby="related-content-title">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">
                Para seguir explorando
              </p>
              <h2
                id="related-content-title"
                className="mt-3 font-serif text-4xl text-ink"
              >
                Contenido relacionado
              </h2>
              <div className={`mt-6 grid gap-px bg-ink/15 ${relatedGridClass}`}>
                <Link
                  href={editorialContext.service.href}
                  className="group bg-paper p-6 transition-colors hover:bg-mist focus-visible:bg-mist"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                    Servicio
                  </p>
                  <h3 className="mt-3 font-serif text-2xl leading-tight text-ink group-hover:underline group-hover:underline-offset-4">
                    {editorialContext.service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-ink/70">
                    {editorialContext.service.description}
                  </p>
                </Link>
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="group bg-paper p-6 transition-colors hover:bg-mist focus-visible:bg-mist"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                      Guía
                    </p>
                    <h3 className="mt-3 font-serif text-2xl leading-tight text-ink group-hover:underline group-hover:underline-offset-4">
                      {relatedPost.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-ink/70">
                      {relatedPost.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </article>
  );
}
