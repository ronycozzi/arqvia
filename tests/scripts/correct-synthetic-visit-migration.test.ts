// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("synthetic technical visit correction migration", () => {
  it("touches only untouched synthetic rows and rebuilds lead activity", async () => {
    const sql = await readFile(
      path.join(
        process.cwd(),
        "prisma/postgresql/migrations/20260826213000_correct_synthetic_visit_activity/migration.sql",
      ),
      "utf8",
    );

    expect(sql).toContain("visit.id = CONCAT('visit_', lead.id)");
    expect(sql).toContain('visit."createdAt" = visit."updatedAt"');
    expect(sql).toContain('visit."scheduledAt" IS NULL');
    expect(sql).toContain('MAX(activity."createdAt")');
    expect(sql).toContain("WHERE lead.id IN");
  });
});
