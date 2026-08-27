import Image from "next/image";
import Link from "next/link";
import { getPublicBlogPosts } from "@/lib/blog-data";
import { createPageMetadata } from "@/lib/seo";

export const generateMetadata = createPageMetadata({
  title: "Blog y guías",
  description:
    "Guías de arquitectura, construcción, remodelación e interiorismo para tomar mejores decisiones antes de iniciar un proyecto.",
  canonical: "/blog",
});

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const blogPosts = await getPublicBlogPosts();

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze">
        Blog
      </p>
      <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl">
        Guías para ordenar decisiones antes de diseñar, construir o remodelar.
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/75">
        Lecturas concretas para comparar alternativas, entender alcances y llegar
        a la primera consulta con mejores decisiones sobre diseño, obra e inversión.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {blogPosts.map((post, index) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="premium-card group block overflow-hidden"
          >
            <div className="image-sheen relative aspect-[4/3] overflow-hidden bg-stone">
              <Image
                src={post.coverImage}
                alt={`Imagen guía ${post.title}`}
                fill
                preload={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
                {post.category}
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-ink">
                {post.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/75">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
