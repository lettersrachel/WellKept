---
status: living
---
# Gap register triage

**Preparation batch item 11.** Every entry marked **blocks-E1**, **defer** or
**stale**, one line each.

**GENERATED, not transcribed, and only half of it is generated.** The ids,
titles and addendum counts are read from `docs/GAP_REGISTER.md`; the mark and its line are a
person's reading of the entry. Re-run
`node tooling/review/g-register-triage.mjs`. **The guard runs both ways: an
entry with no mark refuses, and a mark naming an entry that no longer exists
refuses**, so a new register entry breaks this file until somebody triages it.

**Why the marks are not computed.** The register carries no machine-readable
status field. A keyword scan for CLOSED or FIXED was tried and abandoned: it
matches those words in prose and misses entries closed in lower case, so it
returns a confident number about a question it never asked (G-129). Every mark
below comes from reading the entry.

## What the marks mean

- **blocks-E1**: must be resolved before the E1 software gate or before the
  founding cohort it depends on. Most are founder-side rather than engineering.
- **defer**: live and real, not on the E1 path. A trigger is named where one
  exists, so a deferral has an end rather than a hope.
- **stale**: nothing to act on. Closed, fixed, superseded, withdrawn, or
  describing a state that no longer exists. **The line says which**, so closed
  and superseded stay distinguishable inside one mark; the item asked for three
  marks and the distinction lives in the sentence rather than in a fourth.

## The counts, computed from the marks below

| Mark | Entries |
|---|---|
| blocks-E1 | 17 |
| defer | 44 |
| stale | 70 |
| **total** | **131** |

**The batch item said 122 and the register holds 131**, in 148 headings
(the difference is addendums, which are counted with their parent). Corrected
against the tree rather than carried from the document, per the standing rule.

**3 titles below carry an em dash**, quoted verbatim from register entries
written before the rule was swept. They stand as written: rewriting a quoted
title would misquote a frozen dated entry, which is the objection the
27 August ruling rests on. The count is computed, so it cannot drift.

## The gate nobody had looked at

**G-13, the staff disclosure**, and it is the one the batch item guessed was
there. It is founder-approved, not counsel-reviewed, and not acknowledged by
any hire. CLAUDE.md's merge gates say no capture surface attributing data to a
named HOM ships before it, and `time_entry` and `object_observation` already
exist under that rule. G-41 sharpens it: **it gates HIRING, not a build**, so
it is reached by the founding cohort rather than by a queue row, and nothing in
CI can say so.


## blocks-E1 (17)

| Entry | Title | One line |
|---|---|---|
| G-01 | Master key has one custodian and no recovery path | The vault's root of trust has one custodian and no recovery path. ADR-005 is drafted and the second custody is still a bracket; no real s3 value should exist until it is filled. |
| G-02 | No backup of production data outside Neon | Neon PITR is the only copy of every playbook, vault row, audit event and photo. The custody checklist puts the restore drill BEFORE touching the database account at formation. |
| G-07 | Insurance is not addressed anywhere in the package | Insurance bound is an E1 condition in its own right, and workers' compensation attaches from the point of employment in Virginia. |
| G-08 | No breach response procedure and no named owner | No breach response procedure and no named owner. WK-SEC-001 and the privacy notice both assume one exists. |
| G-09 | Subprocessor agreements not executed | Five subprocessor agreements, no cost, none executed. Real household data should not flow before they are. |
| G-10 | No first House Manager and no first household | No first HOM and no first household. Everything E1 measures (thirty stable days, a member on the digest for a month) is downstream of this. |
| G-13 | Nothing discloses to staff what the system holds about them | THE GATE NOBODY HAS LOOKED AT SINCE AUGUST. The staff disclosure is founder-approved and neither counsel-reviewed nor acknowledged, and CLAUDE.md's merge gate says no capture surface attributing data to a named HOM ships before it. `time_entry` and `object_observation` already exist under that rule, and G-41 makes it gate HIRING rather than a build. |
| G-19 | The counsel packet is missing the breach-notification commitment | The privacy notice still carries the breach-notification bracket, so a member-facing legal document is unfinished. The legal half of G-08. |
| G-22 | The key re-wrap has never been drilled | The key re-wrap has never been drilled, and a documented procedure is not a drilled one. Same class as the restore drill, same trigger: formation. |
| G-26 | The strongest safety guardrail in the package sits in a Proposed ADR | ADR-005 is still Proposed, and its own consequences section says it stays Proposed until the brackets are filled and the sealed copy exists. The strongest guardrail in the package is in a document that has not been adopted. |
| G-41 | Personnel data captured without a staff disclosure | Personnel data is captured against a named HOM with no staff disclosure in force. Reads with G-13; the trigger is the first non-founder employee, which the founding cohort creates. |
| G-42 | After-the-fact time entry meets W-2 recordkeeping | After-the-fact time entry becomes an employer recordkeeping question at the first non-exempt employee. E1 names payroll live, and WK-SOP-017 is the wage-compliance half. |
| G-48 | Hired and non-owned auto liability — from manifest finding to documented fact | Hired and non-owned auto liability, with `travel` and `mileage` shipped as capture categories. Same broker call as G-07 and before the first household signature. |
| G-53 | The reveal audit records the attempt, never the outcome: a failed reveal is indistinguishable from a successful one | The reveal audit records the ATTEMPT and never the outcome, so a failed reveal and a successful one are indistinguishable in the trail counsel's packet calls load-bearing. Needs one founder decision first: the outcome vocabulary, minimum delivered versus not. |
| G-110 | A row cites a document that has never been written | WK-TRN-009 has never been written. Ruled 5 September as a COO writing task on the 25 September agenda rather than a document to chase; Q-16 waits on it. |
| G-130 | CLOSED, 5 September 2026: WK-SEC-001's scope described a system this codebase is not, and the self-audit paid for itself before the audit ran | WK-SEC-001 v1.1 exists on the repository mirror and the controlled copy is still v1.0. No assessor is engaged against v1.0, so the founder-side transfer gates the security test. |
| G-131 | REPORTED, 5 September 2026: the scenario bank's category source has never been written, and "the evaluation form" names two different instruments | WK-TRN-007 absent, and with G-110 and G-108 it is a PATTERN: the certification program's sources are largely unwritten and live in the COO's practice. Writing them is the founding-cohort critical path. |

## defer (44)

| Entry | Title | One line |
|---|---|---|
| G-04 | Crypto-shred is reversible inside the PITR window | Crypto-shred is reversible inside the PITR window. Addressed in doctrine by the G-128 ruling (state the retention floor to members, name the window); what remains is one figure from the Neon plan, held as `BACKUP_RETENTION_WINDOW = null`. |
| G-11 | ADR-001's paper-parallel discipline has no runbook and no log | The runbook exists (the entry's own correction). The sliver is real: no named owner and no home for the friction log. |
| G-12 | The pilot has no exit criteria | The E-gates now supply the milestone half the entry asked for. What paper retirement itself requires is still unwritten, which is the part that has not been superseded. |
| G-16 | The parallel-pilot exit test has no volume guard | The exit test has no volume guard, so zero defects across four visits is indistinguishable from zero defects across a real sample. Trigger: whenever the parallel phase actually runs. |
| G-20 | The weekly drift check may be aspirational, and the friction log has no home | The weekly drift check may be aspirational and the friction log has no home. Reads with G-11. |
| G-21 | The quarterly lender reconciliation has no owner and leaves no evidence | The quarterly lender reconciliation has no owner and leaves no evidence. Trigger: the first lender submission. |
| G-23 | The smoke checklist stops being safe to run once demo data is archived | The smoke checklist stops being safe once demo data is archived, because the incident register has no delete path by design. Trigger: go-live archiving. |
| G-24 | Exit-test criteria 1 and 3 pull against each other | Exit criteria 1 and 3 pull against each other. Same trigger as G-16. |
| G-25 | The exit-test numbers are a structural gate, not a tuning knob | The exit-test numbers are a structural gate rather than a tuning knob: they require roughly three concurrent households before paper can retire. |
| G-27 | The weekly drift dump is a new plaintext artifact with no retention rule | The weekly drift dump writes a plaintext household export to a laptop with no retention rule. Trigger: the first weekly drift run. |
| G-31 | Page truncation is silent at every layer | A function killed at its time ceiling renders a partial page with no error anywhere. `maxDuration` was raised; detection was not built. |
| G-32 | The corporate drill-in is ~9 sequential DB round-trips, uncached | The drill-in is about nine sequential round trips. Fine at this scale, and the trigger is a double-digit fleet. |
| G-34 | One reveal wrote no audit row, unexplained (2026-07-26) | One reveal wrote no audit row, unexplained, never recurred, no logs running at the time. Stays open as a known anomaly against a load-bearing trail; a recurrence WITH logs is an immediate investigation. |
| G-36 | `sslmode=require` weakens in pg v9 | `sslmode=require` weakens to skip certificate verification under libpq semantics. Trigger: any pg major bump, and the fix is a one-line connection-string change in three places. |
| G-37 | Stale server-action IDs fail with no feedback at all | A stale server-action id dies before application code runs, so no guard can speak. Reads with G-67, whose decisive evidence is still owed. |
| G-43 | Membership price duplicated across systems | Membership price is duplicated between `membership_event` and QuickBooks with nothing reconciling them. The ADR-004 seam, appearing where it always would. |
| G-44 | Unbounded spend after the Upstash upgrade | No spend cap or alert on Upstash after the pay-as-you-go upgrade. A five-minute dashboard chore. |
| G-45 | Intake-hours capture is in no runbook | Intake hours are capturable exactly once per household during a chaotic first week, and no runbook requires it. Trigger: the first onboarding, which makes this cheap now and impossible later. |
| G-46 | Mileage substantiation fields — awaiting founder field list | Mileage substantiation needs purpose and destination, and the field list is the founder's. Carries an erasure interaction. |
| G-47 | Tier gating exists as data, not as behavior | Tier gating is data with no behaviour. Trigger, unchanged: the first household on a non-Concierge tier, which the launch checklist's item 7 is currently considering. |
| G-56 | The Member Circle register does not exist anywhere in the schema | The Member Circle register does not exist. Not E1, and it is a hard gate on WK-SVC-007 and the lead pipeline: no record about a person who is not a client ships before REQ-077. |
| G-57 | The temporal layer (83 fields) is unbuilt; the horizon channel has no substrate to run on | The 83-field temporal layer is unbuilt and the horizon channel has no substrate. Phase 2 schema work, waiting on Phase 1 custody. |
| G-58 | Suppression is more built than a first read suggests; one state is genuinely missing and the six are not one pipeline | One suppression state is genuinely missing and the six are not one pipeline. |
| G-66 | Role assignments made before 25 August carry no audit history at all, and the backfill is refused on purpose | Role assignments before 25 August carry no audit history. The backfill is REFUSED by decision rather than pending, because it would have to invent an actor and a reason; the fleet-wide count is founder-side. |
| G-67 | Two corporate server actions reported success and wrote nothing, in the same session, on the same page | Two corporate actions reported success and wrote nothing, never reproduced, and the instrument is now calibrated: no POST row means client-side, a non-303 means the server. Reads with G-37. |
| G-70 | Nothing in the sign-in flow says which address it is signing you in as | The sign-in flow half-fixed: `/verify-request` names the address. The email recipient line and the autofill trade are founder copy calls. |
| G-74 | A register entry is evidence a control was built, never evidence it is still in place | A register entry is evidence a control was BUILT, never that it is still in place. Its remedy is periodic re-verification against primary sources, and this triage is the first such pass. |
| G-79 | The endpoint that answers "is this branch protected" depends on how it was protected, and each one alone can answer wrongly in both directions | Neither GitHub endpoint alone answers whether a branch is protected. Standing check discipline rather than a defect; it re-earns its keep at the org transfer. |
| G-81 | A suppressed client email is visible only in a log nobody reads | A suppressed client email is visible in a log nobody reads. The board's exception queue is the surface, and it has never fired. |
| G-85 | Migration 0058 shipped ten columns with no producer, and every guard around them is correct and inert | Migration 0058's ten columns still have no producer, and the capture surface that would write them is out of launch scope by 24.2. The doctrine it produced is in CLAUDE.md; the columns stay inert. |
| G-86 | The smoke checklist manufactures its own duplicate prompts, because the dedup key includes the change instant | The smoke checklist manufactures its own duplicate prompts, because the dedup key includes the change instant. |
| G-88 | A permission enforced one layer below the surface the person is standing on produces a symptom that points at the wrong subsystem | A permission enforced one layer below the surface produces a symptom pointing at the wrong subsystem. `/visit` gates on role and the sink gates on the second factor. |
| G-90 | A guard that fails for reasons unrelated to what it guards is allowlisted into silence by re-running, with no allowlist involved | A guard that times out is allowlisted into silence by re-running, with no allowlist involved. The copy census is the instance. |
| G-94 | Overdue-ness comes only from prompt age, never from occurrence age | Overdue-ness comes only from prompt age, never occurrence age. A property recorded so the opposite assumption does not survive by never being contradicted. |
| G-99 | The NO-CONSENT branch is now unexercised everywhere, by choice | The NO-CONSENT branch is unexercised everywhere, by choice. A deliberate trade whose cost is real. |
| G-100 | A marker whose value is its scarcity, destroyed by locally correct additions | A marker whose value is its scarcity was destroyed by locally correct additions. Nothing was wrong at the row level, which is why nothing at the row level could catch it. |
| G-105 | The Phase 2 covenant acceptance criterion is a defect in the directive, not in the build | The Phase 2 covenant acceptance criterion is a defect in the adopted directive. The exact one-line edit is prepared, so it belongs on the 25 September two-key agenda rather than in a queue. |
| G-107 | The correction for G-106 repeated G-106, one day later, inside the entry recording it | The named fix is not built: a guard asserting `LIBRARY_INDEX.md` names every file in `docs/library/`, computed with a count floor. |
| G-108 | An acceptance criterion that names a review which does not exist under that name | An acceptance criterion names a QA five-dimension review that does not exist under that name. Library-side, and part of the G-131 pattern. |
| G-117 | The drain's rows_waiting_after_run metric, and what it does not prove | The drain metric proves PROGRESS, never CORRECTNESS, which is written into its own not-covered note. |
| G-118 | Auto-opening the next scheduled household: deferred by the ruling | Auto-opening the next scheduled household, deferred by ruling for ninety days of route data from 2 September 2026. |
| G-121 | OPEN, 4 September 2026: the Four-Stage spec names five movements and specifies a four-value tag, two paragraphs apart | The Four-Stage spec names five movements and specifies a four-value tag. Logged for the Q-18 reconciliation by instruction, not reconciled in code. |
| G-122 | OPEN, 4 September 2026: Q-8b cited REQ-017, which is a different deliverable, and REQ-017's two PDFs are undelivered and unqueued | REQ-017's two PDFs are undelivered AND unqueued, which is the risk the entry was filed early to prevent. |
| G-128 | REPORTED, 5 September 2026: erasure is complete logically and the bytes stay on disk until the relation is rewritten | Erasure is complete logically and the bytes stay until the relation is rewritten. Ruled: no VACUUM FULL, the word unrecoverable retired, the retention floor stated to members. One founder figure outstanding. |

## stale (70)

| Entry | Title | One line |
|---|---|---|
| G-03 | Erasure destroys the evidence for the records it preserves | Closed: the tool honours retention holds by default and refuses while an incident is open, both flags landing in the final audit entry. |
| G-05 | Floor bypass is the one safety assertion with no live probe | Closed with evidence: `floor-bypass.spec.ts` exercises the real scheduler path on every CI run. |
| G-06 | Post-deploy verification predates migrations 0014 to 0016 | Superseded: every standing check has since run against a live build, and the 25 August sitting is the frozen record. |
| G-14 | The Apple review account conflicts with staff clause 3 | Closed: the Apple review-account conflict was resolved with a scoped review account. |
| G-15 | The extended smoke checklist verifies rev 4 and not rev 5 | Closed: both halves fixed, and check 13 now splits into the refusal and the plan. |
| G-17 | Key custody gates nothing | Closed: the refusal guardrail is in ADR-005 and LAUNCH 1.1 was demoted with the cross-reference. The document's own status is G-26. |
| G-18 | G-02 is filed under counsel and is mostly not counsel's | Moot: a filing question about where G-02 sat. G-02 carries the substance and is marked above. |
| G-28 | The brief demotes two items that LAUNCH and the checklist depend on | Superseded: the rev 6 brief's bucketing no longer governs. |
| G-29 | Approval actions fail silently | Closed: `refuse()` plus the refusal-visibility guard, and G-68 did the same work in the success direction. |
| G-30 | A dropped Resend send returns the success page | Closed: the send path is now observable end to end through `mail_outcome` and the Resend webhook (Q-1). |
| G-33 | A page refresh appears to write an s3_corporate_view audit row | Closed: the phantom reveal row did not reproduce and the render path was settled. |
| G-35 | The dormant second Vercel project | Answered and closed: the stray project held nothing and the founder deleted it. The incident opened against it was withdrawn and kept as a record of a false premise. |
| G-38 | The trailing-30-day time & costs card renders empty against present data | Closed: the empty card was a query-parameter defect, since fixed. |
| G-39 | Uncontrolled selects retain stale choices across action re-renders | Closed: uncontrolled selects were the cause and the fixture caught it. |
| G-40 | Erasure drift over the capture tables — FIXED this commit | Closed: erasure extended over the capture tables, and `erasure-coverage.test.ts` now computes the census. |
| G-49 | Object observation series and horizon inputs gate first-household intake | Built: `object_observation` carries the series (0029) and 0058 added the install-date columns. The remaining half is the temporal layer, live as G-57. |
| G-50 | No single identity can see both ends of a field-and-client feature | Settled by the AJ ruling, option 2: corporate_admin was admitted to the four field surfaces and the one-role index stands. |
| G-51 | Resolution paths are time-gated and cannot be tested the same day | Closed by AI: every open deferral resolves whenever it is open, and overdue only sorts and tags. |
| G-52 | The visit close reported success for a visit that was never delivered, and the command was lost client-side | Settled: the command was lost client-side and AK closed the window with put-new-then-delete-old. |
| G-54 | A KEK rotation locks out every enrolled staff user, backup codes included, because the TOTP decrypt throws before the fallback is reached | Fixed in `totp.ts`: an unopenable secret is treated as unsatisfiable so the backup-code fallback stays reachable, proven by the boot-time KEK validation the same week. The operational rule travels with it: clear enrolled TOTP rows before rotating, or accept a lockout. |
| G-55 | Twenty-five refusal paths land on a page that renders nothing, so a declined action is indistinguishable from a completed one | Closed: the eleventh guard proves every refusal target renders its banner. |
| G-59 | Two live audit-write sites store an email address and a person's name directly, not an id pointing at one | Closed: ADR-006 subject tokens at all three write sites. |
| G-60 | Direction 4's live-data read: no drift found, but the event log can't be trusted as pricing history, and two schema gaps confirmed empirically | Informational: a live-data read that found no drift and confirmed two schema gaps now tracked elsewhere. |
| G-61 | Date-only facts stored as timestamps render one day early: the consent date on screen is not the date the client signed | Closed and verified in production against a stored midnight value, which is the only reading that proves it. |
| G-62 | Three new data categories merged without the same-PR legal updates the merge-gate rule requires; caught and corrected one day later | Corrected the same day, and `legal-census.test.ts` now computes the detection the rule used to hold in memory. |
| G-63 | deploy.sh --preflight runs the production migration: a dry-run-shaped flag performs the batch's least reversible step | Fixed: `--preflight` is structurally read-only, and it earned its accepting proof on a real two-migration gap. |
| G-64 | The HG provisioning script wrote a real tenant and a staff assignment with no audit history behind them | Fixed: `db:hg` requires `--by`, gates on a corporate admin, and backfills missing history marked recordedLate. |
| G-65 | /visit pins the founder to whichever field-role household sorts first, and her sitting capture proved it live (+1 addendum) | Closed: `/visit` demands an explicit selection whenever a HOM holds more than one field assignment. The auto-open question is G-118. |
| G-68 | Half the action layer changed stored state and said nothing, so a working click and a dead click looked identical | Fixed: every action confirms, and `success-visibility.test.ts` computes both halves of its input. |
| G-69 | The revocation audit row could not say whose role ended | Fixed: the subject is read before the delete and mirrored into the audit detail as a token. |
| G-71 | The Smoke Test Fixture is identified by a predicate the schema does not make unique | Fixed: the fixture is resolved by the tool's own predicate rather than by two people writing the same string. |
| G-72 | A mutation that never lands and a test that cannot fail look identical | Doctrine: confirm a deliberate break landed before reading the result. In CLAUDE.md's verification section. |
| G-73 | `main` has no branch protection, so CI green has never been a platform gate; a standing document says it is | Closed: protection landed 27 August as a ruleset, read from both endpoints. The reading discipline it left behind is G-79. |
| G-75 | The absent control was cited as the reason to skip the check that would have found it absent | Doctrine: the absent control was cited as the reason to skip the check that would have found it absent. |
| G-76 | The copy census walked a directory a test writes into, and vitest runs files in parallel | Fixed: the census no longer descends into `.next` or `.turbo`, and deliberately does not swallow the read error. |
| G-77 | The completeness survey counted renders and the thing at risk was columns, so its number was wrong in the reassuring direction | Doctrine, and now the first family member of G-129: state the unit, and check that the unit counted is the unit at risk. |
| G-78 | The client projection is default-open at the column level: every new column reaches the member unless someone remembers to filter it | Corrected the same day it was filed, and `client-payload-shape.test.ts` shipped. Its residual, what a permitted key CONTAINS, is written in CLAUDE.md's guard table. |
| G-80 | Protection earned a real red on its first pull request, on a change reported green | Informational: protection refused a change reported green, on its first pull request. |
| G-82 | A check that a value is LEGITIMATE is not a check that it is CURRENT, and the two feel identical when both pass | Doctrine plus a built gate: legitimacy is not currency, and the deploy checks both. |
| G-83 | A guard can pass for reasons unrelated to the question it appears to answer, and no mutation could have turned it red | Doctrine: a guard can pass for reasons unrelated to the question it appears to answer. |
| G-84 | A difference between two pointers is not a claim about the thing they point at, and this is the third surface today | Doctrine: a difference between two pointers is not a claim about the thing they point at. |
| G-87 | The inverse of G-84: resetting a pointer discarded the only local copy, and it survived only because it had been pushed | Doctrine, the inverse of G-84. Nothing was lost. |
| G-89 | "Delivery hours record themselves" describes bookkeeping, and is read as measurement | Fixed: the copy no longer says hours record themselves, on both surfaces, and the native chip that fabricated a window is gone. |
| G-91 | A wait loop matched the states it expected and read an unexpected state as done | Throwaway code, real mechanism, recorded as doctrine. |
| G-92 | A deliverable referenced by bare filename in a committed document, while existing only outside the repository | Doctrine: a bare filename in a committed document reads as a repository path. |
| G-93 | A citation that does not survive being followed costs more than a missing one | Doctrine: a citation that does not survive being followed costs more than a missing one. Sharpened 5 September by the read-the-citation rule. |
| G-95 | A demo seed resolved its target with an unordered LIMIT 1, and would have written Fernbrook's content onto another household | Fixed, and the doctrine is the entry: writing a hazard down felt like handling it. |
| G-96 | A query made cleaner, and thereby made blind, by the same edit | Doctrine: a query made cleaner and thereby made blind. |
| G-97 | A type that stays satisfied while the meaning underneath it inverts | Fixed: the fallback returns `hh: null` rather than an arbitrary household row. |
| G-98 | The G-61 date bug reappeared in the tool built to verify the system | Fixed and proven zone-independent in both directions, in the tool built to verify the system. |
| G-101 | A rename of an idempotency key inserts instead of renaming, and "idempotent" is what makes it silent | Fixed: the idempotency-key rename inserted rather than renaming, and idempotent is what made it silent. |
| G-102 | Three rulings withdrawn against adopted decisions, kept visible rather than deleted | A record of three rulings withdrawn against adopted decisions, kept visible rather than deleted. |
| G-103 | Three requirements describe one mechanism at two priorities, and none matches the build | Closed: REQ-031 amended in place, REQ-036 annotated as deliberately unchanged, the version line moved. The covenant half is G-105. |
| G-104 | A live staff surface tells the HOM a geofence suggested a value she typed (+1 addendum) | Fixed on both surfaces, and the addendum's real finding (a fabricated three-hour window) was fixed rather than relabelled. |
| G-106 | An absence reported from a search that could not have found it | Doctrine: an absence reported from a search that could not have found it. |
| G-109 | Two different measurements are both called the hiring trigger, and one is live | Closed by R26: the board says what it measures, in units, with the hiring trigger disclaimed in both knob states. Computing WK-SOP-014's own rule needs a denominator the system does not hold, which is recorded rather than invented. |
| G-111 | Three staff-facing obligations have met the same NOT NULL column, and the fourth should not be an accident (+2 addendums) | Fully closed: the schema (0059), the person-scoped producer, and the WK-SOP-017 self-access view are all built. |
| G-112 | A guard written but not run, on the claim that it could not be run here | Fixed within the hour by CI, and the useful part is the sentence beside it. |
| G-113 | Three defects on the fifteenth-run build, and two flakes underneath them (+1 addendum) | Closed: three display defects and two seed defects fixed and verified in production, seed re-runs included. |
| G-114 | The outbox drain's batch window can be permanently occupied by kinds nothing consumes (+1 addendum) | Closed by the A2 ruling: the drain selects registered kinds only, with the waiting-rows metric on the board. |
| G-115 | The production outbox has no live consumer, and the evidence points at a stale or dead Railway worker (+2 addendums) | Answered and closed: scenario 2, the worker redeployed, and `repeat:drain-outbox` is completing in production. |
| G-116 | Typed times are interpreted in the SERVER'S timezone, so every hand-entered interval is shifted by the operator's offset (+1 addendum) | Closed: `time_entry.tz` (0060), zone-less writes refused, per-row zone display. |
| G-119 | The typed-time backfill: manual rows only, its own migration and session (+3 addendums) | Closed and verified row by row against the founder's own pre-migration snapshot. The one remainder is queue row Q-11w, deferred with a trigger. |
| G-120 | OPEN, 4 September 2026: the migrations-first invariant was never enforced, only accidentally true (+5 addendums) | Settled across four addendums: both doors shut by mechanism, proven by a controlled pair. Its lesson, that a document quoting a moving register is a snapshot, is in CLAUDE.md. |
| G-123 | OPEN and minor, 5 September 2026: a frozen ruling's own date precedes the report it answers | Minor and recorded: a frozen ruling's own date precedes the report it answers. |
| G-124 | CLOSED on arrival, 5 September 2026: the security audit's own first finding was the shape of its query | Closed on arrival: the audit's lead finding was the shape of its own query. First instance of G-129. |
| G-125 | CLOSED, 5 September 2026: the erasure tool's first real run failed on a column it had never written to | Closed: the erasure tool's first real run failed on a column it had never written to, past what a dry run prints. |
| G-126 | CLOSED, 5 September 2026: the household archive could not restore a jsonb ARRAY, and the portability proof had passed without noticing | Closed: the archive could not restore a jsonb array, and the published portability proof was narrowed in place. |
| G-127 | CLOSED, 5 September 2026: playbook section 1 was named in the company's triage vocabulary and rendered on the member's own page | Closed: section 1 renamed to Household summary, and the member's page no longer carries the company's triage vocabulary. |
| G-129 | CLASS NAMED, 5 September 2026: a check that counts, matches or searches the wrong unit | The class itself, named by ruling and written into CLAUDE.md. Nothing to act on beyond applying it, which this sheet does. |
