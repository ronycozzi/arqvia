import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ prisma: {} }));
import { isEditorialTestimonial } from "./testimonial-data";
import { projects, testimonials } from "./content";

describe("public testimonial provenance", () => {
  it("excludes imported seed quotes even when whitespace or casing was edited", () => {
    expect(isEditorialTestimonial({ quote: ` ${testimonials[0].quote.toUpperCase()} ` })).toBe(false);
  });
  it("does not exclude a different editorial testimonial", () => {
    expect(isEditorialTestimonial({ quote: "Una experiencia aportada por una persona y revisada por el estudio." })).toBe(true);
  });
  it("excludes seeded project quotes and empty quotes", () => {
    for (const project of projects) {
      expect(isEditorialTestimonial({ quote: project.testimonial || "" })).toBe(false);
    }
    expect(isEditorialTestimonial({ quote: "   " })).toBe(false);
  });
});
