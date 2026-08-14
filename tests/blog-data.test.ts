import { describe, expect, it } from "vitest";
import {
  getBlogEditorialContext,
  getPostSections,
  selectRelatedBlogPosts,
  toAnchorId,
  type PublicBlogPost,
} from "@/lib/blog-data";

function createPost(
  overrides: Partial<PublicBlogPost> = {},
): PublicBlogPost {
  return {
    title: "Guía de prueba",
    slug: "guia-de-prueba",
    excerpt: "Resumen de la guía.",
    content: "Contenido principal de la guía.",
    coverImage: "/images/blog/guia.webp",
    category: "Arquitectura",
    seoTitle: "Guía de prueba | Arqvia",
    seoDescription: "Descripción de la guía.",
    ...overrides,
  };
}

describe("blog editorial data", () => {
  it("uses content-specific headings and stable anchor ids for current guides", () => {
    const sections = getPostSections(
      createPost({
        slug: "anteproyecto-vs-proyecto-ejecutivo",
        content: [
          "El anteproyecto sirve para definir la idea principal.",
          "El proyecto ejecutivo traduce esas decisiones en información técnica.",
          "Separar ambas etapas permite ajustar la idea antes de documentar.",
        ].join("\n\n"),
      }),
    );

    expect(sections.map((section) => section.title)).toEqual([
      "El anteproyecto define la idea",
      "El proyecto ejecutivo vuelve construible esa idea",
      "Por qué conviene separar las etapas",
    ]);
    expect(sections.map((section) => section.id)).toEqual([
      "el-anteproyecto-define-la-idea",
      "el-proyecto-ejecutivo-vuelve-construible-esa-idea",
      "por-que-conviene-separar-las-etapas",
    ]);
    expect(sections.flatMap((section) => section.paragraphs)).toHaveLength(3);
  });

  it("supports authored headings and groups their paragraphs", () => {
    const sections = getPostSections(
      createPost({
        content: [
          "Una introducción breve para abrir el tema.",
          "## Alcance real",
          "Primer párrafo del alcance.",
          "Segundo párrafo del alcance.",
          "## Decisiones técnicas\nTexto inmediato de la sección.",
        ].join("\n\n"),
      }),
    );

    expect(sections).toEqual([
      {
        id: "una-introduccion-breve-para-abrir-el-tema",
        title: "Una introducción breve para abrir el tema",
        paragraphs: ["Una introducción breve para abrir el tema."],
      },
      {
        id: "alcance-real",
        title: "Alcance real",
        paragraphs: [
          "Primer párrafo del alcance.",
          "Segundo párrafo del alcance.",
        ],
      },
      {
        id: "decisiones-tecnicas",
        title: "Decisiones técnicas",
        paragraphs: ["Texto inmediato de la sección."],
      },
    ]);
  });

  it("parses authored headings without requiring blank lines around them", () => {
    const sections = getPostSections(
      createPost({
        content: [
          "Introducción que conserva su propio bloque.",
          "## Alcance real",
          "Primer renglón del alcance.",
          "Segundo renglón del mismo párrafo.",
          "## Decisiones técnicas",
          "Texto inmediato de la sección.",
        ].join("\n"),
      }),
    );

    expect(sections).toEqual([
      {
        id: "introduccion-que-conserva-su-propio-bloque",
        title: "Introducción que conserva su propio bloque",
        paragraphs: ["Introducción que conserva su propio bloque."],
      },
      {
        id: "alcance-real",
        title: "Alcance real",
        paragraphs: [
          "Primer renglón del alcance. Segundo renglón del mismo párrafo.",
        ],
      },
      {
        id: "decisiones-tecnicas",
        title: "Decisiones técnicas",
        paragraphs: ["Texto inmediato de la sección."],
      },
    ]);
  });

  it("deduplicates repeated authored anchor ids", () => {
    const sections = getPostSections(
      createPost({
        content: "## Materiales\n\nPrimera mirada.\n\n## Materiales\n\nSegunda mirada.",
      }),
    );

    expect(sections.map((section) => section.id)).toEqual([
      "materiales",
      "materiales-2",
    ]);
    expect(toAnchorId("Diseño, técnica y ejecución")).toBe(
      "diseno-tecnica-y-ejecucion",
    );
  });

  it("returns only same-category related posts without repeating the current guide", () => {
    const current = createPost({
      slug: "actual",
      category: "Construcción",
    });
    const related = selectRelatedBlogPosts(
      current,
      [
        current,
        createPost({ slug: "obra-uno", category: " Construccion " }),
        createPost({ slug: "arquitectura", category: "Arquitectura" }),
        createPost({ slug: "obra-dos", category: "Construcción" }),
        createPost({ slug: "obra-tres", category: "Construcción" }),
      ],
      2,
    );

    expect(related.map((post) => post.slug)).toEqual(["obra-uno", "obra-dos"]);
  });

  it("adapts the service and conversion message to the article topic", () => {
    const remodel = getBlogEditorialContext({ category: "Remodelaciones" });
    const construction = getBlogEditorialContext({ category: "Construcción" });
    const architecture = getBlogEditorialContext({ category: "Arquitectura" });

    expect(remodel.service.href).toBe("/servicios/remodelaciones-integrales");
    expect(remodel.cta.label).toBe("Evaluar mi remodelación");
    expect(construction.service.href).toBe(
      "/servicios/construccion-llave-en-mano",
    );
    expect(construction.cta.label).toBe("Planificar mi obra");
    expect(architecture.service.href).toBe(
      "/servicios/diseno-arquitectonico",
    );
  });
});
