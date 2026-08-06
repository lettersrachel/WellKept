---
status: frozen
---

# Session commissioning brief, 2 August 2026

Founder-commissioned. All sessions below are read-only or report-only except the
two one-migration items explicitly gated. Every session ends in a written report
filed to the library and a register entry. No session fixes what it finds.
Report-and-stop doctrine governs disagreements.

## 0. Housekeeping, one short session
1. Add the three doctrine lines from SESSION_AQ_RECONCILIATION.md to CLAUDE.md.
2. Port the corrected WK-DEV-005 Section 3 wording (already fixed in the bundle
   copy on 1 August) into the repository copy, so the false "nothing hard-deletes"
   sentence is gone everywhere.
3. Delete AUDIT_SURVEY_SESSIONS.md (the weaker draft) and one of the two
   byte-identical AUDIT_SURVEY_SESSIONS_1/2.md copies, per the AQ brief's
   housekeeping note, so no session runs from the copy that asks the weaker
   question.
4. Verify the repository's requirements list carries the REQ-076 withdrawal and
   REQ-077 addition; check whether ADR-006 cites REQ-076 and correct its
   rationale to engineering grounds if so (the ADR itself does not change).
5. Resolve the READ_THIS_FIRST contradiction: the reading order says AQ was
   "Executed 1 August" while the queue lists it pending and OPEN_ITEMS says
   "following session AQ". Determine whether an AQ report exists; correct all
   three sentences to agree. If a report exists, AR's gate may already be open.
6. Run the Direction 4 tier-drift query against production: household.tier vs the
   latest tier_change per household. Report the mismatch count. While there,
   answer whether membership_event carries the weekly rate or only the tier.
   Report only. Known already per G-60: three of four production households
   carry a tier with no membership_event history, and price_cents exists but is
   not required.

## 1. Direction 0: markers, PROVISIONAL.md, the guard
Install per the ruling. Seed PROVISIONAL.md from PROVISIONAL_seed.md. Prove the
guard red, green, and against its own inputs.

## 2. Direction 2: the decline-class guards
Taxonomy is signed (Ruling 1). One migration. Both guards, all four proofs, the
2c scope-boundary test, and the 2e report-only sweep.

## 3. Direction 1a, then the ADR
The audit_event survey, read-only, five questions as written. Then the ADR per
Ruling 2.

## 4. Direction 3a: the WATCH read
Read-only. May close G-58 without a build. Report before anything else in
Direction 3.

## 5. AO, the write-path survey
As already briefed. Read-only.

## 6. AP, the test runner
Gated on AO.

## 7. AQ, the reconciliation
The six disagreements and two general questions in SESSION_AQ_RECONCILIATION.md,
documents against code, both sides quoted, nothing reconciled silently. May run
alongside AP.

## AR
Begins when AQ has reported. The founder rulings it was gated on are in
FOUNDER_RULINGS_2026-08-02.md. Its first work is whatever AQ marks stale in the
DOCUMENTS, fixed under WK-SOP-026 before any code moves. Then the Temporal Layer
per Ruling 4, decline-class guards already in place.
