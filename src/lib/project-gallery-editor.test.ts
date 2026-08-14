import { describe, expect, it } from "vitest";
import {
  parseProjectGallery,
  sanitizeGallerySegment,
  serializeProjectGallery,
  type ProjectGalleryEditorItem,
} from "./project-gallery-editor";

describe("project gallery serialization", () => {
  it("reads the line format used by the project server action", () => {
    expect(
      parseProjectGallery(
        [
          "/images/cocina-before.webp | before | Cocina antes | Distribución original",
          "/images/cocina-after.webp | after | Cocina después | Cocina integrada",
        ].join("\n"),
      ),
    ).toEqual([
      {
        altText: "Cocina antes",
        caption: "Distribución original",
        id: "gallery-item-1",
        type: "before",
        url: "/images/cocina-before.webp",
      },
      {
        altText: "Cocina después",
        caption: "Cocina integrada",
        id: "gallery-item-2",
        type: "after",
        url: "/images/cocina-after.webp",
      },
    ]);
  });

  it("normalizes legacy Spanish types to canonical backend values", () => {
    const items = parseProjectGallery(
      "/images/antes.webp | antes | Baño antes | Estado inicial\n/images/plano.webp | plano | Plano | Planta",
    );

    expect(items.map((item) => item.type)).toEqual(["before", "plan"]);
    expect(serializeProjectGallery(items)).toContain(" | before | ");
    expect(serializeProjectGallery(items)).toContain(" | plan | ");
  });

  it("preserves legacy caption text after additional separators", () => {
    const [item] = parseProjectGallery(
      "/images/cocina.webp | final | Cocina integrada | Isla central | Madera natural",
    );

    expect(item.caption).toBe("Isla central | Madera natural");
    expect(serializeProjectGallery([item])).toBe(
      "/images/cocina.webp | final | Cocina integrada | Isla central Madera natural",
    );
  });

  it("serializes the visual order without leaking editor identifiers", () => {
    const items: ProjectGalleryEditorItem[] = [
      {
        altText: "Fachada terminada",
        caption: "Acceso principal",
        id: "visual-only-id",
        type: "final",
        url: "/images/fachada.webp",
      },
      {
        altText: "Croquis de planta",
        caption: "Organización general",
        id: "another-id",
        type: "plan",
        url: "/images/planta.webp",
      },
    ];

    expect(serializeProjectGallery(items)).toBe(
      "/images/fachada.webp | final | Fachada terminada | Acceso principal\n/images/planta.webp | plan | Croquis de planta | Organización general",
    );
    expect(serializeProjectGallery(items)).not.toContain("visual-only-id");
  });

  it("removes separators and line breaks from editable metadata", () => {
    expect(sanitizeGallerySegment(" Cocina | integrada\ncon isla ")).toBe(
      "Cocina integrada con isla",
    );
  });
});
