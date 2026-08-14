import type { BlogPost } from "@prisma/client";
import { cache } from "react";
import { blogPosts as seedBlogPosts } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  canUseSeedContent,
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "@/lib/public-content-policy";

export type PublicBlogPost = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  seoTitle: string;
  seoDescription: string;
};

export type PublicBlogSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type BlogEditorialContext = {
  cta: {
    eyebrow: string;
    title: string;
    description: string;
    label: string;
  };
  service: {
    href: string;
    title: string;
    description: string;
  };
};

const editorialHeadingsBySlug: Record<string, string[]> = {
  "construccion-llave-en-mano": ["Qué abarca una obra llave en mano"],
  "como-elegir-arquitecto": ["Criterios para elegir con más claridad"],
  "cuanto-cuesta-remodelar-cocina": ["Qué variables definen la inversión"],
  "anteproyecto-vs-proyecto-ejecutivo": [
    "El anteproyecto define la idea",
    "El proyecto ejecutivo vuelve construible esa idea",
    "Por qué conviene separar las etapas",
  ],
  "planificar-remodelacion-sin-errores": [
    "El diagnóstico ocurre antes de demoler",
    "Ordenar el alcance por rubros",
    "Resolver materiales antes de empezar",
  ],
  "que-mirar-antes-de-comprar-terreno": [
    "Leer el terreno más allá de la ubicación",
    "Confirmar qué se puede construir",
    "Qué información reunir antes de avanzar",
  ],
  "ordenar-presupuesto-de-obra": [
    "Qué debe explicar un presupuesto claro",
    "Cómo comparar propuestas equivalentes",
    "Dividir la inversión por etapas",
  ],
  "steel-frame-vs-construccion-tradicional": [
    "No hay un sistema ideal para todos",
    "Qué aporta cada alternativa",
    "El sistema tiene que servir al proyecto",
  ],
  "disenar-casa-luminosa": [
    "La luz se diseña desde la orientación",
    "Controlar luz, calor y privacidad",
    "Pensar el confort antes que la imagen",
  ],
  "permisos-antes-de-construir": [
    "Los requisitos cambian según cada obra",
    "Documentación que puede ser necesaria",
    "Revisar antes de comenzar",
  ],
};

const architectureContext: BlogEditorialContext = {
  cta: {
    eyebrow: "Aplicar estos criterios",
    title: "Revisemos el punto de partida de tu proyecto.",
    description:
      "Podemos evaluar terreno, necesidades, alcance y prioridades antes de avanzar con decisiones de diseño.",
    label: "Evaluar mi proyecto",
  },
  service: {
    href: "/servicios/diseno-arquitectonico",
    title: "Diseño arquitectónico",
    description:
      "De la idea inicial a una propuesta espacial y técnica lista para avanzar.",
  },
};

const constructionContext: BlogEditorialContext = {
  cta: {
    eyebrow: "Antes de iniciar la obra",
    title: "Ordenemos alcance, etapas y decisiones críticas.",
    description:
      "Revisamos el estado del proyecto para definir documentación, presupuesto y próximos pasos con mayor claridad.",
    label: "Planificar mi obra",
  },
  service: {
    href: "/servicios/construccion-llave-en-mano",
    title: "Construcción llave en mano",
    description:
      "Planificación, coordinación técnica y ejecución desde el proyecto hasta la entrega.",
  },
};

const remodelingContext: BlogEditorialContext = {
  cta: {
    eyebrow: "Transformar con un plan claro",
    title: "Definamos qué conviene conservar, cambiar y priorizar.",
    description:
      "Una evaluación inicial permite ordenar la intervención, anticipar rubros y reducir cambios durante la ejecución.",
    label: "Evaluar mi remodelación",
  },
  service: {
    href: "/servicios/remodelaciones-integrales",
    title: "Remodelaciones integrales",
    description:
      "Diagnóstico, diseño y ejecución coordinada para viviendas y espacios comerciales.",
  },
};

function toPublicBlogPost(post: BlogPost): PublicBlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    category: post.category,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
  };
}

function seedToPublicBlogPost(
  post: (typeof seedBlogPosts)[number],
): PublicBlogPost {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    category: post.category,
    publishedAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
  };
}

export const getPublicBlogPosts = cache(async (): Promise<PublicBlogPost[]> => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });

    if (posts.length) return posts.map(toPublicBlogPost);

    const postCount = await prisma.blogPost.count();
    return postCount === 0
      ? seedCollectionOrEmpty(seedBlogPosts.map(seedToPublicBlogPost))
      : [];
  } catch (error) {
    return fallbackPublicContent(
      "blog posts",
      seedBlogPosts.map(seedToPublicBlogPost),
      error,
    );
  }
});

export const getPublicBlogPost = cache(async (
  slug: string,
): Promise<PublicBlogPost | null> => {
  try {
    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
    });

    if (post) return toPublicBlogPost(post);

    if (!canUseSeedContent()) return null;

    const postCount = await prisma.blogPost.count();
    if (postCount > 0) return null;
  } catch (error) {
    return fallbackPublicContent(
      "blog post detail",
      seedBlogPosts.map(seedToPublicBlogPost).find((item) => item.slug === slug) || null,
      error,
    );
  }

  return seedCollectionOrEmpty(seedBlogPosts.map(seedToPublicBlogPost)).find(
    (item) => item.slug === slug,
  ) || null;
});

export const getRelatedPublicBlogPosts = cache(async (
  post: PublicBlogPost,
  limit = 2,
): Promise<PublicBlogPost[]> => {
  const posts = await getPublicBlogPosts();
  return selectRelatedBlogPosts(post, posts, limit);
});

export function selectRelatedBlogPosts(
  post: PublicBlogPost,
  posts: PublicBlogPost[],
  limit = 2,
) {
  const category = normalizeTopic(post.category);

  return posts
    .filter(
      (candidate) =>
        candidate.slug !== post.slug &&
        normalizeTopic(candidate.category) === category,
    )
    .slice(0, Math.max(0, limit));
}

export function getBlogEditorialContext(
  post: Pick<PublicBlogPost, "category">,
): BlogEditorialContext {
  const category = normalizeTopic(post.category);

  if (category.includes("remodel")) return remodelingContext;
  if (category.includes("constru")) return constructionContext;
  return architectureContext;
}

export function getPostSections(post: PublicBlogPost): PublicBlogSection[] {
  const explicitSections = parseExplicitSections(post.content);
  const rawSections: Array<{ title?: string; paragraphs: string[] }> = explicitSections.length
    ? explicitSections
    : splitParagraphs(post.content).map((paragraph) => ({
        paragraphs: [paragraph],
      }));
  const preferredHeadings = editorialHeadingsBySlug[post.slug] || [];
  const usedIds = new Map<string, number>();

  return rawSections.map((section, index) => {
    const title =
      section.title ||
      preferredHeadings[index] ||
      deriveHeading(section.paragraphs[0], index);
    const baseId = toAnchorId(title) || `seccion-${index + 1}`;
    const duplicateCount = usedIds.get(baseId) || 0;
    usedIds.set(baseId, duplicateCount + 1);

    return {
      id: duplicateCount ? `${baseId}-${duplicateCount + 1}` : baseId,
      title,
      paragraphs: section.paragraphs,
    };
  });
}

export function toAnchorId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeTopic(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function splitParagraphs(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function parseExplicitSections(content: string) {
  if (!/^##\s+/m.test(content)) return [];

  const sections: Array<{ title?: string; paragraphs: string[] }> = [];
  let current: { title?: string; paragraphs: string[] } = { paragraphs: [] };
  let paragraphLines: string[] = [];

  function flushParagraph() {
    const paragraph = paragraphLines.join(" ").trim();
    if (paragraph) current.paragraphs.push(paragraph);
    paragraphLines = [];
  }

  function flushSection() {
    flushParagraph();
    if (current.paragraphs.length) sections.push(current);
  }

  for (const rawLine of content.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      flushSection();
      current = { title: heading[1].trim(), paragraphs: [] };
      continue;
    }

    if (!line) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(line);
  }

  flushSection();
  return sections;
}

function deriveHeading(paragraph: string, index: number) {
  const firstSentence = paragraph.split(/(?<=[.!?])\s/)[0]?.trim() || "";
  const withoutPunctuation = firstSentence.replace(/[.!?]+$/, "");
  const words = withoutPunctuation.split(/\s+/).filter(Boolean);

  if (!words.length) return `Sección ${index + 1}`;
  if (words.length <= 11) return withoutPunctuation;
  return `${words.slice(0, 9).join(" ")}…`;
}
