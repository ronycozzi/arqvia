import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { blogPosts, imageKit, projects, services, team } from "../src/lib/content";
import {
  formatMediaBytes,
  isAllowedMediaMimeType,
  isMediaAssetCategory,
  mediaUploadMaxBytes,
} from "../src/lib/media";
import { siteConfig } from "../src/lib/site-config";

const workspaceRoot = process.cwd();

function publicAssetExists(src: string) {
  if (!src.startsWith("/")) return false;
  return existsSync(join(workspaceRoot, "public", src));
}

describe("media integrity", () => {
  it("keeps primary portfolio, service and blog covers as local assets", () => {
    const primaryImages = [
      imageKit.hero,
      imageKit.house,
      imageKit.office,
      imageKit.commercial,
      imageKit.construction,
      imageKit.sketch,
      imageKit.before,
      imageKit.after,
      imageKit.bathroomBefore,
      imageKit.bathroomAfter,
      imageKit.remodeling,
      imageKit.teamA,
      imageKit.teamB,
      imageKit.teamC,
      ...projects.map((project) => project.coverImage),
      ...services.map((service) => service.coverImage),
      ...blogPosts.map((post) => post.coverImage),
      ...team.map((member) => member.imageUrl),
    ];

    for (const src of primaryImages) {
      expect(src, `${src} should be local`).toMatch(/^\/images\//);
      expect(publicAssetExists(src), `${src} should exist in public/`).toBe(true);
    }
  });

  it("keeps the bathroom comparison sharp and aligned", async () => {
    const before = await sharp(
      join(workspaceRoot, "public", imageKit.bathroomBefore),
    ).metadata();
    const after = await sharp(
      join(workspaceRoot, "public", imageKit.bathroomAfter),
    ).metadata();

    expect(before.width).toBeGreaterThanOrEqual(1500);
    expect(before.height).toBeGreaterThanOrEqual(900);
    expect({ width: after.width, height: after.height }).toEqual({
      width: before.width,
      height: before.height,
    });
  });

  it("keeps the Cocina Terracota comparison sharp and aligned", async () => {
    const before = await sharp(
      join(workspaceRoot, "public", imageKit.before),
    ).metadata();
    const after = await sharp(
      join(workspaceRoot, "public", imageKit.after),
    ).metadata();

    expect(before.width).toBeGreaterThanOrEqual(1500);
    expect(before.height).toBeGreaterThanOrEqual(900);
    expect({ width: after.width, height: after.height }).toEqual({
      width: before.width,
      height: before.height,
    });
  });

  it("keeps the integral remodeling service cover production-ready", async () => {
    const image = await sharp(
      join(workspaceRoot, "public", imageKit.remodeling),
    ).metadata();
    const remodeling = services.find(
      (service) => service.slug === "remodelaciones-integrales",
    );

    expect(image.width).toBe(1600);
    expect(image.height).toBe(1000);
    expect(remodeling?.coverImage).toBe(imageKit.remodeling);
  });

  it("does not expose generic social profile URLs as Arqvia identity", () => {
    expect(siteConfig.socials.instagram).toBe("");
    expect(siteConfig.socials.linkedin).toBe("");
    expect(siteConfig.socials.facebook).toBe("");
    expect(team.map((member) => member.linkedinUrl).filter(Boolean)).toEqual([]);
  });

  it("keeps media upload categories and formats constrained", () => {
    expect(isMediaAssetCategory("Proyecto")).toBe(true);
    expect(isMediaAssetCategory("Categoria improvisada")).toBe(false);
    expect(isAllowedMediaMimeType("image/webp")).toBe(true);
    expect(isAllowedMediaMimeType("image/svg+xml")).toBe(false);
    expect(formatMediaBytes(mediaUploadMaxBytes)).toBe("5.0 MB");
  });
});
