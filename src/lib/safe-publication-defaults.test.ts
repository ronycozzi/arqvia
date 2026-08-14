import { describe, expect, it } from "vitest";
import { projectFormSchema, serviceFormSchema } from "@/lib/validations";

describe("safe publication defaults", () => {
  it("keeps projects as drafts when the status field is absent", () => {
    expect(projectFormSchema.shape.publicationStatus.parse(undefined)).toBe(
      "DRAFT",
    );
  });

  it("keeps services as drafts when the status field is absent", () => {
    expect(serviceFormSchema.shape.publicationStatus.parse(undefined)).toBe(
      "DRAFT",
    );
  });
});
