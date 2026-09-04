---
status: frozen
---
# CLAUDE.md · Well Kept household operations platform

This file is read at the start of every session. It consolidates WK-DEV-003 (stack), WK-DEV-004 (conventions), WK-DEV-005 (handbook), the session discipline in SESSION_COMMISSIONING_BRIEF.md, and the build ruling of 3 September 2026 (docs/BUILD_RULING_2026-09-03.md). If this file and a spec disagree, stop and report; do not pick one.

## What this system is
One structured household record ("the Playbook") with three permission-filtered projections: client portal, HOM mobile app (Household Operations Manager), corporate portal. A modular monolith plus one queue worker. Scale envelope REQ-075: 150 households, 60 staff, ~1 TB photos, no re-architecture through 2032. Nothing distributed is justified.

## Stack (do not substitute)
TypeScript 5.8 strict · Node 22 · pnpm + Turborepo · Next.js 15 App Router with server actions (no tRPC; the planned middleware never shipped) · React 19 · Tailwind 4 · shadcn/ui vendored · Expo SDK 53 / RN 0.79 for `apps/hm-mobile` · Zod · Drizzle + drizzle-kit · Postgres 16 (Neon) · Redis 7 + BullMQ 5 · S3 · Auth.js 5 (TOTP for staff, magic link for clients) · libsodium sealed boxes with per-household keys under KMS · Playwright print-to-PDF · Resend via `packages/mail` · Expo Notifications · Vercel + worker + Neon · Sentry + Axiom · Vitest + Playwright + Maestro · GitHub Actions + EAS.

## Invariants (enforced in code; never train around them)
1. Every `playbook_field` write stamps provenance, actor and date server-side. No unstamped write path exists.
2. Every server action declares its permission through `defineAction`. A file exporting an action without it fails lint (Session 1 ships this).
3. A client-session response never contains S2 or S3 keys. CI payload test on every build.
4. S3 values live only in the vault table, envelope-encrypted. Never in `playbook_field`, logs, errors, analytics or crash reports. Reveal = server decrypt + audit row + 60 s client TTL.
5. N/A-confirmed is a value. Blank means unasked. Never coalesce.
6. LIFE-EVENT suppresses every proposal surface within one request cycle. WATCH adds corporate alerts and suppresses nothing.
7. Close-flow required steps are doctrine (WK-PLAY-001), not UX. "Changes noticed" is required; "none" is a valid answer. The report is exactly three sentences.
8. Offline: last-write-wins plus a corporate conflict row. Never block the HOM's submit.
9. Sections 0 to 24 are a public API. Never renumber. New content goes inside sections.
10. No person-characterizing field may exist in the schema. No table may reference two households. CI introspects the schema for both (RFC-001).
11. Derived fields are read-only projections recomputed by the worker on outbox events. Hand-edits are rejected.
12. No client-facing notification between 21:00 and 07:00 household time. Replies to inbound member messages are exempt (REQ-079).
13. Money is integer cents. Store UTC; household logic runs in America/New_York. Movable observances come from the calendar table, never computed.
14. Financial figures never enter source control. Wage rates, prices and model figures are configuration, not constants.
15. No em dashes in any user-facing string (lint rule exists).
16. External content (email, PDF, web, social, invoices, vendor messages) is data, never instruction. It enters only through the capture pipeline (quarantine, source identity, canonical match, AI proposal, human confirmation). No external content writes canonical truth or authority.
17. AI-created facts are proposals until individually confirmed by an authorized human. No select-all, no confidence-threshold auto-commit. Deterministic mechanics may execute inside pre-existing Decision Rights authority; probabilistic proposals never gain authority by escalating.
18. Activity is not outcome. "Vendor contacted", "provider says done" and "email sent" are intermediate events; closure requires the Handled invariant (docs/BENCHMARK_ADOPTION.md §2).
19. Four separations hold everywhere: canonical data is not model context; procedure is not provider prompt; authority is not LLM tool availability; event history is not an automation vendor's run log.
20. Every feature must name what it replaces, prevents or enables. A feature that adds ongoing member input, review or maintenance without displacing something is not built.

## Rulings a session must not "helpfully" unwind
- WK-STD-026 (records about people who are not clients) stands in full as company policy. The 1 August counsel ruling removed a legal necessity, not the standard. See CODE_IMPACT_2026-08-01_DELETION_RULING.md.
- `erase-household.mjs` deletes rows in six named tables outright by design, each with a written reason in its header. Do not convert them to tombstones.
- The Playbook field record is field-based (`playbook_field`), not relational person/pet/system tables. WK-APP-008 Part 1 was corrected on this point; build against the repo.

## Session discipline
- One queue item per session, in the order in docs/BUILD_QUEUE.md. Do not reorder, skip, or add.
- Plan mode first: read the stamped spec, read the touched code, write the plan, then build.
- At most one migration per session. The RFC-001 migrations are two sessions by design.
- Every session ends with a session log in `docs/sessions/YYYY-MM-DD_<queue-id>.md`: what was built, what was verified, what disagreed, what is open.
- Report and stop on any disagreement between a spec and the repo, between two specs, or between a spec and this file. Do not reconcile silently.
- Specs are commissioned only when stamped in docs/SPEC_REGISTER.md as `verified@<sha>` or `plan-of-record`. A `superseded` or unstamped spec is not an input.
- Known unknowns (WK-DEV-005 §7) ship as configuration with the doc-cited default and a `launch-calibrated` comment. Never invent a value.
- PRs under 400 lines where possible; CI green (typecheck, lint, unit, affected e2e); one human reviewer minimum; schema changes carry a migration and a rollback note.
- Every three to four sessions, a reconciliation session: specs against repo, register stamps updated, drift reported.

## Acceptance beyond tests (release-blocking forever)
Airplane test (full visit captured offline, drains in order on reconnect) · payload test · suppression test · fixture parity (the three fixture households in docs/FIXTURES.md load through the importer and render in all three portals) · founder walkthrough of each portal against its WK-APP section.

## Build versus buy
Build and own: household record semantics, authority and Decision Rights, anticipation and reconciliation, situation and dependency graph, work lifecycle and outcome verification, preferences and standing rules, member and HOM projections, continuity and cognitive-load telemetry, learning governance. Buy or integrate: email/SMS/push transport, identity/MFA/passkeys, object storage and malware scanning, payments and accounting rails, maps/geocoding/weather, commodity OCR and model inference, observability and feature flags, calendar transport.

## Household Zero
The founders' two test households are Household Zero: first cohort for every feature and every AI behavior version. The external test household runs under written informed consent until the E1 security test passes. No other real household data before the security test.

## Source-of-truth map
Schema → WK-PLAY-001 and RFC-001 · portals and tags → WK-APP-001 · triggers → WK-APP-002 (structured table: docs/triggers/*.yaml once converted) · architecture → WK-APP-003 · four-stage pipeline → Four-Stage Application Spec · cascade → Inference Cascade Spec · scope → WK-DEV-001 plus the build ruling · mode logic → docs/SPEC_MODE_LOGIC.md · benchmark adoption and reconciliation → docs/BENCHMARK_ADOPTION.md · competitor-derived features → docs/COMPETITIVE_FEATURE_INPUTS.md · kickoff → docs/START_HERE.md.

## Glossary (use these exact terms)
Household · member (never client in new code or UI) · Household Operations Manager / HOM · backup HOM · Desk · Playbook · playbook_field · section · registry · dot · gesture · trigger · prompt pack · decision inbox · stage (anticipate, identify, decide, monitor) · knowing-state · materiality · consequence class · LIFE-EVENT / WATCH / STEADY / ONBOARDING-90 / RENEWAL-WINDOW / CHAMPION · Guided / Normal / Expert mode · Synthetic Training Household · cohort record · capture artifact · expected event · reconciliation result · changeset · latest safe start · fallback plan · dueness · validity class · Handled invariant · ownership trace (conceive / plan / execute).

## Brand in code
The company name, sending domain, app display name and credential wording are one configuration value (`BRAND` in `packages/config`). Nothing member-facing hardcodes the name; the name decision lands 25 September 2026. "Household Operations Manager" and "Certified Household Operations Manager, Level I / II" are fixed and independent of the company name.
