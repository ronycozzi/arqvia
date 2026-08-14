import { describe, expect, it } from "vitest";
import {
  adminReferenceSearchSchema,
} from "@/lib/admin-reference-options";
import { deduplicateAdminReferenceOptions } from "@/lib/admin-reference";

describe("admin reference options", () => {
  it("keeps the client contract free of Prisma and private environment imports", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/admin-reference.ts"),
      "utf8",
    );
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/components/admin/reference-select-field.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/@prisma|server-env|\/db["']/);
    expect(clientSource).not.toContain("admin-reference-options");
  });

  it("validates bounded project and service searches", () => {
    expect(
      adminReferenceSearchSchema.parse({ type: "projects" }),
    ).toMatchObject({ q: "", selectedId: "", take: 30, type: "projects" });
    expect(
      adminReferenceSearchSchema.safeParse({ take: 51, type: "services" }).success,
    ).toBe(false);
    expect(
      adminReferenceSearchSchema.safeParse({ type: "users" }).success,
    ).toBe(false);
  });

  it("deduplicates merged local and remote results by id", () => {
    expect(
      deduplicateAdminReferenceOptions([
        { id: "1", label: "Casa Norte" },
        { id: "2", label: "Oficina Centro" },
        { id: "1", label: "Casa Norte actualizada" },
      ]),
    ).toEqual([
      { id: "1", label: "Casa Norte actualizada" },
      { id: "2", label: "Oficina Centro" },
    ]);
  });
});
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
