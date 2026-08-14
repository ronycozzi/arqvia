// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  blogPost: { findMany: vi.fn() },
  clientConfig: { findMany: vi.fn() },
  mediaAsset: { findMany: vi.fn() },
  project: { findMany: vi.fn() },
  service: { findMany: vi.fn() },
  teamMember: { findMany: vi.fn() },
  testimonial: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: database }));

import { getPublicMediaRightsSnapshot } from "@/lib/media-rights-readiness";

const now = new Date("2026-07-15T13:00:00.000Z");
const approval = {
  rightsApprovedAt: new Date("2026-07-15T12:00:00.000Z"),
  rightsApprovedBy: "Ana Editora",
  rightsNote: "Fotografía propia autorizada para web institucional.",
};

describe("public media rights readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of Object.values(database)) {
      model.findMany.mockResolvedValue([]);
    }
  });

  it("collects only public content surfaces and treats a missing asset as unapproved", async () => {
    database.clientConfig.findMany.mockResolvedValue([
      { heroImage: "/media/hero.webp", logoUrl: null },
    ]);
    database.project.findMany.mockResolvedValue([
      {
        coverImage: "/media/project.webp",
        images: [{ url: "/media/gallery.webp" }],
      },
    ]);
    database.mediaAsset.findMany.mockResolvedValue([
      { ...approval, url: "/media/hero.webp" },
      { ...approval, url: "/media/project.webp" },
    ]);

    await expect(getPublicMediaRightsSnapshot(now)).resolves.toEqual({
      publicMedia: 3,
      unapprovedPublicMedia: 1,
      untrackedPublicMedia: 1,
    });
    expect(database.project.findMany).toHaveBeenCalledWith({
      where: {
        publicationStatus: "PUBLISHED",
        publishedAt: { lte: now },
      },
      select: {
        coverImage: true,
        images: { select: { url: true } },
      },
    });
    expect(database.teamMember.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { imageUrl: true },
    });
    expect(database.mediaAsset.findMany).toHaveBeenCalledWith({
      where: {
        url: {
          in: [
            "/media/hero.webp",
            "/media/project.webp",
            "/media/gallery.webp",
          ],
        },
      },
      select: {
        rightsApprovedAt: true,
        rightsApprovedBy: true,
        rightsNote: true,
        url: true,
      },
    });
  });

  it("skips the asset query when no public media is referenced", async () => {
    await expect(getPublicMediaRightsSnapshot(now)).resolves.toEqual({
      publicMedia: 0,
      unapprovedPublicMedia: 0,
      untrackedPublicMedia: 0,
    });
    expect(database.mediaAsset.findMany).not.toHaveBeenCalled();
  });
});
