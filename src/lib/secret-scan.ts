export type SecretFinding = {
  column: number;
  file: string;
  line: number;
  rule: string;
};

type SecretRule = {
  expression: RegExp;
  name: string;
};

const highConfidenceRules: SecretRule[] = [
  {
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    name: "private-key",
  },
  {
    expression: /\bAKIA[0-9A-Z]{16}\b/g,
    name: "aws-access-key",
  },
  {
    expression: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
    name: "github-token",
  },
  {
    expression: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
    name: "github-token",
  },
  {
    expression: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
    name: "slack-token",
  },
  {
    expression: /\bsk_live_[A-Za-z0-9]{20,}\b/g,
    name: "stripe-live-key",
  },
  {
    expression: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    name: "google-api-key",
  },
  {
    expression: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g,
    name: "api-secret-key",
  },
];

const sensitiveAssignment =
  /\b(AUTH_SECRET|JWT_SECRET|ADMIN_PASSWORD|LEAD_WEBHOOK_SECRET|AUTOMATION_CRON_SECRET|DATA_RETENTION_CRON_SECRET|PRIVATE_OBJECT_DELETION_CRON_SECRET|S3_SECRET_ACCESS_KEY|DATABASE_URL|DIRECT_URL|POSTGRES_URL)\b\s*[:=]\s*["']?([^\s"'#}]+)/gi;

const placeholderFragments = [
  "change",
  "ci-",
  "example",
  "file:./dev.db",
  "local-",
  "placeholder",
  "release-verification",
  "replace",
  "test",
  "your-",
];

export function scanTextForSecrets(file: string, content: string) {
  const findings: SecretFinding[] = [];
  const lines = content.split(/\r?\n/);
  const scansAssignments = isConfigurationFile(file);

  lines.forEach((lineContent, index) => {
    for (const rule of highConfidenceRules) {
      rule.expression.lastIndex = 0;
      let match = rule.expression.exec(lineContent);
      while (match) {
        findings.push({
          column: match.index + 1,
          file,
          line: index + 1,
          rule: rule.name,
        });
        match = rule.expression.exec(lineContent);
      }
    }

    if (scansAssignments) {
      sensitiveAssignment.lastIndex = 0;
      let assignment = sensitiveAssignment.exec(lineContent);
      while (assignment) {
        const value = assignment[2] || "";
        if (!isSafePlaceholder(value)) {
          findings.push({
            column: assignment.index + 1,
            file,
            line: index + 1,
            rule: `sensitive-assignment:${assignment[1].toUpperCase()}`,
          });
        }
        assignment = sensitiveAssignment.exec(lineContent);
      }
    }
  });

  return dedupeFindings(findings);
}

function isConfigurationFile(file: string) {
  const normalized = file.replaceAll("\\", "/").toLowerCase();
  const name = normalized.split("/").at(-1) || normalized;
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    normalized.endsWith(".json") ||
    normalized.endsWith(".yaml") ||
    normalized.endsWith(".yml")
  );
}

function isSafePlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.startsWith("${{") || normalized.startsWith("$")) {
    return true;
  }
  if (normalized.includes("process.env") || normalized.includes("import.meta.env")) {
    return true;
  }
  return placeholderFragments.some((fragment) => normalized.includes(fragment));
}

function dedupeFindings(findings: SecretFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.file}:${finding.line}:${finding.column}:${finding.rule}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
