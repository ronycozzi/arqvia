import { describe, expect, test } from "vitest";
import {
  getAvailableServiceProjectSlugs,
  getRecommendedProjectSlugs,
} from "../src/lib/service-project-mapping";

describe("service project mapping", () => {
  test("provides relevant portfolio evidence for specialist services", () => {
    expect(getRecommendedProjectSlugs("documentacion-tecnica")).toContain(
      "casa-patio-norte",
    );
    expect(getRecommendedProjectSlugs("oficinas")).toEqual([
      "oficina-umbral",
    ]);
    expect(getRecommendedProjectSlugs("locales-comerciales")).toEqual([
      "local-sierra",
    ]);
  });

  test("returns an empty list for unknown services", () => {
    expect(getRecommendedProjectSlugs("servicio-inexistente")).toEqual([]);
  });

  test("counts direct and editorially related projects without duplicates", () => {
    expect(
      getAvailableServiceProjectSlugs({
        availableProjectSlugs: ["casa-patio-norte", "oficina-umbral"],
        directProjectSlugs: ["casa-patio-norte"],
        serviceSlug: "construccion-llave-en-mano",
      }),
    ).toEqual(["casa-patio-norte"]);

    expect(
      getAvailableServiceProjectSlugs({
        availableProjectSlugs: ["casa-patio-norte"],
        directProjectSlugs: [],
        serviceSlug: "documentacion-tecnica",
      }),
    ).toEqual(["casa-patio-norte"]);
  });
});
