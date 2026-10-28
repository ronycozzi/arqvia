import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/area-data", () => ({ getPublicAreas: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/blog-data", () => ({ getPublicBlogPosts: vi.fn().mockResolvedValue([{ slug: "guia", publishedAt: new Date("2026-10-15T12:00:00Z") }]) }));
vi.mock("@/lib/legal-data", () => ({ getApprovedPublicLegalPages: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/project-data", () => ({ getPublicProjects: vi.fn().mockResolvedValue([{ slug: "casa", updatedAt: new Date("2026-10-20T12:00:00Z") }]) }));
vi.mock("@/lib/service-data", () => ({ getPublicServices: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/site-config", () => ({ siteConfig: { url: "https://arqvia.example" } }));
import sitemap from "@/app/sitemap";

describe("sitemap freshness", () => {
  it("does not fabricate static modification dates and keeps actual editorial dates", async () => {
    const entries = await sitemap();
    expect(entries.find((entry) => entry.url === "https://arqvia.example/blog")).not.toHaveProperty("lastModified");
    expect(entries.find((entry) => entry.url.endsWith("/proyectos/casa"))?.lastModified).toEqual(new Date("2026-10-20T12:00:00Z"));
    expect(entries.find((entry) => entry.url.endsWith("/blog/guia"))?.lastModified).toEqual(new Date("2026-10-15T12:00:00Z"));
    expect(entries.every((entry) => entry.url.startsWith("https://arqvia.example"))).toBe(true);
    expect(entries.some((entry) => /admin|gracias|api\//.test(entry.url))).toBe(false);
  });
});
