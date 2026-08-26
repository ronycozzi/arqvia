import { describe, expect, it } from "vitest";
import { hasApprovedLegalReview } from "@/lib/legal-approval";

describe("hasApprovedLegalReview", () => {
  const reviewedPage = {
    reviewedAt: new Date("2026-08-20T12:00:00.000Z"),
    reviewedBy: "Estudio legal externo",
    status: "PUBLISHED",
  };

  it("accepts only a published document with a real review record", () => {
    expect(hasApprovedLegalReview(reviewedPage)).toBe(true);
  });

  it.each([
    [{ ...reviewedPage, status: "DRAFT" }],
    [{ ...reviewedPage, reviewedAt: null }],
    [{ ...reviewedPage, reviewedBy: "   " }],
    [null],
  ])("rejects an incomplete approval record", (page) => {
    expect(hasApprovedLegalReview(page)).toBe(false);
  });
});
