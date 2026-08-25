---
status: frozen
---
# WK-DEV-011 · Consolidated Build Brief · 25 August 2026
The single current entry point for the development session. Supersedes the transfer-set READMEs as the first read. Issued under the standing two-key software authorization (register draft A578). Figure-free; enters docs/ and replaces prior orientation notes. Everything here cites its source; where this brief compresses, the cited document governs.

## 1. Reading order and precedence (canonical, per the v5 intake ruling)
1. 00_CURRENT_AUTHORITY.txt (reference-only, never committed) · 2. This brief · 3. WK-DEV-006 Execution Directive · 4. The 24 Aug rulings (Rulings 1, 2, 2a, 3, all approved) · 5. The v5 Intake Ruling (25 Aug) · 6. Handoff v5 (the consolidated Tier C reference) · 7. WK-DEV-007 / 008 / 009 v1.1 / 010 v1.1 (the governing implementation directives) · 8. Sprint HG + Tester Provisioning + Founder Inputs (operational) · 9. The Consistency Audit v2 (context). Precedence: controlled requirements (WK-DEV-001..005 merged, REQ-070..085), the directives, and the rulings govern; Handoff v5 informs; SILENCE IN V5 IS NOT SUPERSESSION. The 24 Aug handoff is lineage (origin of REQ-083..085).

## 2. State of the build (verified as of this morning)
Phase 0 complete and merged (PR #119: ADR-007 staging, ADR-008 pins, the 18-workflow SoR map, the CAND ledger, staging runbook). Phase 1 (HG sprint days 1-2: custody, passkeys, restore drill, isolation tests) in flight this week. WL Gate 1: four of six objects merged (task_definition 0049, household_task_profile 0050, work_requirement 0051, estimate_snapshot 0052; migrations through 0052; the founder's production three-way count reads 53); Task Occurrence and Time Segment remain, each its own migration session. Zero-refusal and Ruling 1 posture verified structurally in 0052. Suites green (schema 12/48, e2e 20/20 at last report).

## 3. The law in force, compressed (each item cites its home)
- Covenant events REQ-083: visit_arrival / visit_departure / household_departure + cause_code; the monthly covenant report is a pure function of events. (WK-DEV-006 §24.3; Ruling 1 scope.)
- Enrichment wall REQ-084: no parcel/deed/assessor/MLS/property-data/people-search integrations for any feature; CI dependency guard enforces. Applies to retrieval and priors too. (006 §24.4; 008 §5; 010 v1.1 §7.)
- Cost gate REQ-085: run-rate in every weekly note; spend above the modeled line is a two-key change BEFORE commitment. (006 §24.1.)
- Ruling 1: utilization is capacity measurement for the covenant report and hiring gates only; founder/CFO/lender visibility; no performance scoring, ranking, leaderboards, or per-HOM comparative surfaces anywhere, enforced in the permission matrix and proven by retrieval tests; attention/friction telemetry corporate-only under the same bar. (Rulings doc; 007 §5; 009 v1.1 §1.)
- D7: no time quantities on any client route; lint enforced; internal surfaces keep full durations. (WK-DEV-006 D7.)
- Client freeze: nothing client-facing beyond the digest changes without its own release decision. (007 §0; slice outputs land in the digest per 010 v1.1 §6.)
- Single consent and batch scope: every AI-created fact or proposed action is individually confirmed; batch confirmation covers ONLY the HOM's own known-normal deterministic completions; consequential items always individual. (Handoff §14; 009 v1.1 §2.3; audit C-05 convergent.)
- Shadow doctrine: the anticipation engine fully built, A0 cap enforced in code, shadow log founder/CFO/dev only, per-trigger founder promotion flags, weekly precision scoring. (007 §3.)
- Tier D/M split: deterministic ambient authorized now and IS the input-spine work; all model inference stubbed behind the Tier M gate (provider + AI-01 suite + consent clause + run-rate line, one future two-key entry). Voice: HOM-initiated dictation only, ever; S2 vault, transcribe-then-purge. (009 v1.1 §§0, 3, 12.)
- Segments: storage model derived from taps and timestamps; manual per-segment timing prohibited in v1; unknown duration never silently zero (proven structurally in 0052). (008 §3; 010 v1.1 §3.)
- Vendor slice rulings: internal simulation of the vendor link until the external pen test covers that surface; scope the tester for it now; vendor-complete never implies resolved; the disputed path is release-blocking. (010 v1.1 §§6, 14.)
- External access law: relationship never implies permission; grants expire; no raw S2/S3 ever projectable externally; private data transforms to operational instructions; emergency revocation is one tested corporate action. (010 v1.1 §7; v5 intake §3.6 adds Zone State's reason-privacy and CaseHierarchy's verified-closure as design rules.)
- Capacity configuration: band 3..5 households per HOM as versioned config; CAP=5 is covenant-relevant, so cap changes are two-key model changes before config changes; 15-to-20 assumptions are dead. (v5 intake §3.3; audit C-06.)
- Task IDs: provisional-source flag on task-layer rows until the Task Inventory ruling lands; nothing binds permanently to renumberable IDs. (008 §4.) CONFIRM the flag is present on 0049 rows in the next note.
- Tester layer: Lauren Green is a HOM-role user, tenant-scoped to household_green, tester flag excluding her events from covenant/payroll/learning by one filter; her deny paths are release-blocking; iPhone confirmed, web Cockpit or Expo Go interim, EAS iOS config prepared in advance. (Tester provisioning doc.)
- Data rules: synthetic only until Phase 1 clears; HG pseudonymized until the go/no-go; real data never exceeds three households before the external security test. (WK-DEV-006 §§3, 5; sprint.)

## 4. Mission stack, in order
1. **HG sprint to Friday's go/no-go**: Phase 1 internals green, intake slice, visit loop, digest sample to the founder, dry run, decision. Lauren's account created, isolation proven against it, device path chosen; report all three in the next note.
2. **Input spine and Cockpit perfection** (007 §2 standards: three interactions, two-minute close, airplane drill, autosave/undo/audit, importer round-trip, one-gesture stranger mode), with Tier D ambient patterns as that work and the avoidable-touch metric reporting.
3. **Gate 1 completion**: Task Occurrence, then Time Segment with the derived-from-taps rule enforced structurally the way 0052 enforced zero-refusal.
4. **Substrate backfill** per 007 §4 and the shadow engine per 007 §3, as idle capacity allows; dashboards after the spine meets its standard.
5. **The vendor-repair slice** as the first major workstream after a green go/no-go (010 v1.1 §6, ten stages, internal vendor simulation).
6. **Training Household** seeded and behaving before February (010 v1.1 §10); it doubles as the demo instance.
7. **CAND housekeeping pass**: the sixteen assigned candidates plus the nine recovered concepts from the audit (SituationEvent merged with the existing bundle; WorkCognitiveLoadProfile under Ruling 1's never-ranking bar) get owner/forum/date or close, per 24.7.

## 5. What the session is waiting on (founder-side; do not invent, do not block)
Staging dashboard URLs (then build the repo-side half) · the filled run-rate statement (reference-only when filled) · the Task Inventory v1.3 locate-or-reconstruct ruling · the D-U-N-S/Apple Developer enrollment (paces Lauren's native build; interim path already ruled) · the security package v3 file set (Threat Model v2, abuse suite, lifecycle matrix; align the pen-test scope to them on arrival; the abuse workbook stays honestly NOT RUN until tests execute) · the D5 processor pick when the shortlist is delivered · HG's signed consent and paper intake · answers to the two clocked propose-defaults (ServiceEvent lifecycle shape; no-app link auth), with the 48-hour default rule standing.

## 6. Weekly note, consolidated contents
Phase and acceptance-line status · input-spine metrics (interactions per observation, close-flow time, drill results, avoidable touches) · shadow-log scoring sheet once live · forecast-versus-actual once live · run-rate versus the modeled line · dependency-ledger delta · slice-stage completions once started · Purpose Pack first grants · TrainingState coverage approaching February · the provisional-flag and recall-job (EXISTS-VERIFY) confirmations once each · blockers with age · and the standing "deliberately NOT built" line, currently: the optimizer, ambient inference until the Tier M gate, native vendor app, vendor marketplace, autonomous scheduling, custom predictive ML, broad smart-home ingestion, with productivity ranking recorded as never, not yet.

## 7. The doctrine, one line
Sophistication in the backend, quiet at the frontline, evidence before activation, every gate opened by a named decision: boring infrastructure underneath unusually thoughtful household operations.
