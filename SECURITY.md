# Security policy

## Supported code

Security fixes are applied to the current `main` branch. Preview deployments
are for verification and are not approved production releases.

## Reporting a vulnerability

Report suspected vulnerabilities privately through GitHub's private
vulnerability reporting for this repository. Do not open a public issue or
include personal data, production credentials, client files, or destructive
proofs of concept in a public channel.

Include the affected route or component, prerequisites, impact, a minimal
reproduction, and any relevant logs with secrets and personal data removed.
The repository owner should acknowledge the report privately, validate it,
coordinate a fix, and disclose details only after affected deployments are
protected.

## Production security boundary

A production release is not approved unless the repository release gate passes.
That gate requires PostgreSQL, persistent private storage, distributed rate
limiting, final HTTPS origins, reviewed contact data, approved public media,
published legal documents, and documented operational checks. Local SQLite,
fallback administrator credentials, in-memory quotas, and unreviewed content
are development-only states.

Never commit `.env` files, database URLs, authentication secrets, storage
credentials, webhook secrets, cron secrets, private lead attachments, database
backups, or exported lead data.
