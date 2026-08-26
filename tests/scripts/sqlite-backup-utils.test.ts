import {
  assertInsideDirectory,
  integrityCheckPassed,
  validateBackupManifest,
} from "../../scripts/sqlite-backup-utils.mjs";
import { describe, expect, it } from "vitest";

const backupPath = "C:\\workspace\\backups\\arqvia-2026.db";

function validManifest() {
  return {
    createdAt: new Date().toISOString(),
    database: "sqlite",
    file: backupPath,
    integrityCheck: ["ok"],
    sha256: "a".repeat(64),
    sizeBytes: 128,
    verified: true,
    counts: {
      automationDeliveries: 0,
      leadActivities: 0,
      leadAttachments: 0,
      leadEstimates: 0,
      leadNotes: 0,
      leads: 1,
      privateObjectDeletions: 0,
      projects: 2,
      services: 3,
      technicalVisits: 0,
      users: 1,
    },
    attachments: {
      directory: `${backupPath}.attachments`,
      externalCount: 0,
      files: [],
    },
  };
}

describe("SQLite backup safety helpers", () => {
  it("accepts a complete verified manifest", () => {
    expect(() => validateBackupManifest(validManifest(), backupPath)).not.toThrow();
    expect(integrityCheckPassed([{"integrity_check": "ok"}])).toBe(true);
  });

  it("requires integrity evidence in addition to the checksum", () => {
    const manifest = validManifest();
    manifest.integrityCheck = ["not ok"];
    expect(() => validateBackupManifest(manifest, backupPath)).toThrow(/invalid or incomplete/);
  });

  it("requires every attachment row to be accounted for", () => {
    const manifest = validManifest();
    manifest.counts.leadAttachments = 1;
    expect(() => validateBackupManifest(manifest, backupPath)).toThrow(
      /invalid or incomplete/,
    );
  });

  it("rejects paths outside the backup directory", () => {
    expect(() =>
      assertInsideDirectory(
        "C:\\workspace\\outside.db",
        "C:\\workspace\\backups",
        "outside",
      ),
    ).toThrow("outside");
  });
});
