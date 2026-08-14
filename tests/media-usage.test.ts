// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  blogPost: { findMany: vi.fn() },
  clientConfig: { findMany: vi.fn() },
  project: { findMany: vi.fn() },
  projectImage: { findMany: vi.fn() },
  service: { findMany: vi.fn() },
  teamMember: { findMany: vi.fn() },
  testimonial: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: database }));

import { getMediaUsage, getMediaUsageByUrls } from "@/lib/media-usage";

const firstUrl = "/uploads/first.webp";
const secondUrl = "/uploads/second.webp";

describe("media usage aggregation", () => {
  beforeEach(() => {
    for (const model of Object.values(database)) {
      model.findMany.mockReset();
      model.findMany.mockResolvedValue([]);
    }
  });

  it("groups multiple URLs with a fixed number of database queries", async () => {
    database.clientConfig.findMany.mockResolvedValue([
      { companyName: "Arqvia", heroImage: firstUrl, logoUrl: secondUrl },
      { companyName: "Estudio", heroImage: firstUrl, logoUrl: firstUrl },
    ]);
    database.project.findMany.mockResolvedValue([
      { coverImage: firstUrl, title: "Casa Patio" },
      { coverImage: secondUrl, title: "Casa Sierra" },
    ]);
    database.projectImage.findMany.mockResolvedValue([
      { project: { title: "Casa Patio" }, url: firstUrl },
    ]);
    database.service.findMany.mockResolvedValue([
      { coverImage: firstUrl, title: "Proyecto integral" },
    ]);
    database.blogPost.findMany.mockResolvedValue([
      { coverImage: secondUrl, title: "Guia de obra" },
    ]);
    database.teamMember.findMany.mockResolvedValue([
      { imageUrl: firstUrl, name: "Ana" },
    ]);
    database.testimonial.findMany.mockResolvedValue([
      { imageUrl: secondUrl, name: "Laura" },
    ]);

    const usageByUrl = await getMediaUsageByUrls([
      firstUrl,
      secondUrl,
      firstUrl,
    ]);

    expect(usageByUrl.get(firstUrl)).toEqual({
      labels: [
        "Portada de Arqvia",
        "Portada de Estudio",
        "Logo de Estudio",
        "Portada de proyecto: Casa Patio",
        "Galer\u00eda de proyecto: Casa Patio",
        "Portada de servicio: Proyecto integral",
        "Foto de equipo: Ana",
      ],
      total: 7,
    });
    expect(usageByUrl.get(secondUrl)).toEqual({
      labels: [
        "Logo de Arqvia",
        "Portada de proyecto: Casa Sierra",
        "Imagen de gu\u00eda: Guia de obra",
        "Foto de testimonio: Laura",
      ],
      total: 4,
    });

    for (const model of Object.values(database)) {
      expect(model.findMany).toHaveBeenCalledTimes(1);
    }
    expect(database.project.findMany).toHaveBeenCalledWith({
      where: { coverImage: { in: [firstUrl, secondUrl] } },
      select: { coverImage: true, title: true },
    });
  });

  it("preserves the five-label limit independently for each URL and source", async () => {
    database.project.findMany.mockResolvedValue([
      ...Array.from({ length: 6 }, (_, index) => ({
        coverImage: firstUrl,
        title: `First ${index + 1}`,
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        coverImage: secondUrl,
        title: `Second ${index + 1}`,
      })),
    ]);

    const usageByUrl = await getMediaUsageByUrls([firstUrl, secondUrl]);

    expect(usageByUrl.get(firstUrl)).toEqual({
      labels: Array.from(
        { length: 5 },
        (_, index) => `Portada de proyecto: First ${index + 1}`,
      ),
      total: 5,
    });
    expect(usageByUrl.get(secondUrl)).toEqual({
      labels: Array.from(
        { length: 5 },
        (_, index) => `Portada de proyecto: Second ${index + 1}`,
      ),
      total: 5,
    });
  });

  it("avoids database work for an empty batch", async () => {
    const usageByUrl = await getMediaUsageByUrls([]);

    expect(usageByUrl.size).toBe(0);
    for (const model of Object.values(database)) {
      expect(model.findMany).not.toHaveBeenCalled();
    }
  });

  it("keeps the single-URL API used by deletion checks", async () => {
    database.teamMember.findMany.mockResolvedValue([
      { imageUrl: firstUrl, name: "Ana" },
    ]);

    await expect(getMediaUsage(firstUrl)).resolves.toEqual({
      labels: ["Foto de equipo: Ana"],
      total: 1,
    });
  });
});
