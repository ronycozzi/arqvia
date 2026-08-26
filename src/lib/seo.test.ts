import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "@/lib/seo";

describe("buildPageMetadata", () => {
  it("brands an unbranded title explicitly for every route", () => {
    const metadata = buildPageMetadata({
      canonical: "/proceso",
      description: "Proceso de trabajo de Arqvia para proyectos en Córdoba.",
      title: "Cómo trabajamos",
    });

    expect(metadata.title).toEqual({ absolute: "Cómo trabajamos | Arqvia" });
    expect(metadata.openGraph?.title).toBe("Cómo trabajamos | Arqvia");
  });

  it("marks an already branded title as absolute and aligns social metadata", () => {
    const metadata = buildPageMetadata(
      {
        canonical: "/nosotros",
        description: "Equipo y metodología de trabajo para proyectos de arquitectura.",
        title: "Nosotros y equipo | Marca anterior",
      },
      { companyName: "Arqvia", heroImage: "/images/hero.webp" },
    );

    expect(metadata.title).toEqual({ absolute: "Nosotros y equipo | Arqvia" });
    expect(metadata.openGraph?.title).toBe("Nosotros y equipo | Arqvia");
    expect(metadata.twitter?.title).toBe("Nosotros y equipo | Arqvia");
  });
});
