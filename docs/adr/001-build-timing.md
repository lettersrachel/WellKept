# ADR-001: Build timing - build now, test on both paper and app

Date: 2026-07-18 | Status: Accepted | Decider: Rachel Letters (founder)

## Context
WK-DEV-000 ruled: run the 2027 pilot on paper, build custom in Year 2 ($80K).
The App Build Plan Section 3 required the timing decision be made deliberately,
in writing, not defaulted into. All nine specification documents have been read
through and reconciled (WK-QA-010 v1.3 FINAL); the importer, permission core
(100% branch coverage), corrected 258-field seed, and a working three-portal
prototype exist as verified assets.

## Decision
Begin the build now and run the pilot on BOTH systems in parallel:
- The paper system (WK_PLAY_002 workbook + the Jobber stack per plan 9.2)
  remains the SYSTEM OF RECORD for the entire pilot. Every doctrine gate
  (Stranger Test, close-flow discipline, provenance) is satisfied on paper
  first.
- The application is built sprint-by-sprint per WK-DEV-005 Section 5 and run
  alongside as a test harness: each pilot visit is mirrored into the app after
  the fact, and divergence between the two is logged as either an app defect
  or a spec-revision candidate.

## Guardrails (non-negotiable)
1. Paper wins every conflict until a written ADR supersedes this one.
2. No real S3 values enter the app until the vault sprint (sprint 5) is
   complete AND the hardening/pen review (sprint 10) has covered it. Until
   then S3 rows carry the placeholder "vault-pending" only.
3. Real household data enters the app only with that household's consent,
   under WK-SOP-019's authorized-systems rule (this ADR is the app's
   authorization; Airtable Path 1 authorization is unchanged).
4. The five acceptance tests (WK-DEV-005 S6) are release-blocking from day
   one: airplane, payload, suppression, fixture parity, founder walkthrough.
5. Spending against the $80K envelope is tracked from the first invoice;
   pilot-phase build spend reduces, not adds to, the Year 2 envelope.

## Consequences
The pilot now produces two outputs instead of one: validated service doctrine
AND a field-tested application, with the friction log serving both. The risk
accepted: build effort spent before pilot data can invalidate assumptions;
mitigated by the sprint order (foundation first, calibratable values shipped
as configurable per WK-DEV-005 S7).
