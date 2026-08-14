import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  revalidateAreaSurfaces,
  revalidateFaqSurfaces,
  revalidateLeadSurfaces,
} from "@/lib/revalidation";

describe("CMS revalidation policy", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
  });

  it("revalidates area pages through the dynamic pattern without scanning the database", () => {
    revalidateAreaSurfaces(["slug-anterior", "slug-anterior", ""]);

    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/", "layout"],
      ["/zonas"],
      ["/zonas/[slug]", "page"],
      ["/sitemap.xml"],
      ["/admin"],
      ["/admin/areas"],
      ["/zonas/slug-anterior"],
    ]);
  });

  it("revalidates FAQ and every dynamic area page selectively", () => {
    revalidateFaqSurfaces();

    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/"],
      ["/faq"],
      ["/zonas/[slug]", "page"],
      ["/admin"],
      ["/admin/faq"],
    ]);
  });

  it("keeps lead revalidation scoped to operational surfaces", () => {
    revalidateLeadSurfaces("lead-1");

    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/admin"],
      ["/admin/leads"],
      ["/admin/visitas"],
      ["/admin/reports"],
      ["/admin/activity"],
      ["/admin/leads/lead-1"],
    ]);
  });
});
