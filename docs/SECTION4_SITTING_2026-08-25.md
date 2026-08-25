---
status: frozen
---

# DEPLOY.md section 4 sitting, 25 August 2026

Dated evidentiary record. Build under test: production serving `50ecd0f`
(the tenth clean run, deployed the same evening cycle). This sitting
SUPERSEDES the 6 August 2026 sitting, whose passes described `12b9661`
and which closed incomplete with checks 8, 10, 11, 13b, and 14 never run
against any live build. As of this record, every standing check has run
against the live build.

How it ran: the founder executed the browser checks against
https://wellkept-orcin.vercel.app as corporate_admin; the founder's local
CLI session executed the scripted checks and the verification queries
against production (this repo's cloud session has no production access by
design); the cloud dev session guided, scored, and wrote this record.
Write-heavy items ran against the Smoke Test Fixture
(`8a4b9786-9698-4200-95b9-91abec7a40ef`) only, re-seeded at the start of
the sitting.

## Scoreboard

| Check | Result | Evidence |
|---|---|---|
| 1 health | PASS | scripted (smoke-mechanical): ok + db up |
| 2 sign-in loop | PASS | magic link arrived, landed per role |
| 3 edit approval | PASS | `field_write` audit row 16:16:58 via client_edit_approval, old and new value hashes DIFFER (unlike 6 Aug, where the seeded proposal matched the stored value and the merge no-opped), so the approval path is proven on a real change; meds-day anticipation items appeared, which is the field-change job's observable effect (the Railway log itself was not read this sitting; the effect stands as the evidence) |
| 4a, 4b dev gates | PASS | scripted: both dev surfaces 404 |
| 5 vault round-trip | PASS | the fixture's sealed fake value (0000) revealed in-context, auto-hid at 60s, "this view was logged" shown; TWO reveal pairs in the audit trail (16:17, 16:20), each s3_corporate_view row ordered BEFORE its s3_reveal_outcome delivered:true, the audit invariant holding live |
| 6 consent card | PASS both directions | NO-CONSENT banner rendered where no consent exists; Household Green's consent RECORDED at this sitting (signed 25 Aug 2026, doc version corrected by re-record to "household-consent v1 (2026-07)", the audit trail keeping the prior value); the recorded date rendered exactly as typed, the live G-61 proof |
| 7 incident loop | PARTIAL, halves covered | fresh logging last ran 6 August (its incident is the one this sitting resolved); the open-incident flag and its clearing were exercised live today via 51a380e1's resolution; not re-logged fresh today |
| 8 CEO previews | PASS, first live-build run | all three projections rendered, switcher flipped all three ways; the client preview rendering without error is the live payload-guard pass |
| 9 exclusion loop | PASS | TEST exclusion created 16:19, ended 16:21 with a VISIBLE close (window reads "Aug 25 to Aug 25", End control gone), `effective_to` set AND the `exclusion_ended` audit row present, zero open exclusions after; the G-55 silent-nothing shape did not recur. The suppression half (excluded text absent from newly generated prompts) was not observable on a literal "TEST" target and stands on the 28 July full-loop proof |
| 10 recall section | PASS, first live-build run | "Last year at this time" with its empty-state note on BOTH briefing surfaces (recall correctly dark until a year of history) |
| 11 photo toggles | PASS, first live-build run | hold off/on, reuse yes/no: four audit rows 16:23:44-51, photo restored to its original state (retention_hold=true, reuse_allowed=false) |
| 12 knobs | PASS | scripted: photo_retention and rule_health present with intended values; visit_reconciliation founder-set `{"gapDays":10}` intact, never repaired by the script |
| 13a erasure guard fires | PASS | dry run REFUSED with the open-incident message, exit 2, while 51a380e1 stood open |
| 13b erasure plan reads | PASS, first live-build run | 51a380e1 resolved 16:26 ("not preventable", no rule link, the honest answers for a test incident); the dry run then PRINTED ITS PLAN and wrote nothing. Same tool, same sitting, both directions: the strongest form of the G-15 guard-must-fire proof yet produced |
| 14 trigger health | PASS, first live-build run | all three rules carry full health lines (fired 3 / 0 / 2, answered 0, ignored 100% where fired); the back-link line reads answered on 1 of 5 resolved incidents, registering this sitting's own answer; the misses table correctly empty |
| 15 invisible-household census | PASS | scripted (added this deploy day): every household holds a corporate role or is excused; Field Test Home stands as the one written excusal pending the founder's disposition |
| Glance: board capacity gate | PASS | "Gate set: cap 5, band 3 to 5" with the two-key sentence; hiring-trigger state "BELOW BAND: fleet load 1.3 under the band floor of 3"; the board's own text holds Ruling 1 (aggregate by construction) and points the section 5 disagreement at the work queue |
| Glance: Tell Well Kept | PASS, exercised | not merely present: a capture was submitted live and confirmed ("Recorded: captured; we handle the filing"), landing a real capture_artifact row |

## The dry-run plan, as read (13b)

Vault items to crypto-shred: 1 (G-04 PITR window noted by the tool
itself). Photos to purge: 0, WITH one photo under retention hold
HONOURED and kept, which is why the purge count reads zero rather than
one. Playbook fields to clear and tombstone: 2. Deferrals to blank: 2;
paused decisions to delete: 2; client edits to blank: 6; prompts: 11.
Incident reports: 3 KEPT as business records. Time/cost entries 3/1
KEPT with notes blanked; membership events 6 KEPT with cancellation
reasons blanked; exclusions 4 kept with reason and target blanked.
Outbox rows: 6 deleted. Audit subject tokens: 2 deleted (ADR-006: the
deletion IS the audit-identity erasure; the audit rows survive and
become unlinkable). Role assignments to delete: 4. Audit events kept
intact. The output read with hyphens throughout: the copy-guard
widening is holding on the exact surface the 6 August em dashes sat on.

## Findings and dispositions made at the sitting

- **Stray fourth identity on the fixture:** the erasure plan's four role
  assignments surfaced `rachel.letters@hotmail.com`. Confirmed by the
  founder as her own unused alternate address and REVOKED at the
  sitting through the app path (audited role_revoked). The fixture is
  back to its three intended identities.
- **Consent doc version corrected:** the first recording carried the
  word "consent" as the version; re-recorded with the true identifier.
  The correction path (re-record on top, audit keeps the prior value)
  worked exactly as designed.
- **Reconciliation knob observed live:** all four active households
  flagged "no visit in 10d" on the board, Household Green included,
  which is the predicted correct state until the tester's first visit.
  The knob working, not a fault.
- **Aggregate visibility vs reachability:** Field Test Home appears in
  the board's aggregate coverage counts while its drill-in stays
  unreachable (no corporate holder). The check-15 excusal covers the
  reachability gap; the aggregate appearing is by construction.

## Left open by this sitting

- Field Test Home disposition (founder decision; grant-and-inspect
  recommended; the check-15 allowlist holds meanwhile).
- The founder's test capture awaits dismissal in the corporate router
  queue (reason: sitting test capture).
- Lauren Green's first sign-in (instructions delivered).
- Check 7's fresh-log half and check 9's suppression half re-run
  naturally at the next sitting with a real topic and a fresh incident.
- The Railway worker log was not read directly; the field-change job's
  effect was observed instead.
