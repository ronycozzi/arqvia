import { describe, expect, it } from "vitest";
import {
  buildMediaRightsData,
  evaluatePublicMediaRights,
  isMediaRightsApproved,
  mediaRightsSchema,
} from "@/lib/media-rights";

const approvalDate = new Date("2026-07-15T12:00:00.000Z");
const now = new Date("2026-07-15T13:00:00.000Z");

describe("media rights", () => {
  it("normalizes optional provenance and requires evidence before approval", () => {
    const pending = mediaRightsSchema.safeParse({
      rightsApproved: false,
      rightsNote: "  ",
      sourceUrl: "",
    });
    expect(pending).toMatchObject({
      success: true,
      data: { rightsApproved: false, rightsNote: null, sourceUrl: null },
    });

    const missingEvidence = mediaRightsSchema.safeParse({
      rightsApproved: true,
      rightsNote: "Propia",
      sourceUrl: "",
    });
    expect(missingEvidence.success).toBe(false);
    if (!missingEvidence.success) {
      expect(missingEvidence.error.flatten().fieldErrors.rightsNote).toEqual([
        "Describí la licencia, autoría o autorización antes de aprobar.",
      ]);
    }
  });

  it("accepts only public HTTP(S) source URLs without embedded credentials", () => {
    expect(
      mediaRightsSchema.safeParse({
        rightsApproved: false,
        rightsNote: "",
        sourceUrl: "https://fotografo.example/obra/12",
      }).success,
    ).toBe(true);
    expect(
      mediaRightsSchema.safeParse({
        rightsApproved: false,
        rightsNote: "",
        sourceUrl: "ftp://fotografo.example/obra/12",
      }).success,
    ).toBe(false);
    expect(
      mediaRightsSchema.safeParse({
        rightsApproved: false,
        rightsNote: "",
        sourceUrl: "https://usuario:secreto@fotografo.example/obra/12",
      }).success,
    ).toBe(false);
  });

  it("creates a complete server-side approval and rejects partial or future states", () => {
    const approved = buildMediaRightsData(
      {
        rightsApproved: true,
        rightsNote: "Fotografía propia autorizada para web institucional.",
        sourceUrl: null,
      },
      "Ana Editora",
      approvalDate,
    );

    expect(approved).toEqual({
      rightsApprovedAt: approvalDate,
      rightsApprovedBy: "Ana Editora",
      rightsNote: "Fotografía propia autorizada para web institucional.",
      sourceUrl: null,
    });
    expect(isMediaRightsApproved(approved, now)).toBe(true);
    expect(
      isMediaRightsApproved(
        { ...approved, rightsApprovedAt: "2026-07-16T12:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isMediaRightsApproved({ ...approved, rightsApprovedBy: null }, now),
    ).toBe(false);
  });

  it("counts unique public references without approval and without a library record", () => {
    const snapshot = evaluatePublicMediaRights(
      ["/media/approved.webp", "/media/pending.webp", "/media/missing.webp", "/media/missing.webp"],
      [
        {
          rightsApprovedAt: approvalDate,
          rightsApprovedBy: "Ana Editora",
          rightsNote: "Licencia adquirida para publicación institucional.",
          url: "/media/approved.webp",
        },
        {
          rightsApprovedAt: null,
          rightsApprovedBy: null,
          rightsNote: "Autoría todavía no confirmada.",
          url: "/media/pending.webp",
        },
      ],
      now,
    );

    expect(snapshot).toEqual({
      publicMedia: 3,
      unapprovedPublicMedia: 2,
      untrackedPublicMedia: 1,
    });
  });
});
