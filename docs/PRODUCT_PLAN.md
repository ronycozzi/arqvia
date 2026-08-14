# Arqvia Product Plan

## Product Summary

Arqvia is a production-quality lead-generation website for architecture, turnkey construction, remodeling and interior design services in Córdoba, Argentina.

The current version combines the Pro commercial experience with Premium investment-estimation, technical-visit, legal-governance and lead-automation workflows: public pages, governed About and Process content, project case studies, service pages, local SEO routes, quote form, WhatsApp actions, versioned USD ranges, saved estimate snapshots, saved consultations, visit scheduling, a persistent automation outbox, media library, protected admin, legal publishing, commercial reports, activity log and role-based internal workflows.

## Strategic Fit

- Client base: boutique design + turnkey construction studio.
- Local SEO market: Córdoba, Argentina.
- Visual direction: premium architecture with technical construction trust signals and warm remodeling transformation modules.
- Primary CTA: Solicitar presupuesto.
- Secondary CTA: Ver proyectos.
- Mobile/floating CTA: Consultar por WhatsApp.
- Brand: Arqvia.

## Visual Direction

The public site uses an editorial architectural hero with a large residential project image, restrained typography, warm neutral surfaces, graphite contrast, bronze accents and clear trust markers. The visual system is intentionally sober: it should communicate method, materiality, supervision and high-value project confidence.

## Architecture

- Next.js App Router for SEO-friendly public pages and server-rendered admin data.
- React + TypeScript for typed UI.
- Tailwind CSS with custom tokens for premium visual direction.
- Prisma with SQLite for local development and a `DATABASE_URL` migration path to PostgreSQL.
- A singleton `EstimateConfig`, configurable `EstimateRule` records and a one-to-one `LeadEstimate` snapshot linked to each lead.
- A one-to-one `TechnicalVisit` record linked to each lead, with an optional active assignee and Admin-only commercial operation.
- A persistent lead-automation outbox with an immutable `payloadJson` snapshot and `claimToken` lease fencing, decoupling public lead creation from signed external webhook delivery.
- Fixed `InstitutionalPage` records for `/nosotros` and `/proceso`, with shared conversion and SEO fields plus slug-specific structured payloads.
- Auth.js Credentials provider with Prisma users for admin protection.
- Zod + React Hook Form for validated quote requests.
- Playwright for E2E.
- Vitest for unit tests.
- GitHub Actions for CI.

## Implemented Scope

1. Public layout: header, footer, mobile navigation and floating WhatsApp action.
2. Focused home page with architectural hero, trust metrics, services, featured projects, before/after, concise process, one testimonial and a final quote/WhatsApp CTA. Team, areas and deeper proof live on their dedicated pages.
3. Project portfolio with filters and case-study detail pages.
4. Services page and individual service detail pages.
5. Process, about, contact, FAQ, blog, local SEO and legal pages.
6. Progressive quote form with six essential fields first and optional budget, surface, files and technical-visit preferences in a secondary disclosure; includes validation, honeypot, same-origin checks, rate limiting and lead storage.
7. Admin login with Auth.js Credentials and protected routes.
8. Admin dashboard and masked lead views for internal awareness, with Admin-only PII, contact actions, private attachments, notes, status updates, visit coordination, CSV export and reports.
9. Admin CRUD for projects, services, categories, testimonials, team, areas, FAQ and blog posts.
10. Admin media library with upload validation, search, copy URL and delete controls.
11. Admin settings for brand, contact, hero, CTAs, social links and SEO-sensitive public config.
12. Role-based access: Admin operates CRM and system settings, Editor manages editorial content, and Viewer receives read-only content plus masked lead awareness. Lead PII is Admin-only.
13. Sitemap, robots, canonical metadata and structured data.
14. Launch-readiness checks for domain, strict URL guard, WhatsApp, contact and first-screen content.
15. Vitest unit tests and Playwright E2E flows across public and admin surfaces.
16. README, env example, CI and deployment instructions.
17. Premium technical-visit module with public preferences, the protected `/admin/visitas` agenda, lead-level coordination, operational statuses and authenticated ICS export.
18. Optional Premium investment estimator on a direct, noindex `/estimador` route, with Admin-only versioned assumptions, server-side recalculation, commercial disclaimers and persisted lead snapshots; it does not compete with the core home conversion path.
19. Provider-neutral lead automation with immutable outbox snapshots, HMAC-signed cron-only webhook delivery, bounded retries, fenced leases and Admin monitoring/requeue.
20. Installable Arqvia PWA with branded manifest, generated icons, mobile safe areas and a privacy-safe network-only navigation strategy with offline fallback.
21. Deterministic production release gate covering final URLs, secrets, real contact data, PostgreSQL, persistent media, published content, rights, legal approval, estimator approval and operational evidence.
22. Admin-only legal publishing for privacy, terms, cookies and quote disclaimers, with draft safety, SEO metadata, review evidence, optimistic concurrency, audit history and protected public fallbacks.
22. Consent-aware GA4/GTM integration with no external analytics request before opt-in, route-aware page views, bounded commercial events and a persistent preference control.
23. Conversion-integrity pass: contextual WhatsApp attribution, local SEO source preservation, strict estimator input rejection and a complete estimator kill switch across navigation, home, schema and sitemap.
24. Safer admin publishing defaults and masked commercial views so drafts are not exposed accidentally and lead PII remains restricted to Admin.
25. Durable content URL history with flattened HTTP 308 redirects for renamed projects, services, blog posts and local work areas.
26. Atomic CMS governance: editorial content, user access changes and their audit records commit or roll back together.
27. Scalable admin media usage analysis with a fixed query budget instead of per-asset N+1 lookups.
28. Full-dataset lead reporting and cursor-streamed CSV exports without the former silent 1,000-row ceiling.
29. Privacy-first attachment deletion that commits metadata and audit state first, then performs best-effort private-object cleanup so no record can point to a missing file.
30. Bounded lead and media uploads with byte and time limits, image dimension/pixel checks, sanitized infrastructure errors and compensating cleanup logs.
31. Storage-first public media deletion so a provider failure preserves database references and remains safely retryable.
32. Server-owned notification undo state plus serializable lead-status transitions with atomic audit history.
33. Reconsultation isolation: every public repeat contact creates an independent lead and can reference a possible prior duplicate without mutating its estimates, visits, notes or attachments.
34. CMS concurrency and publication hardening: draft defaults, transactional slug history, post-commit revalidation and protection for the estimator's last active rule.
35. Consent revocation for GA4/GTM, canonical area timestamps and structured business data sourced from central configuration.
36. Page-level admin session enforcement that revalidates active state, role and `sessionVersion` during client navigation, with a dedicated revocation regression test.
37. Hardened role privacy: Viewer receives a masked lead experience without estimates, internal notes, priority reasoning or follow-up signals; Activity and user administration are Admin-only.
38. Operational auth and PWA hardening: explicit eight-hour admin sessions, bcrypt's 72-byte password ceiling, production secret validation and complete `/admin`/`/api` service-worker exclusion.
39. Audited lead exports over a stable ID snapshot, verified beyond 1,000 rows, plus serializable notification watermarks that cannot be regressed by concurrent tabs.
40. Structured-data and conversion consistency: visible case-study narratives match JSON-LD, service schemas avoid unsupported inventory claims, local areas come from published data and high-intent WhatsApp actions preserve attribution.
41. Canonical admin pagination across leads, visits, content, media, users, automations and activity, preserving filters and redirecting invalid or out-of-range pages safely.
42. Commercial activity truth through `Lead.lastActivityAt`, updated by real contact events and backfilled idempotently for existing installations.
43. Independent automation capture and dispatch controls so the transactional outbox can remain durable while external delivery is deliberately paused.
44. Reversible user access revocation with session invalidation and retained historical authorship instead of destructive employee deletion.
45. High-confidence secret scanning in local verification and CI, plus readiness probes that validate core database tables without exposing infrastructure details.
46. Optimistic concurrency protection for projects, services and blog posts so stale editor tabs cannot overwrite newer published changes silently.
47. Per-resource media provenance and rights approval, enforced by the production release gate for every visual asset referenced publicly.
48. Admin-only privacy erasure for leads, private attachments, related records and linked audit history, leaving only a minimal non-identifying execution record.
49. Consent revocation cleanup for analytics cookies/scripts and deterministic E2E coverage for privacy, pagination, access revocation and mobile/public regressions.
50. Audited activity CSV export and scalable lead/activity snapshots stored as temporary private files with bounded cursor reads and guaranteed cleanup.
51. Conservative PDF attachment parsing that rejects active, encrypted, embedded and interactive documents before private storage.
52. Outbound webhook DNS preflight that rejects private, loopback and reserved IPv4/IPv6 destinations, alongside an exact hostname allowlist.
53. User-edit optimistic concurrency, operational session/audit indexes and transactional media deletion with compensating metadata recovery on storage failure.
54. Disabled-by-default retention for expired `LOST` leads, protected by a dedicated cron secret, bounded batches, non-PII audit records and a release approval gate.
55. Reproducible SQLite backup and restore drill with checksums, integrity validation, critical entity counts and isolated cleanup.
56. Professional lead ownership and follow-up workflow with assignees, due dates, overdue/unassigned queues and stable CSV exports.
57. Commercial outcome tracking with quoted and won USD values, required loss reasons, typed lead activity and report aggregates.
58. Optimistic concurrency across testimonials, team, FAQ, areas and brand settings, extending stale-tab protection across the CMS.
59. Editorial blog articles with functional section indexes, topic-specific headings and a single contextual CTA, plus an accessible compact mobile footer.
60. Expanded role-aware Admin accessibility coverage for content, system, validation and dialog states on desktop and mobile.
61. Visual project gallery editing with approved-media selection, previews, image semantics, accessible reordering and backend-compatible serialization.
62. Audited Admin contact actions that preserve WhatsApp/email convenience while recording channel, actor and last activity atomically.
63. Exact request MIME parsing that accepts valid content-type parameters and rejects misleading substring matches for JSON and multipart endpoints.
64. Complete release diagnostics that continue through environment, content and operational checks, then report a deduplicated blocker count without leaking connection details.
65. Accessible quote-field semantics with native required state and stable label/error associations that keep validation copy out of accessible names.
66. Production dependency hardening on Next.js 16.2.10 with a constrained PostCSS override and a zero-vulnerability production audit.
67. Post-response revalidation across CMS, CRM, estimator and brand mutations so affected public/Admin surfaces refresh without delaying confirmation state, covered by repeated mobile and full E2E runs.
68. Self-cleaning accessibility fixtures that remove only reserved `a11y-e2e-*` local users after an interrupted browser run.
69. Estimator kill-switch fixtures that restore the original enabled state, version timestamp and test-owned audit rows so repeated release verification does not mutate commercial assumptions.
70. Selective CMS cache invalidation that refreshes only affected public and Admin surfaces, while reserving global layout invalidation for brand and estimator switches.
71. Post-Playwright residue verification for reserved users, leads, editorial records, audit rows, rate limits and uploaded fixtures in local and CI runs.
72. Admin-only system status module for database connectivity, persistence, media storage, anti-abuse infrastructure, public URL safeguards, analytics and automation readiness without exposing secrets.
73. Scalable approved-media selection with progressive local results and an authenticated, rate-limited full-library search that returns only the fields required by CMS forms.
74. Extended system diagnostics for disabled-by-default lead retention, recorded retention approval and backup/restore evidence, including the latest verified local SQLite manifest without exposing paths or checksums.
75. A single typed Admin navigation and permission catalog shared by desktop, mobile and dashboard surfaces, with unit coverage for role visibility and unknown internal paths.
76. Scalable project/service relation selectors with bounded initial data, debounced authenticated search, selected-record preservation and minimized API responses.
77. Explicit view-versus-manage permissions for every Admin module, backed by an automated inventory check against all protected top-level routes.
78. A grouped Admin workspace index that replaces the long single-column module list with compact Operación, Contenido and Sistema sections optimized for scanning.
79. A client-safe Admin reference contract isolated from Prisma and private environment validation, protected by a regression test after full browser hydration exposed the boundary risk.
80. Governed legal content with four fixed institutional routes, Admin-only publication, mandatory reviewer attribution, public fallback continuity, release blocking until all documents are published and PostgreSQL migration parity.
81. Governed home content with structured hero context, trust proof, section copy, process, final conversion and SEO; role-aware editing, optimistic concurrency, transactional audit, public revalidation, release checks and browser coverage.
82. Governed About and Process content through `/admin/pages`, with fixed routes, role-aware editing, structured per-page payloads, optimistic concurrency, transactional audit, public fallback continuity, selective revalidation, seed safety and PostgreSQL migration parity.

## Home Content Governance

- `/admin/home` is visible to Admin, Editor and Viewer; only Admin and Editor can save changes.
- The home record is a singleton (`arqvia-home`) so duplicating the project does not create competing public variants.
- Structured JSON fields have fixed Zod contracts: three hero trust signals, four metrics, three process reasons and four process steps.
- Brand identity, hero image, headline and CTA labels remain in `/admin/settings`; commercial section copy and home SEO live in `/admin/home`.
- Public rendering, metadata and LocalBusiness description read the same governed record.
- Optimistic concurrency, transactional audit and post-commit revalidation protect every update.
- The content integrity check and production release gate reject a missing or malformed governed home record.
- SQLite seed and the incremental PostgreSQL migration create the initial record without overwriting later client edits.

## Institutional Page Governance

- `/admin/pages` is the single administrative index for the public `/nosotros` and `/proceso` pages. The supported slugs are fixed; the module does not create or delete arbitrary public routes.
- Admin and Editor can view, edit and save both records. Viewer can open the index and editors in read-only mode, but receives no save controls. The shared Admin permission catalog remains the source of truth for navigation and route access.
- Each page is stored in `InstitutionalPage` under a unique `slug`. Shared columns govern eyebrow, title, introduction, final CTA, primary and secondary CTA labels, contextual WhatsApp copy, SEO title and SEO description.
- `payloadJson` is validated against a slug-specific schema before persistence. About stores four decision points, three philosophy items and the team introduction; Process stores exactly seven ordered steps with title and description.
- Public rendering and metadata read the same governed record. A protected base document keeps both public routes available when a record is absent or malformed.
- Updates use optimistic concurrency, commit the content and audit event atomically, and revalidate the affected public page, Admin editor, Admin index, dashboard and sitemap only after commit.
- Local initialization uses `npm run db:generate`, `npm run db:init` and `npm run db:seed`. The seed upserts the two fixed slugs with an empty update branch, so an existing client's content is not overwritten.
- PostgreSQL parity is provided by `prisma/postgresql/migrations/20260720230000_add_institutional_pages/migration.sql`. It must be deployed before enabling `/admin/pages` in production, followed by the controlled initial seed when the installation requires it.
- Verification runs `npm run content:check`, `npm run verify` and `npm run verify:e2e`, followed by role checks for Admin, Editor and Viewer and public checks for `/nosotros` and `/proceso`. The 2026-07-20 measured pass completed 87 Vitest files with 422 tests, an 82-route production build and 282 Playwright cases with 244 passes, 38 intentional skips and no failures.

## Legal Content Governance

- `/admin/legal` is Admin-only; Editor and Viewer are redirected to the dashboard and never receive legal editing controls.
- The allowed routes are fixed to `/privacidad`, `/terminos`, `/cookies` and `/aviso-presupuestos`. The CMS cannot create arbitrary public legal paths.
- Draft saves never replace the current public document. When no CMS version is published, a protected baseline keeps each required route available.
- Publication requires reviewer attribution and records `reviewedAt`, the actor and an audit event in the same transaction.
- Optimistic concurrency prevents an older admin tab from overwriting a newer legal revision.
- Public title, summary, paragraphs and SEO metadata are read from the published record and invalidated after commit.
- The production release gate requires all four records to be published as well as the separate `ARQVIA_LEGAL_*` approval evidence.

## Premium Investment Estimator

- Public users choose an active project category, an integer area from 10 to 2,000 m² and an Essential, Balanced or Superior finish tier. The result is an orientative USD range, not a quote or contractual price.
- Each rule defines minimum and maximum USD/m² rates plus a minimum project amount. Tier multipliers apply to both rate-based and minimum-project calculations; results use controlled USD 500, USD 2,500 or USD 5,000 rounding steps.
- `/admin/estimador` is restricted to Admin. Admin can change public copy, the disclaimer, multipliers, categories, rates, minimums, ordering and the global enabled state. Editor and Viewer are excluded.
- Every successful configuration or rule write increments a shared version through optimistic concurrency and creates an audit record. Public lead submission must reference the current enabled version and an active rule.
- The server ignores client totals, reloads current assumptions and recalculates before persisting `LeadEstimate`. Saved snapshots retain effective rates, totals and configuration version when assumptions change later.
- Migration and seed values are starting assumptions only. Written commercial approval of every active range, multiplier and disclaimer is a mandatory production gate; the operating contract is documented in `docs/ESTIMATOR.md`.

## Premium Technical Visits

- Public users can request a technical visit and leave a preferred date, morning/afternoon/flexible window, address or reference, and contextual notes. The UI states that these are preferences pending team confirmation.
- A new request creates one `TechnicalVisit` for its new lead with `REQUESTED` status. A possible reconsultation remains a separate lead and visit; the prior record's status, schedule, assignee, address, notes and estimate never change.
- Admin can access `/admin/visitas`, search and filter the agenda, use pending/upcoming/history/all views, and open the lead to coordinate the visit. Editor and Viewer are excluded from commercial schedules, addresses and internal notes.
- Coordination stores status, confirmed date and time, duration, address, internal notes and an optional active assignee. Times are interpreted in `America/Argentina/Cordoba`.
- Statuses are `REQUESTED` (Solicitada), `SCHEDULED` (Agendada), `CONFIRMED` (Confirmada), `COMPLETED` (Realizada) and `CANCELLED` (Cancelada). Scheduled, confirmed and completed visits require a date and time.
- A visit with a confirmed date and time can be exported from the agenda or lead detail through the protected `/api/admin/visitas/[id]/calendar` endpoint. The `.ics` file is a point-in-time export, not a two-way calendar integration.

## Lead Automation Outbox

- When enabled, lead creation or reconsultation stores an immutable `payloadJson` snapshot in the same transaction. The public response never calls the webhook.
- External delivery occurs exclusively through authenticated `GET`/`POST /api/cron/automations`. Each invocation processes at most five events concurrently within a 30-second route budget.
- `claimToken` fences processing leases so an expired worker cannot complete or fail an event reclaimed by another worker.
- Each webhook signs `timestamp + "." + body` with HMAC-SHA-256 using a private `LEAD_WEBHOOK_SECRET` of at least 32 characters. Cron execution uses a separate private secret of the same minimum length.
- `/admin/automations` provides operational monitoring and manual requeue only; it never calls the provider. External receivers must be idempotent because delivery is at least once.
- The contract is provider-neutral: the same webhook can feed a CRM, Google Sheets through an automation endpoint, Make, Zapier or a custom service without provider-specific code in the lead path.
- Dispatch readiness requires `LEAD_AUTOMATION_ENABLED`, webhook URL, webhook secret and cron secret. Durable capture uses `LEAD_AUTOMATION_CAPTURE_ENABLED` independently and can keep producing outbox events while dispatch is paused. If the capture variable is omitted, it inherits the legacy dispatch switch. Configuration, security, rollout and incident handling are documented in `docs/AUTOMATIONS.md`.
- Real external delivery is `NOT RUN` until a destination and production credentials exist and a recorded smoke test succeeds.

## PWA

- The public surface exposes an Arqvia manifest, standalone metadata, Apple integration and generated 180/192/512 icons including a maskable asset.
- The service worker precaches only the offline document and icons. Navigations remain network-only and fall back to the offline document without storing visited HTML.
- APIs, admin data, authentication, RSC, images, uploads, form values and attachments are never written to Cache Storage. There is no Background Sync.
- Automated unit and Playwright coverage verifies manifest, assets, headers, offline navigation and in-memory form preservation on desktop and mobile.
- Real Android/iOS installation and update testing remains `NOT RUN` until the final HTTPS deployment exists.

## Remaining Upgrade Path

- Production deployment with final domain, HTTPS, real public URL and managed PostgreSQL.
- Real client content pass: final photos, legal text, service scope, team credentials, testimonials and work areas.
- Lighthouse measurement on the deployed URL.
- Final S3-compatible production credentials and a real upload/delete smoke test.
- Production webhook/cron credentials, final provider mapping and the first recorded real external-delivery smoke test.
- Managed PostgreSQL backup retention and the first restore drill in the selected provider.
- Legal approval, scheduler configuration and a monitored staging run before enabling lead retention.
