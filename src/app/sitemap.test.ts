import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  areas: vi.fn(),
  blogPosts: vi.fn(),
  legalPages: vi.fn(),
  projects: vi.fn(),
  services: vi.fn(),
}));

vi.mock("@/lib/area-data", () => ({ getPublicAreas: mocks.areas }));
vi.mock("@/lib/blog-data", () => ({ getPublicBlogPosts: mocks.blogPosts }));
vi.mock("@/lib/legal-data", () => ({
  getApprovedPublicLegalPages: mocks.legalPages,
}));
vi.mock("@/lib/project-data", () => ({ getPublicProjects: mocks.projects }));
vi.mock("@/lib/service-data", () => ({ getPublicServices: mocks.services }));
vi.mock("@/lib/local-seo", () => ({ localSeoPages: [] }));
vi.mock("@/lib/site-config", () => ({
  siteConfig: { url: "https://arqvia.example.com" },
}));

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  beforeEach(() => {
    mocks.areas.mockResolvedValue([]);
    mocks.blogPosts.mockResolvedValue([]);
    mocks.legalPages.mockResolvedValue([]);
    mocks.projects.mockResolvedValue([]);
    mocks.services.mockResolvedValue([]);
  });

  it("excludes legal fallbacks that have not been approved", async () => {
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).not.toContain(
      "https://arqvia.example.com/privacidad",
    );
  });

  it("includes an approved legal document with its real update date", async () => {
    const updatedAt = new Date("2026-08-20T12:00:00.000Z");
    mocks.legalPages.mockResolvedValue([
      { slug: "privacidad", updatedAt },
    ]);

    const entries = await sitemap();
    expect(entries).toContainEqual(
      expect.objectContaining({
        lastModified: updatedAt,
        url: "https://arqvia.example.com/privacidad",
      }),
    );
  });
});
