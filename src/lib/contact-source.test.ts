import { describe, expect, it } from "vitest";
import { resolveContactSource } from "@/lib/contact-source";

const dynamicLabels = new Map([
  ["/proyectos/casa-patio-norte", "proyecto Casa Patio Norte"],
  ["/servicios/remodelaciones-integrales", "servicio Remodelaciones integrales"],
]);

describe("resolveContactSource", () => {
  it("keeps known static and section sources", () => {
    expect(resolveContactSource("/proyectos?tipo=residencial", dynamicLabels)).toEqual({
      label: "portfolio de proyectos",
      sourcePage: "/proyectos",
    });
    expect(resolveContactSource("/#home-before-after", dynamicLabels)).toEqual({
      label: "comparador antes y después",
      sourcePage: "/#home-before-after",
    });
  });

  it("accepts only dynamic routes supplied by public content", () => {
    expect(
      resolveContactSource("/proyectos/casa-patio-norte#consulta", dynamicLabels),
    ).toEqual({
      label: "proyecto Casa Patio Norte",
      sourcePage: "/proyectos/casa-patio-norte",
    });
  });

  it.each(["/admin", "/demo-interno", "https://malicious.example/path", "javascript:alert(1)"])(
    "falls back safely for an unrecognized source: %s",
    (source) => {
      expect(resolveContactSource(source, dynamicLabels)).toEqual({
        label: "",
        sourcePage: "/contacto",
      });
    },
  );
});
