---
status: frozen
---
# Rulings and Inputs for the Development Session · 24 August 2026
Prepared for founder approval and paste-back. Rulings 2 and 3 and the clarifications are issued under the existing 24 August two-key software-updating authorization. Ruling 1 was EXPLICITLY APPROVED by the founder on 24 August 2026; the text below is in effect as written.

## Ruling 1 · Utilization vs the per-person analytics prohibition (APPROVED by founder, 24 August 2026)
The prohibition stands in purpose and is amended in scope, not eroded. The controlling distinction is capacity measurement versus performance scoring. ADOPTED SCOPE: per-HOM utilization (service hours per household per month, households per HOM) exists in exactly two surfaces: the monthly lender covenant report (REQ-083) and the capacity-gate evaluation that triggers hiring, which already depends on it under the plan of record. Visibility: founder, CFO, and the lender via the covenant report. EXPRESSLY BARRED, unchanged from the founder boundary: performance scoring, productivity ranking, leaderboards, comparative display to HOMs, use in evaluation or compensation, and any appearance on operational dashboards. Churn-with-cause is household-level and unaffected. CLAUDE.md is edited in the same PR to state the scoped exception and its bar list verbatim, citing A561 and this ruling; the boundary is amended by name, never bypassed. Sunset review at the launch-year close alongside the other instrumentation.

## Ruling 2 · ACH mandate capture vs ADR-004
The directive supersedes ADR-004 §1 by a superseding ADR shipped in the same PR as the first payments code, together with the privacy-notice change. Scope of what the app holds: mandate authorization STATUS and a processor TOKEN or reference only; bank account numbers are never collected, stored, or transited by Well Kept systems; capture occurs on the processor's hosted surface. Privacy notice language moves from "do not provide bank numbers" to "bank details are provided directly to the payment processor and are never stored by Well Kept," with counsel confirming the final text per the queued privacy-notice review. Retry/dunning behavior is processor-side; the app consumes webhook events only.

## Ruling 2a · D1 clarification: platform of record vs external systems of record
"Platform of record" in D1 governs the software Well Kept builds and owns: the existing monorepo per WK-DEV-003. It does not conscript external workflows. External systems of record are permitted and are documented in the Gate 0 per-workflow map: Jobber remains scheduling's system of record per ADR-004 until an evidence-gated migration decision, and the selected processor is payments' system of record. Migration of any workflow in either direction requires a register entry. "No Jobber migration" in D1 means the platform does not move TO Jobber; it does not mean scheduling must move off it.

## Ruling 3 · Terminology in the repo (adopting the session's proposed default)
Display copy and documentation prose rename to Household Operations Manager / HOM in one dedicated sweep session. All keyed identifiers are frozen: the house_manager role enum, stored values, payload guards, audit rows, and route gates are untouched, per the pack_key lesson. Dated historical and frozen documents remain as records. The same sweep updates "pilot" framing in WORK_QUEUE and CLAUDE.md prose to the launch/training language of the plan of record; any gate keyed on a pilot identifier keeps its key and changes its label. A559 governs released material; internal identifiers are not released material.

## Requirement text for the repo append (WK-DEV-001, section I; resolves the copy divergence)
Append verbatim; repo copy is canonical for 078..082, library copy contributed 083..085, both carry all of 070..085 after this merge:
- REQ-083 (P0) Covenant metrics as first-class events: visit arrival/departure events produce per-household monthly HOM utilization; every household departure carries a structured cause code; the monthly lender covenant report (utilization per household, churn with cause) generates from these events, not from spreadsheets. Gate: production-ready before the first covenant reporting month. Source: register A561; SBA support workbook Exhibit 9. Scope per Ruling 1 above.
- REQ-084 (P0, policy control) Property-data enrichment prohibition: no integration, import, scrape, or API enrichment from parcel records, deeds, assessor data, MLS or consumer property-data services, or people-search sources, for any feature, expressly including capital-plan prefill. Record data originates only from the household, the HOM's own observation, and member-provided documents. CI fails any dependency or integration matching this class.
- REQ-085 (P1) Software cost gate: stack run-rate and build spend tracked against the modeled software budget line; any commitment above the modeled line requires a two-key model change before it is incurred. Gate 0 deliverables include a current run-rate statement.
- Housekeeping: REQ-074 promoted to WCAG 2.2 AA per D2. REQ-075 parenthetical corrected: the scale envelope comfortably covers the 2031 plan of 56 households with headroom for gated growth beyond (corrected from a retired-plan reference).

## Missing inputs: what is being sent, with handling flags
1. 00_CURRENT_AUTHORITY.txt · CONTAINS FIGURES · reference-only, never into source control; record adoption facts as a scrubbed FOUNDER_RULINGS summary.
2. Implementation Handoff 2026-08-24 (full, with section 24) · verified figure-free · may enter docs/ at the session's discretion.
3. WK-DEV-003 document copy for the delta report · figure-free.
4. WK-SEC-001 audit scope · for Phase 1 scoping.
5. Brief 08 P0 register · CONTAINS FIGURES · reference-only; extract the security/privacy checklist items into the Phase 1 plan without amounts.
6. This rulings document · figure-free · may enter docs/ beside WK-DEV-006.
WK-DEV-006 itself: adopt into docs/ as the directive of record, as proposed.

## Household Zero / Temporal Layer gate
Confirmed from library lineage: HZ_Live_Household_Record_Master is the August paper capture, renamed from HZ_Pilot_Record_Master under the A560 sweep; the print set's transcription workbook is its companion. The founder confirmed on 24 August 2026 that the field list held up in the August capture; the Temporal Layer gate is OPEN and the migration proceeds as the first Phase 2 schema work as proposed, and the record itself still enters only through the Phase 2 importer after Phase 1 clears, per WK-DEV-006 section 5.

## Recorded
These rulings and the WK-DEV-001 merge are recorded as register draft A568 (rulings 2, 2a, 3, and the merge under existing authority; ruling 1 approved by the founder 24 August 2026). Weekly build notes begin with the first Phase 0 note.
