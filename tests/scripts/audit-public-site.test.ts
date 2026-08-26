import { describe, expect, it } from "vitest";
import {
  auditPublicDocument,
  parseSitemapUrls,
  resolveAuditOrigin,
} from "../../scripts/audit-public-site";

const origin = "https://arqvia.example.com";

function documentHtml({
  body = "<h1>Arquitectura clara</h1>",
  canonical = "/proyectos",
  title = "Proyectos | Arqvia",
}: {
  body?: string;
  canonical?: string;
  title?: string;
} = {}) {
  return `<!doctype html><html><head><title>${title}</title><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:image" content="${origin}/images/hero.webp"></head><body>${body}<a href="/contacto?origen=proyectos">Contacto</a></body></html>`;
}

describe("public site audit", () => {
  it("resolves only clean HTTP origins", () => {
    expect(resolveAuditOrigin(["--url", origin])).toBe(origin);
    expect(resolveAuditOrigin([`--url=${origin}`])).toBe(origin);
    expect(() => resolveAuditOrigin(["--url", `${origin}/ruta`])).toThrow();
    expect(() => resolveAuditOrigin(["--unknown"])).toThrow();
  });

  it("extracts same-origin page paths from the sitemap", () => {
    expect(
      parseSitemapUrls(
        `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/proyectos</loc></url><url><loc>https://external.example/page</loc></url></urlset>`,
        origin,
      ),
    ).toEqual(["/", "/proyectos"]);
  });

  it("accepts a healthy, canonical public document and discovers links", () => {
    expect(
      auditPublicDocument({
        contentType: "text/html; charset=utf-8",
        finalUrl: `${origin}/proyectos`,
        html: documentHtml(),
        origin,
        requestedPath: "/proyectos",
        status: 200,
      }),
    ).toMatchObject({
      issues: [],
      links: ["/contacto"],
      title: "Proyectos | Arqvia",
    });
  });

  it("blocks broken semantics, mismatched canonicals and internal copy", () => {
    const result = auditPublicDocument({
      contentType: "text/plain",
      finalUrl: `${origin}/contacto`,
      html: documentHtml({
        body: "<p>Datos demo. contacto@arqvia.example</p>",
        canonical: "/otra-ruta",
        title: "",
      }),
      origin,
      requestedPath: "/contacto",
      status: 500,
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        "expected HTTP 200, received 500",
        "missing document title",
        "expected exactly one H1, received 0",
        "missing Open Graph title",
        "canonical path /otra-ruta does not match /contacto",
        "contains forbidden public phrase: datos demo",
        "contains an example-domain contact email",
      ]),
    );
  });

  it("requires one visible H1 and branded browser and social titles", () => {
    const result = auditPublicDocument({
      contentType: "text/html",
      finalUrl: `${origin}/proyectos`,
      html: documentHtml({
        body: "<h1>Proyectos</h1><h1>Obras</h1><script>const hidden = '<h1>RSC</h1>';</script>",
        title: "Proyectos",
      }),
      origin,
      requestedPath: "/proyectos",
      status: 200,
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        "document title does not include Arqvia",
        "expected exactly one H1, received 2",
        "Open Graph title does not include Arqvia",
      ]),
    );
  });
});
