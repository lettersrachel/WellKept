---
status: frozen
---
# Phase 0 delta report: WK-DEV-003 verified against the repository

24 August 2026. The Gate 0 deliverable named by WK-DEV-006 Phase 0
("VERIFIED AGAINST REPO delta report on WK-DEV-003"). Input: the founder's
WK-DEV-003 copy from the 24 August transfer set (reference-only, held out
of source control because it carries a budget figure; the figure is not
repeated here). Every row of its stack table was checked against the
repository at commit `e858095`; evidence is a file or manifest per claim.

Verdict vocabulary: VERIFIED (the claim describes the build), VERSION
DRIFT (right choice, newer version than the pin), DIFFERS (a different
choice shipped), ABSENT (nothing shipped for the row), PLAN (nothing
exists yet and the row reads as intent). The document's own 1 August
drift notice marked three rows CORRECTED; all three re-verified true.

## The stack table, row by row

| Row (doc) | Verdict | Evidence |
|---|---|---|
| TypeScript 5.8.x strict | VERIFIED | 5.8.3 across root and packages; hm-mobile alone on ~5.9.3 |
| Node.js 22 LTS | VERIFIED | root `engines.node >=22` |
| pnpm 10.x / turbo 2.5.x | VERIFIED / VERSION DRIFT | `packageManager pnpm@10.0.0`; turbo 2.10.5 |
| Next.js App Router 15.3.x | VERSION DRIFT | apps/web next 15.5.21 |
| React 19.1.x | VERIFIED | web 19.2.7, mobile 19.1.0 |
| Tailwind CSS 4.1.x + brand tokens | ABSENT | no tailwind dependency anywhere; apps/web styles are hand-rolled CSS and inline styles; no `packages/ui`, no tokens file |
| shadcn/ui vendored | ABSENT | `apps/web/src/components/` holds two bespoke components (RefusalBanner, SkewWatch) |
| Expo SDK 53 / RN 0.79 | VERSION DRIFT | hm-mobile expo ~54.0 (54.0.36 resolved), react-native 0.81.5 |
| Offline store: in-house offline-queue (CORRECTED row) | VERIFIED | `packages/offline-queue`; `MAX_SEND_ATTEMPTS = 8` at `apps/web/src/lib/client/visit-sync.ts:23`; backoff base 5s proven in `mutation-queue.test.ts` |
| API: Next.js server actions, permissions per-action (CORRECTED row) | VERIFIED | `apps/web/src/lib/actions.ts`; `readDecision` imported from `@wellkept/permissions` there and in the reveal, briefing, playbook, visit and oversight surfaces |
| Zod 3.24.x | VERSION DRIFT | 3.25.76 |
| Drizzle 0.44.x / drizzle-kit 0.31.x | VERSION DRIFT | 0.45.2 / 0.31.10 |
| PostgreSQL 16, managed Neon | VERIFIED | CI service `postgres:16`; production on Neon |
| Redis + BullMQ | VERIFIED, host differs | bullmq 5.80.8 + ioredis in web and worker; production Redis is Upstash (queue chore list), not self-managed |
| File storage: S3-compatible, signed URLs, Glacier at 5y | DIFFERS | photos are base64 in Postgres by deliberate pilot posture, commented at `packages/schema/src/tables.ts:374`; no aws-sdk dependency exists; no lifecycle tiering |
| Auth: Auth.js 5.x, credentials + TOTP staff, magic link clients | VERIFIED in substance, packaging differs | `@auth/core` 0.41.3 called directly (`api/auth/[...auth]/route.ts`); TOTP is the in-house `packages/totp`; magic link via Auth.js |
| Vault: libsodium sealed boxes + KMS-wrapped keys | DIFFERS in mechanism, VERIFIED in posture | envelope encryption is real but is node:crypto AES-256-GCM (`packages/vault/src/index.ts`), keys wrapped under WK_KMS_KEY with boot-time validation; libsodium appears nowhere |
| PDF: Playwright print-to-PDF service | ABSENT | no print-to-PDF code in the repo |
| Email: Resend via packages/mail (CORRECTED row) | VERIFIED | `packages/mail/src/index.ts:17` posts to api.resend.com; the AO delivered-but-never-arrived question remains open |
| Push: Expo Notifications | ABSENT | hm-mobile has no expo-notifications dependency |
| Hosting: Vercel web + Fly.io or ECS worker + Neon | DIFFERS on the worker | web on Vercel and database on Neon verified; the worker is on RAILWAY (Git-connected, dashboard-only control; WORK_QUEUE, 28 July record) |
| Observability: Sentry + Axiom | HALF | @sentry/node 9.46.0 in web and worker; Axiom appears nowhere |
| Testing: Vitest + Playwright + Maestro | TWO OF THREE | vitest 3.2.7; @playwright/test 1.55.1 in tooling/e2e (airplane, release-blocking); Maestro absent, and no mobile e2e exists |
| CI/CD: GitHub Actions + EAS Build | HALF | gates and airplane jobs in ci.yml; no EAS anywhere |

## Non-choices, verified

No microservices (one web app, one worker): holds. No GraphQL: holds. No
third-party analytics on the client portal: holds (PostHog absent; it was
P2 staff-side and is simply not built). No low-code: holds. Search:
Postgres full-text was the plan; no tsvector exists anywhere, so search
is currently whatever each page query does. The doc's own escape valve
(defer a search service unless REQ-073 misses) has not been exercised.

## Environments and secrets

Local docker-compose (PG + Redis): `docker-compose.yml` exists. Secrets:
the substance holds (no secrets in the repo, proven by the session Q
history scan) but the named mechanism differs: no Doppler or SSM; secrets
live in Vercel and Railway environment stores and, locally, in the
gitignored `.neon-connection` file referenced by name.

**STAGING DOES NOT EXIST.** The doc names a staging environment seeded
with sample fixtures. No staging deployment, project, or database exists;
the pipeline is local proof, then production, with the Smoke Test Fixture
living inside production. This matters beyond this report because
WK-DEV-006 depends on staging twice: Phase 0 acceptance ("the full
current test suite runs green locally and in staging") and Phase 1
("WK-SEC-001 white-box audit executed on staging with synthetic data").
As of this report the Phase 0 acceptance line cannot be satisfied as
written. Escalated under WK-DEV-006 section 8 with a proposed default:
stand up a staging environment as an early Phase 0/1 deliverable (a
second Vercel project or preview-pinned deployment, a Neon branch, and a
worker service), and read the Phase 0 acceptance as "locally, and in
staging once staging exists" until then.

## The document's own rules, checked

- The 1 August drift notice said unmarked rows "should be treated as the
  plan of record rather than as a description of what runs." This report
  retires that caveat: every row now carries a verdict.
- The version-freeze rule ("first sprint task is pnpm outdated plus a
  pin-refresh PR, then versions freeze") never operated: nearly every pin
  has drifted upward, most recently under same-day security overrides
  (brace-expansion, js-yaml, nanoid, tar). The freeze rule as written is
  incompatible with the audit gate, which forces same-day bumps when
  advisories land. Proposed default under section 8: replace the freeze
  rule with the practice already in force, pins move only by lockfile
  review or security override, both reviewed in PR.

## Summary

Of 24 stack rows: 10 verified (3 of them the re-verified CORRECTED rows),
6 version drift only, 4 differ in choice or mechanism (file storage,
vault primitive, worker host, auth packaging), 4 absent (Tailwind and
tokens, shadcn/ui, PDF service, push; plus Axiom, Maestro, and EAS as
absent halves of shared rows). The two findings that gate other work:
staging does not exist (blocks Phase 0 acceptance as written and the
Phase 1 audit venue), and the file-storage row's S3 claim is a plan while
photos live in Postgres (acceptable at pilot scale by written intent, but
REQ-070's "envelope-encrypted S3 vault" wording and the 5-year photo
retention envelope both assume object storage eventually). Neither is a
defect in the build; both are places where the document described intent
as fact.
