import { legalPages } from "@/lib/content";

export const legalPageSlugs = [
  "privacidad",
  "terminos",
  "cookies",
  "aviso-presupuestos",
] as const;

export type LegalPageSlug = (typeof legalPageSlugs)[number];

const legalMetadata: Record<
  LegalPageSlug,
  { seoDescription: string; summary: string }
> = {
  privacidad: {
    summary:
      "Cómo tratamos la información enviada a través del sitio y los canales de consulta.",
    seoDescription:
      "Política de privacidad de Arqvia: tratamiento, finalidad y resguardo de los datos enviados por consultas.",
  },
  terminos: {
    summary:
      "Condiciones generales para navegar el sitio y consultar servicios profesionales.",
    seoDescription:
      "Términos y condiciones de Arqvia para navegar el sitio y consultar servicios de arquitectura y obra.",
  },
  cookies: {
    summary:
      "Uso de funciones técnicas, preferencias y medición opcional de navegación.",
    seoDescription:
      "Política de cookies de Arqvia: funciones necesarias, preferencias y medición opcional de navegación.",
  },
  "aviso-presupuestos": {
    summary:
      "Alcance orientativo de presupuestos iniciales y rangos de inversión.",
    seoDescription:
      "Criterios sobre presupuestos iniciales, alcances y revisión técnica en Arqvia.",
  },
};

export type LegalPageFallback = {
  content: string;
  seoDescription: string;
  seoTitle: string;
  slug: LegalPageSlug;
  summary: string;
  title: string;
};

export function isLegalPageSlug(value: string): value is LegalPageSlug {
  return legalPageSlugs.includes(value as LegalPageSlug);
}

export const legalPageDefinitions: readonly LegalPageFallback[] =
  legalPageSlugs.map((slug) => {
    const source = legalPages.find((page) => page.slug === slug);
    if (!source) {
      throw new Error(`Missing legal page baseline for ${slug}`);
    }

    return {
      content: source.content,
      seoDescription: legalMetadata[slug].seoDescription,
      seoTitle: `${source.title} | Arqvia`,
      slug,
      summary: legalMetadata[slug].summary,
      title: source.title,
    };
  });

export function getLegalPageFallback(slug: LegalPageSlug) {
  return legalPageDefinitions.find((page) => page.slug === slug)!;
}
