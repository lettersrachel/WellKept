---
status: living
---

# WK-DEV-005: Developer Handbook (context, rules, and traps)
Everything a coder needs that the specs imply but do not spell out. Read after WK-DEV-000-004 and WK-APP-001/002/003.

## 1. Domain glossary (use these exact terms in code and UI)
Playbook (the household's 24-section record; never "manual"), House Manager / HM (never "cleaner" or "maid"),
dot (verbatim overheard detail), gesture (small unbilled kindness, WK-funded), Stranger Test (coverage quality gate),
sentinel sweep (per-visit early-warning inspection), horizon list (predictable future events), commitments ledger,
away mode, zone readiness (1-4 room score), Foundation reset (paid onboarding project), tiers: essential | family_ops | concierge,
status tags (ONBOARDING-90/STEADY/LIFE-EVENT/WATCH/RENEWAL-WINDOW/CHAMPION), S1/S2/S3 (sensitivity), provenance
(asked/observed/verified_by_touch/client_written), founding rate (pilot pricing, 24-month lock).

## 2. Business rules the code must enforce (not train around)
- N/A-confirmed is a VALUE, not an empty field. Blank means unasked; "N/A-confirmed" means asked and answered. Never coalesce.
- Every playbook_field write stamps provenance + actor + date server-side. There is no unstamped write path.
- Suppression precedence: LIFE-EVENT beats everything (triggers, briefing prompts, client-portal upsell surfaces, digests). WATCH adds corporate alerts but suppresses nothing.
- Client edits: allowlisted S1 fields only, always land in review state, merge only on HM approval, full diff kept.
- The close flow's required steps are non-negotiable P0 behavior. If a PM asks to make "changes noticed" optional, the answer is no; it is doctrine (WK-PLAY-001), not UX preference.
- The 3-sentence report is exactly three sentences by design; do not add rich text.
- Gesture budget: per-household monthly cap, WK-funded, never billable, never surfaced to clients. Corporate gestures use a separate budget line.
- S3: values exist only in the vault table (envelope encrypted). No S3 value in playbook_field, logs, error messages, analytics, or crash reports. Reveal = server decrypt + audit row + 60s client TTL. NDA households: reveal restricted to assigned HM + corporate_admin.
- Section numbers 1-24 are a public API (training, audits, docs cite them). Never renumber. New content goes INSIDE sections.
- Multi-role users are normal (primary HM here, backup there). Role is per-household-assignment, not per-user.
- Movable observances (Eid, Passover, Lunar New Year, Diwali) come from a maintained calendar table with per-year rows; never compute in code.
- Money: integer cents. Founding-rate lock: rate changes blocked until lock date without corporate_admin override (logged).
- Timezones: store UTC; all household-facing logic runs in America/New_York (single-market company; do not build tz plumbing beyond that).

## 3. Traps and edge cases we already know about
- Photo consent: media_release=false or NDA blocks any reuse flag at write time, not at export time.
- Offline conflicts: last-write-wins + conflict row for corporate; NEVER block the HM's submit on a conflict.
- The importer (wk_seed_intake_schema pattern) treats unknown sensitivity as s1 ONLY for the template; real imports must fail loudly on missing sensitivity.
- Trigger engine: fire-at times are household-local; a prompt pack survives edits to its source field (packs are scheduled instances, not live queries).
- Deleting: nothing hard-deletes BY DEFAULT. Households archive; fields tombstone; audit is append-only. Membership-end deletion is a scheduled job with an export + certificate, not a DELETE. CORRECTED 5 August 2026 (the commissioning brief's housekeeping item 2; same correction CLAUDE.md received in PR #104): six tables are documented, reasoned exceptions that DELETE rows, each named with its reason in erase-household.mjs's own header (vault_item, condition_flag, object_observation, paused_decision, notification, field_event_outbox). A seventh exception needs a written reason in the erasure tool, never a silent addition.
- Search must be permission-filtered at query time (an s2 hit leaking into client search suggestions is a breach even if the row is masked).
- Do not send any client-facing notification between 9pm-7am household time regardless of trigger timing.

## 4. Who decides what (change control)
- Permission matrix, suppression rules, close-flow required steps, section schema: founder sign-off (policy).
- Trigger library contents, booking-race dates, tag definitions: corporate_admin editable in-app (versioned).
- Copy in client surfaces: brand voice review; no em dashes anywhere in user-facing strings (lint rule exists).
- Source-of-truth map: schema -> WK-PLAY-001; portals/tags -> WK-APP-001; triggers -> WK-APP-002; architecture -> WK-APP-003; scope -> WK-DEV-001. If code and doc disagree, stop and ask; do not silently pick one.
- Stage-enum design review (ADDED 5 August 2026 per ruling A121, the Four-Stage spec): once the stage enum (anticipate | identify | decide | monitor) exists, any feature tagged "decide" receives the returned-choice design review before it ships. A feature that takes decisions from the household, rather than returning the choice to them, fails the thesis and is redesigned, not shipped.

## 5. Build order that de-risks (recommended sprints)
1) schema + permissions package + audit (the foundation nobody sees), 2) importer + seed (real data day one),
3) HM briefing read path, 4) close flow + offline queue (the airplane test gates this sprint), 5) vault,
6) client portal read + report feed, 7) corporate list/tags/review queue/signal inbox, 8) trigger engine core + 3 cascades
(kindergarten, meds day, occasion radar) before the whole library, 9) exports (client PDF, exhibit tables), 10) hardening + pen review.

## 6. Definition of "it works" (acceptance beyond tests)
- Airplane test: full visit captured offline in a garage, drains in order on reconnect. Release-blocking forever.
- Payload test: automated check that a client-session response NEVER contains s2/s3 keys (CI, every build).
- Suppression test: setting LIFE-EVENT flips every surface within one request cycle.
- Fixture parity: the three Rev2 sample Playbooks load via the importer and render correctly in all three portals.
- A founder walkthrough of each portal against the corresponding WK-APP doc section, checked line by line.

## 7. Known unknowns (do not invent values)
Booking-race local dates, trigger thresholds (hours drift %, days-since-delight), QSEHRA/benefit surfaces, and the
non-billable split are pilot outputs. Ship them as configurable with the doc-cited defaults and a "pilot-calibrated" comment.
Out of scope entirely: payroll (Gusto), accounting (QuickBooks), payments, scheduling optimization algorithms v1.
