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
});
