import { describe, expect, it } from "vitest";
import {
  buildContactHref,
  buildContextualWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "../src/lib/utils";

describe("buildWhatsAppUrl", () => {
  it("uses a safe Arqvia fallback phone number when no WhatsApp is configured", () => {
    const url = buildWhatsAppUrl("Hola, quiero consultar por un proyecto.");

    expect(url).toContain("https://wa.me/5493515551234?text=");
    expect(url).not.toContain("wa.me/text=");
  });

  it("uses an explicit configured phone number when available", () => {
    const url = buildWhatsAppUrl(
      "Hola, quiero consultar por un proyecto.",
      "+54 9 351 555 1212",
    );

    expect(url).toContain("https://wa.me/5493515551212?text=");
  });

  it("never redirects an invalid explicit value to an unrelated number", () => {
    expect(buildWhatsAppUrl("Hola", "sin numero")).toBe("/contacto");
    expect(normalizeWhatsAppNumber("123")).toBeNull();
    expect(normalizeWhatsAppNumber("+54 9 351 555 1212")).toBe(
      "5493515551212",
    );
  });
});

describe("buildContactHref", () => {
  it("preserves the public source page for quote attribution", () => {
    expect(buildContactHref("/remodelacion-de-cocinas-cordoba")).toBe(
      "/contacto?origen=%2Fremodelacion-de-cocinas-cordoba",
    );
    expect(buildContactHref("/proyectos/casa-patio-norte")).toBe(
      "/contacto?origen=%2Fproyectos%2Fcasa-patio-norte",
    );
  });

  it("keeps neutral contact links for home, contact and admin paths", () => {
    expect(buildContactHref("/")).toBe("/contacto");
    expect(buildContactHref("/contacto")).toBe("/contacto");
    expect(buildContactHref("/admin")).toBe("/contacto");
  });
});

describe("buildContextualWhatsAppMessage", () => {
  it("keeps the configured message on general conversion pages", () => {
    expect(
      buildContextualWhatsAppMessage({
        companyName: "Arqvia",
        fallback: "Hola desde Arqvia",
        pathname: "/",
      }),
    ).toBe("Hola desde Arqvia");
  });

  it("preserves the project path in persistent WhatsApp actions", () => {
    expect(
      buildContextualWhatsAppMessage({
        companyName: "Arqvia",
        fallback: "Hola",
        pathname: "/proyectos/casa-patio-norte?origen=home",
      }),
    ).toContain("Referencia: /proyectos/casa-patio-norte");
  });
});
