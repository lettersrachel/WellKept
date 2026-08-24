---
status: frozen
---
# Founder rulings and authority record, 24 August 2026 (scrubbed summary)

The scrubbed record of the 24 August developer transfer set, per the standing
rule that financial figures never enter source control. Two files in the set
are reference-only for that reason (00_CURRENT_AUTHORITY.txt and the brief-08
P0 register); their figure-free facts are recorded here. The rulings
themselves are in the repo verbatim as `DEV_SESSION_RULINGS_2026-08-24.md`;
the directive is `WK-DEV-006_Execution_Directive.md`; the handoff is
`IMPLEMENTATION_HANDOFF_2026-08-24.md`.

## Authority facts (from 00_CURRENT_AUTHORITY.txt, 22 August, adopted 24 August under both keys)

- A one-page authority document now exists and wins over any document that
  disagrees with it; a conflict with it gets a register entry.
- The financial model of record is the v2.9r2 Scale-Gated Business Plan
  workbook (22 August), superseding WK_01G_v18 and every v2.1-v2.8 workbook.
  The five-year lender plan and the strategic household gates are authored
  there and nowhere else. Figures live only there; none are repeated here.
- Terminology of record: the role title is Household Operations Manager
  (HOM). 2027 is a commercial launch, not a pilot. Two founding HOMs complete
  four weeks of paid Founding HOM Training in February 2027. No Academy, no
  terminal-target claim. The legacy aggregate market claims are paused for
  external use pending the sourced rebuild (register A562).
- Register state: WK-QA-018 current through A552 on paper; A553-A567 adopted
  under both keys 24 August (Rachel Letters, founder; Kelly Stover, CFO) and
  awaiting physical transcription; A568 drafted covering the dev-session
  rulings and the WK-DEV-001 merge.

## The two-key adoption record (24 August), scrubbed

Adopted without condition: A553 (financial-model authority transfer),
A554 (model-lineage consolidation), A555 (external-document supersessions),
A556 (marketing-line supersession), A557 (named-contact CRM boundary rule:
named-contact data never travels in an uncontrolled archive), A558
(known-stale rebuild registrations), A559 (WK-QA-024 release sweep tool and
terminology of record), A560 (full master-library sweep), A561 (validation
dossier; HOM-utilization and churn-with-cause instrumentation committed),
A564 (pricing presentation doctrine: member-facing materials never pair
price with hours, durations, caseloads, or staffing ratios), A565 (overview
deck V3 ratified), A566 (implementation handoff filed as Tier C;
REQ-083..085 promoted), A567 (WK-DEV-006 adopted). Adopted with conditions:
A562 (aggregate rebuild method; external use gated on two direct-source
verification cells), A563 (SBA support workbook rebuild; its cover gates
remain open). Open rulings not covered: Founding Credit, demand-budget and
staffing variants, the dues display unit, the authority-dashboard block
relocation, the training two-track doctrine, the fee-schedule quote gate.

## The dev-session rulings (verbatim text in DEV_SESSION_RULINGS_2026-08-24.md)

- Ruling 1, founder-approved 24 August: the per-person analytics boundary is
  amended by name, not eroded. Capacity measurement versus performance
  scoring is the controlling distinction. CLAUDE.md carries the scoped
  exception and its bar list verbatim in the same PR (done, this PR).
- Ruling 2: ACH mandate capture supersedes ADR-004 section 1 by a
  superseding ADR shipped with the first payments code; the app holds
  mandate STATUS and a processor TOKEN only; bank account numbers never
  touch Well Kept systems; capture happens on the processor's hosted
  surface; the privacy notice changes with counsel confirming final text.
- Ruling 2a: "platform of record" governs software Well Kept builds and
  owns; Jobber remains scheduling's system of record per ADR-004 until an
  evidence-gated migration decision; workflow migrations in either
  direction require a register entry.
- Ruling 3: display copy and documentation prose rename to HOM in one
  dedicated sweep session; all keyed identifiers frozen (the pack_key
  lesson); dated and frozen documents remain as records; the same sweep
  updates pilot framing to launch/training language.
- Household Zero: the founder confirmed the field list held in the August
  paper capture. The Temporal Layer gate (Ruling 4 of 2 August) is OPEN;
  the migration proceeds as the first Phase 2 schema work. The record
  itself enters only through the Phase 2 importer after Phase 1 clears.

## Phase 1 security and privacy checklist (extracted from brief 08 without amounts, per the rulings' handling flag)

Before the first live member household: privacy notice and internal privacy
standard; data inventory and map by system and purpose; access-role matrix;
MFA, unique accounts, and device baseline; the Household Record marketing
firewall; AI-use standard and third-party training restrictions; retention
and deletion schedule (REQ-077); employee and vendor offboarding process;
incident-response and breach-notification playbook; vendor and processor
confidentiality, security, and incident terms; backup and recovery test;
access and credential issuance and revocation evidence; no live secrets in
ordinary notes. ACH compliance rider (23 August): the chosen processor must
provide NACHA-compliant origination fraud monitoring; signed mandates
before first debit; the ACH-only default reflected in the member agreement.

## Handling findings from this session's own verification

- WK-DEV-003 was flagged figure-free in the rulings document but contains a
  budget-envelope dollar figure (its line 7). Held reference-only, used as
  the delta-report input; it enters docs/ only after a founder decision on
  scrubbing versus holding, reported rather than silently redacted.
- WK-DEV-003 and WK-DEV-004 both describe the July 2026 specification
  architecture, not the system as built. The full documents enter the repo
  after the Phase 0 delta report annotates the deltas; WK-DEV-004's three
  adopted 24 August conventions are carried now in
  `WK-DEV-004_Additions_2026-08-24.md`.
- INSTRUCTION_UPDATES_2026-08-05_v2 is held out of docs/: the dated
  verbatim check found its REQ-078..082 wording diverges from the repo
  copy, and the rulings resolved the divergence in the repo copy's favor,
  so adopting the origin document would put two divergent requirement
  texts in one repo. The divergence and its resolution are recorded in
  WK-DEV-001 section J.
- The full test suite ran green (22/22 tasks) before any change, per Phase
  0's acceptance line, on the local half.
