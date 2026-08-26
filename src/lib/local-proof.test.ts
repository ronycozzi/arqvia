import { describe, expect, it } from "vitest";
import {
  locationMatchesArea,
  projectMatchesLocalService,
} from "@/lib/local-proof";

describe("local project proof", () => {
  it("matches accented locations without turning unrelated places into proof", () => {
    expect(locationMatchesArea("Córdoba Capital", "Cordoba")).toBe(true);
    expect(locationMatchesArea("Villa Allende", "Córdoba")).toBe(false);
    expect(locationMatchesArea("Zona Norte Córdoba", "Zona Norte Córdoba")).toBe(
      true,
    );
  });

  it("requires both an exact service relation and a matching area", () => {
    expect(
      projectMatchesLocalService({
        area: "Villa Allende",
        location: "Villa Allende",
        projectServiceSlug: "construccion-llave-en-mano",
        serviceSlug: "construccion-llave-en-mano",
      }),
    ).toBe(true);
    expect(
      projectMatchesLocalService({
        area: "Villa Allende",
        location: "Villa Allende",
        projectServiceSlug: "diseno-arquitectonico",
        serviceSlug: "construccion-llave-en-mano",
      }),
    ).toBe(false);
    expect(
      projectMatchesLocalService({
        area: "Villa Allende",
        location: "Villa Allende",
        projectServiceSlug: "construccion-llave-en-mano",
        serviceSlug: null,
      }),
    ).toBe(false);
  });
});
