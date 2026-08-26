export type LegalApprovalFields = {
  reviewedAt: Date | null;
  reviewedBy: string | null;
  status: string;
};

export function hasApprovedLegalReview(
  page: LegalApprovalFields | null | undefined,
) {
  return Boolean(
    page?.status === "PUBLISHED" &&
      page.reviewedAt instanceof Date &&
      !Number.isNaN(page.reviewedAt.getTime()) &&
      page.reviewedBy?.trim(),
  );
}
