import { describe, expect, it } from "vitest";
import { scanTextForSecrets } from "./secret-scan";

describe("scanTextForSecrets", () => {
  it("detects high-confidence credentials without returning their value", () => {
    const token = ["github", "_pat_", "A".repeat(48)].join("");
    const findings = scanTextForSecrets("unsafe.env", `TOKEN=${token}`);

    expect(findings).toEqual([
      expect.objectContaining({ file: "unsafe.env", line: 1, rule: "github-token" }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(token);
  });

  it("detects a non-placeholder sensitive assignment", () => {
    const value = ["production", "credential", "value", "2026"].join("-");
    const findings = scanTextForSecrets(
      "config.yml",
      `AUTH_SECRET: ${value}`,
    );

    expect(findings[0]?.rule).toBe("sensitive-assignment:AUTH_SECRET");
  });

  it("allows documented placeholders and CI-only fixtures", () => {
    const content = [
      'AUTH_SECRET="replace-with-a-long-random-secret"',
      "ADMIN_PASSWORD: ChangeMe123!",
      "LEAD_WEBHOOK_SECRET: ${{ secrets.LEAD_WEBHOOK_SECRET }}",
      "AUTH_SECRET: ci-local-secret-change-in-production",
    ].join("\n");

    expect(scanTextForSecrets(".env.example", content)).toEqual([]);
  });

  it("covers destructive cron secrets and credential-bearing database URLs", () => {
    const content = [
      "DATA_RETENTION_CRON_SECRET: a-real-random-retention-value-2026-keep-private",
      "PRIVATE_OBJECT_DELETION_CRON_SECRET: a-real-private-deletion-value-2026-keep-private",
      "DATABASE_URL: postgresql://arqvia:private-password@db.internal/arqvia",
    ].join("\n");

    expect(scanTextForSecrets("deployment.yml", content)).toEqual([
      expect.objectContaining({
        line: 1,
        rule: "sensitive-assignment:DATA_RETENTION_CRON_SECRET",
      }),
      expect.objectContaining({
        line: 2,
        rule: "sensitive-assignment:PRIVATE_OBJECT_DELETION_CRON_SECRET",
      }),
      expect.objectContaining({
        line: 3,
        rule: "sensitive-assignment:DATABASE_URL",
      }),
    ]);
  });
});
