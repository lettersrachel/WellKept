---
status: living
---
# WK-DEV-007: Expanded Build Authorization
Version 1.0 · 24 August 2026 · Founder direction of 24 August 2026, under the standing two-key software authorization (register draft A570). Figure-free; enters docs/ beside WK-DEV-006.

## 0. What this changes and what it does not
WK-DEV-006's Phase 3 evidence-gating is amended FOR INTERNAL SCOPE ONLY: the nine-primitive architecture, the anticipation engine, and the internal dashboards are authorized to build now, at full depth, ahead of operating evidence. The amendment's safety mechanism is mode, not scope: everything built under this directive is either invisible infrastructure (schema, services, tests), an internal surface (HOM, Desk, corporate), or an engine running in SHADOW MODE as defined in section 3. Unchanged and restated: every never-build wall in WK-DEV-006 section 4; the real-data rules (Phase 1 gate for any real household, external security test before real data exceeds three households); the single-consent rule; Ruling 1's visibility scope; D7; REQ-084; REQ-085 run-rate reporting. The CLIENT side is explicitly deprioritized: no client surface beyond the digest view changes under this directive, and client-facing activation of anything built here requires a separate release decision.

## 1. Priority order (founder-set)
1. The input function, made perfect (section 2).
2. HOM Cockpit functionality, made perfect (section 2).
3. The nine primitives, completed as substrate (section 4).
4. The anticipation engine in shadow mode (section 3).
5. Internal household-state and corporate dashboards (section 5).
6. Client side: untouched except the digest.
Work may parallelize, but review attention, polish passes, and the definition of "perfect" apply in this order.

## 2. Input and HOM Cockpit: the perfection standard
"Perfect" is defined so it can be tested, not admired.

**The input spine** is every path by which reality enters the system: the intake importer (paper kit and transcription workbook to structured Record), in-visit capture, arrival and departure taps, close-flow, and Record edits. Standards:
- Capture cost: any single observation is recordable in three interactions or fewer from the briefing screen; the close-flow completes a routine visit in under two minutes of interaction time. Measure and report both.
- Offline is first-class: every input path works in airplane mode and syncs with conflict resolution that never silently loses a field; run a documented airplane-mode drill covering capture, close-flow, and sync-on-reconnect as an acceptance test.
- Nothing is lost, ever: autosave on every field, explicit undo for every edit, dedupe on import, and every mutation in the audit log with actor and timestamp. A crashed app mid-close-flow resumes exactly where it stopped.
- Validation serves the field, not the schema: reject nothing a HOM plausibly means; flag rather than block; sensitivity level required at capture time with a safe default of the more restrictive tier.
- Import hardening: the importer round-trips the Household Zero workbook and the sprint's second household without manual XML or spreadsheet surgery; malformed rows produce a human-readable exception list, never a partial silent import.
- Photos follow the media rules: capture gated by the media-release flag, stored in the vault path, never in the general object store, EXIF location stripped at capture.

**The Cockpit** is an action surface, and its perfection standard is the field's: briefing loads under the REQ-073 budget on cached data; stranger mode reachable in one gesture and verified to hide every S2/S3 surface; the day's route, open loops, and signals (section 3) in one screen without scrolling on a standard phone; every action either completes or explains itself, no dead taps. A founding-HOM walkthrough script is written so February training doubles as the acceptance test.

## 3. The anticipation engine: full build, shadow mode
Build the WK-APP-002 trigger library as code in packages/triggers, the evaluation engine in the worker, and the complete authority-class machinery from the handoff section 14 (A0 observe through the full ladder), with the AUTHORITY CAP set in configuration, enforced in code, and tested: nothing above A0/observe emits outside the shadow log until a two-key raise recorded in the register.

Shadow mode, precisely: the engine evaluates every trigger against synthetic households continuously and against real households once they exist, and writes what it would have surfaced (signal, confidence, evidence, proposed authority class) to a shadow log visible only to the founder, CFO, and the developer. No HOM notification, no client output, no task creation. The Cockpit gains a SIGNALS panel that remains empty until the founder flips a per-trigger flag promoting that trigger from shadow to A0-visible, at which point the single-consent rule governs every suggestion individually, exactly as the handoff preserves it.

The measurement loop is the point: weekly, the shadow log is scored by the founder (true signal, noise, or unknowable), and per-trigger precision accumulates. A trigger earns its promotion flag on evidence, trigger by trigger, and the register records the first promotion batch. This converts the restraint doctrine from "do not build" into "build fully, activate on proof," which is its actual intent.

Engine safety rails: deterministic and replayable evaluations (same inputs, same output, logged inputs hash); evaluation never mutates household data; per-trigger kill switch; the engine's compute stays inside the existing worker and stack, and any model-inference dependency (local or API) is a register-visible decision, not a quiet import.

## 4. The nine primitives: substrate completion
Build all nine primitives exactly as enumerated in the Implementation Handoff section 5, each to the same definition of done:
- Schema in packages/schema with Zod parity, uuid v7, timestamps, household_id scoping and index where household-scoped, per WK-DEV-004.
- A service layer with every mutation through the centralized permission action wrapper; no direct table writes from surfaces.
- Events over duplicated state: any cross-primitive fact travels as an event through the outbox, never as a second copy; the handoff's shared-engine rule is enforced by review.
- Tests: permission matrix rows for the primitive at 100 percent, isolation tests, and at least one lifecycle test from creation to archival/erasure. The erase-household path is extended to cover every new primitive as it lands, so REQ-077's machinery stays whole.
- Migration discipline per WK-DEV-004; every primitive lands with its migration, rollback note, and a seed for the synthetic fixture families.
Where a primitive's full behavior is client-facing (per the handoff), build the schema, service, events, and internal views now; the client surface waits per section 0.

## 5. Dashboards: household-state and corporate
Both are internal, read-only over the event stream, and built after the input spine meets its standard, because dashboards over bad input are decoration.

**Household-state board (the "home" dashboard, internal):** one screen per household for the HOM and the Desk: Record completeness, open loops with age, upcoming rhythm items, recent visit outcomes, active signals (post-promotion only), sensitivity-filtered by role. Its test: a person who has never seen the household can brief themselves in ninety seconds, which is the continuity promise as a UI.

**Corporate board:** coverage (visits completed, missed, upcoming, per route), the exception queue with age and ownership, capacity against the gates (aggregate utilization and the hiring-trigger state), churn events with cause codes, and the covenant report's live preview. Ruling 1's visibility scope is enforced in the permission matrix, not the UI: per-HOM utilization renders only for founder and CFO roles, and a role-based test proves a corporate-role user without those flags cannot retrieve it by any route, including the API. Attention discipline applies to the board itself: no metric appears without an owner and a threshold that defines when it is worth looking at, per the handoff's notification architecture.

## 6. Standing rails (unchanged, restated for this expansion)
No client-surface expansion. No property-data enrichment (REQ-084; the CI check ships in this workstream's first week if not already landed). No time quantities on any client route (D7 lint enforced). No new third-party dependencies or integrations without a register-visible decision, and a running dependency ledger is kept for the external security tester. Single consent on every suggestion that ever reaches a human. Real-data rules untouched. Run-rate in every weekly note (REQ-085); if this expansion moves the run-rate or requires paid services, the note says so before the commitment, not after. Escalation per WK-DEV-006 section 8: proposed default, 48-hour clock, ADR.

## 7. Acceptance and reporting
Each workstream reports against its own standard above in the weekly note, plus: the shadow log's first week of output with the founder scoring sheet; the input-spine metrics (capture cost, close-flow time, drill results); the dependency ledger delta; and a single honest line per week on what was deliberately NOT built and why, so the restraint stays visible even inside the expansion. Register draft A570 records this authorization; the first trigger-promotion batch, any authority-class raise, and any client-side activation each get their own entries when they come.
