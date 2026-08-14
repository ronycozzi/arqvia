import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { scanTextForSecrets } from "../src/lib/secret-scan";

const textExtensions = new Set([
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".prisma",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const textNames = new Set(["Dockerfile", "Procfile"]);
const maxFileBytes = 2 * 1024 * 1024;

const output = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
const files = output
  .split("\0")
  .filter(Boolean)
  .filter(isTextCandidate);

const findings = files.flatMap((file) => {
  const absolutePath = path.resolve(file);
  let fileStats;
  try {
    fileStats = lstatSync(absolutePath);
  } catch {
    // Git can report a tracked file that is currently deleted in a dirty worktree.
    return [];
  }
  if (!fileStats.isFile() || fileStats.size > maxFileBytes) return [];
  const content = readFileSync(absolutePath, "utf8");
  if (content.includes("\0")) return [];
  return scanTextForSecrets(file.replaceAll("\\", "/"), content);
});

if (findings.length) {
  console.error(`Secret scan failed with ${findings.length} finding(s):`);
  findings.forEach((finding) => {
    console.error(
      `- ${finding.file}:${finding.line}:${finding.column} [${finding.rule}]`,
    );
  });
  console.error("No secret values were printed. Rotate any exposed credential before removing it.");
  process.exit(1);
}

console.log(`Secret scan passed across ${files.length} text files.`);

function isTextCandidate(file: string) {
  const basename = path.basename(file);
  return textNames.has(basename) || textExtensions.has(path.extname(file).toLowerCase());
}
