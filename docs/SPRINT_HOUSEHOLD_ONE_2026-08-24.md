---
status: frozen
---
# WK Sprint Directive · Household One (HO) Readiness · Week of 24 August 2026
Issued under WK-DEV-006 and the 24 August rulings (register draft A569). Figure-free; may enter docs/. Goal: by end of week, Household One (HO) can be taken through intake, a first visit cycle, and a first digest, without violating the real-data gate.

## The gate math this sprint runs on
WK-DEV-006 Phase 1 bars real household data until the internal security and custody work clears. Section 3 requires the independent external security test only before real data exceeds THREE households. Therefore: complete Phase 1's internal items this week, and HO may enter through the real intake flow at week's end. The external tester is then scheduled normally and must complete before household four. If any Phase 1 acceptance line is not green by Friday, the fallback below runs instead and nothing about the test is lost.

## Day-by-day
**Day 1-2 · Phase 1 internals (custody and security).**
- LLC ownership verified on the GitHub org, hosting, database, object store, and every billing account; contractor holds membership only (WK-DEV-006 24.8).
- Passkey/security-key MFA live on every privileged staff and admin account (D3); TOTP retained as fallback for now.
- Backup restore drill executed and timed against REQ-072; result recorded.
- Secrets audit: nothing in the repo or env files that belongs in the managed store; access matrix written.
- WK-SEC-001 self-run on the critical items: tenant isolation tests (cross-household read attempts must fail at the query layer), permission matrix tests green at 100 percent coverage, sensitive-field ACL spot checks on S2/S3, audit-log write verification.
- Retention and deletion: confirm erase-household runs clean against a synthetic household.
Acceptance to proceed: every line above green and recorded in the weekly note. Any red line triggers the fallback, not a waiver.

**Day 2-3 · Intake slice.**
- Household creation flow exercised end to end on a fresh synthetic household, using the Household Zero field list as the intake schema (the founder confirmed the field list held; this is its first reuse).
- The tooling/import path verified against a blank copy of the HZ transcription workbook so the founder can capture on paper during the home walkthrough and the session imports it, same as Household Zero's pattern.
- Sensitivity levels assigned per field at import time; S3 items spot-verified invisible to non-privileged roles.
- Client-surface check: D7 lint green (no duration-typed fields on any client route the household will see).

**Day 3-4 · Visit loop and digest.**
- Arrival and departure taps produce visit events; close-flow completes; the events land in the audit log and the covenant event stream (REQ-083 path exercised even though this household is unpaid).
- One full digest generated for the synthetic twin and reviewed by the founder for tone and content before any real household receives one.
- Stranger-mode and vault behavior verified on the mobile app against the new household's data shape.

**Day 5 · Dry run, then the founder's go/no-go.**
- Complete end-to-end rehearsal on the synthetic twin: intake import, one simulated visit, digest, one simulated correction (edit a field, verify the audit trail).
- If all Phase 1 acceptance lines are green: the founder authorizes real intake, and the household enters through the production flow. If not: the fallback runs.

## Fallback (loses nothing)
HO is entered pseudonymized under its designation: Household One, code HO, following the Household Zero (HZ) convention, no street address, no contact details in the system, S3 fields withheld. Every workflow (visits, taps, close-flow, digest generation with delivery to the founder rather than the member) still exercises fully. Real identifiers replace the pseudonyms in one import the day Phase 1 clears. The test proceeds either way; only the data's realism waits.

## Founder-side checklist this week (the build does not do these)
1. Choose the household that becomes HO and get a plain written consent: a one-page test-participation note covering what is collected, who sees it, that they may withdraw and be erased on request, and that this is a test of the software, not yet the paid service. Counsel polishes it later with the queued privacy notice; a simple honest version now is fine for a willing volunteer.
2. Capture the intake on the Household Zero paper kit during a walkthrough; hand the completed transcription workbook to the session for import.
3. Schedule the first real visit for the week after, so the visit loop runs against a real calendar.
4. Review and approve the digest sample before the first one ships to the household.
5. Decide pseudonym versus real-name entry at the Day 5 go/no-go.

## Honest boundaries
- HO is PRODUCT evidence, not demand evidence: Exhibit 8 of the lender workbook counts only paid instruments, and an unpaid test does not enter it. If HO later converts to a paid membership or Reset, that signature enters Exhibit 8 on its own merits, and a test household that chooses to pay is among the best evidence there is.
- No payments this week: mandate capture waits on the D5 processor selection, which is unaffected by this sprint. HO is billed nothing and asked for no bank details.
- The staffing wall applies in the home from visit one: HO hears standards and rhythm, never hours, caseloads, or their place in any numbered sequence; HO is an internal designation only and is never spoken in the home.
- Scope discipline: nothing from Phase 3 gets pulled forward because a real household makes it tempting. The sprint ships intake, visits, and the digest. That is the test.

## Deliverable back
Friday's weekly build note reports: Phase 1 line-by-line status, the dry-run result, the go/no-go decision and its basis, the covenant event stream sample from the simulated visits, and the stack run-rate statement if Phase 0's is not yet delivered. Register draft A569 records the sprint and its outcome for transcription.
