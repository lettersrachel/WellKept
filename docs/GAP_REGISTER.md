---
status: living
---
# Gap register (rev 5 input)

Prepared 25 July 2026, against main commit 04b6e23 and the rev 4 handoff
package. Companion to SPEC_AUDIT's "Functional gaps outside the requirement
table," which this register extends.

**Owners:** 🧑 Rachel · 🤖 code or infra · ⚖️ a decision to make
**Status:** ⬜ not started · ⏳ in progress · ✅ done

## Why this register exists

Rev 4 closed seven business functions that appeared in no governing doc at
all. That review looked for functions the requirement table never asked for.
This pass looks somewhere else: at what the rev 4 documents themselves leave
unowned, at obligations one document imposes that another never implements,
and at two places where shipped mechanisms work against each other.

Nothing here is a code defect. Fourteen items, four severities. Two of them
should be resolved in the same session as the pending deploy.

---

## Severity 1. Single points of unrecoverable failure

| ID | Gap | Owner | Status |
|---|---|---|---|
| G-01 | Master key has one custodian and no recovery path | 🧑⚖️ | ⬜ |
| G-02 | No backup of production data outside Neon | 🧑⚖️🤖 | ⬜ |

### G-01. Master key has one custodian and no recovery path

LAUNCH §1.1 is marked done: `WK_KMS_KEY` and `AUTH_SECRET` live in Vercel and
in Rachel's password manager, and the local plaintext files were shredded.
That is complete protection against a lost laptop, which is the threat §1.1
set out to close. It is no protection against the two threats it does not
name: Rachel being unavailable, and the password manager itself being lost.
If both copies of the KEK go, every vault row in the business is ciphertext
that nobody can read, permanently, with no degraded mode and no restore that
helps.

ADR-003 already worked this problem for authentication. It identified the
sole-corporate_admin lockout, and answered it with backup codes plus admin
reset. The same reasoning was never applied one layer down to the key that
protects the vault.

**Disposition.** Decide a second custodian and write it down. Kelly is the
obvious candidate as co-founder and CFO, and holds no key material today.
The mechanism can be as plain as a sealed copy in a second password manager
with a documented retrieval condition. Record the decision the way ADR-004
recorded the boundary decisions, so custody is a written arrangement rather
than an assumption. This is the most serious item in the register and it
costs an afternoon.

### G-02. No backup of production data outside Neon

Photos are stored inside Postgres (legal/README, "visit records"), so Neon
point-in-time recovery is the only copy of every playbook, vault row, audit
event, incident, and photo in the business. LAUNCH §2.2 asks for confirmed
billing on Neon, which addresses a paused free tier, not account loss, a
billing lapse, or an operator error inside the retention window.

The complication is worth deciding on purpose rather than discovering later:
a logical dump held anywhere outside Neon also creates a copy of the vault
ciphertext and a copy of every photo, and the daily purge job cannot reach
either. An unmanaged backup silently defeats the photo retention policy
counsel is about to bless.

**Disposition.** Two decisions, not one. First, whether a periodic dump you
control is worth the exposure at pilot scale, where a proven Neon restore
drill (§1.2) may be sufficient. Second, if yes, the backup's own retention
rule and where it lives, written into the same privacy notice section as
`photo_retention`. Either answer is defensible. Silence is not.

---

## Severity 2. Contradictions in shipped mechanisms

| ID | Gap | Owner | Status |
|---|---|---|---|
| G-03 | Erasure destroys the evidence for the records it preserves | 🤖⚖️ | ⬜ |
| G-04 | Crypto-shred is reversible inside the PITR window | ⚖️ | ⬜ |
| G-05 | Floor bypass is the one safety assertion with no live probe | 🤖 | ⬜ |
| G-06 | Post-deploy verification predates migrations 0014 to 0016 | 🤖 | ⬜ |

### G-03. Erasure destroys the evidence for the records it preserves

`erase-household.mjs` keeps audit events and incident reports by default, on
the correct reasoning that they are business records and the most important
thing you own in a dispute. In the same transaction it purges photo bytes
while overriding corporate retention holds. Those holds exist for exactly one
reason: the photo is tied to an open incident or dispute. So the default
behaviour preserves the incident row and destroys what substantiates it.

**Disposition.** The tool should refuse to run while an open incident exists
on the household, and require an explicit flag to proceed. Holds should be
honoured by default and overridden by argument, which is the inverse of
today. Counsel then owns the harder question of what happens when a household
with an open dispute exercises a deletion right, but the code should not make
that choice silently at 2am.

### G-04. Crypto-shred is reversible inside the PITR window

The vault hard-delete is justified because tombstoned ciphertext would still
be the secret. That holds for the live database. It does not hold for the
seven or more days of Neon history retention that §1.2 asks you to enable,
because a restore branch reconstitutes the deleted rows and the KEK is still
live in Vercel. For that window, erasure is a strong revocation of access,
not a destruction of data.

**Disposition.** No code change is obviously right; the retention window is
there for good reasons. What matters is that counsel writes the notice's
deletion section knowing this, and that the number chosen for history
retention is understood as the true floor on erasure latency. Add it as a
fourth attachment to the counsel conversation alongside the erasure
semantics, the 90-day photo window, and the consent doc.

### G-05. Floor bypass is the one safety assertion with no live probe

SPEC_AUDIT and Addendum A2 both record it: safety floors bypass exclusions
entirely, asserted in trigger-engine unit tests, live-probe assertion still
open. A2 finding 7 states the failure mode in plain terms, that someone will
eventually exclude their way into a hazard, and A2's own instruction was that
this needs an assertion in the security probe rather than a comment in the
code.

Every other claim in the audit marked built and verified was exercised
against live infrastructure. This one, which is the only assertion in the
system whose failure mode is physical harm in a client's home, is the
exception. It is blocked only on a running stack, which the pending deploy
provides.

**Disposition.** Add it to the security probe in the same session as the
deploy, before the first real household is onboarded. It joins the existing
probe checks and then runs forever in CI.

### G-06. Post-deploy verification predates migrations 0014 to 0016

DEPLOY §4's smoke checklist covers health, magic link, a field-change job, the
dev page gate, and an audited reveal. It says nothing about the consent card
and its no-consent banner, the incident register and the red flag on the fleet
board, the CEO previews and their live payload guards, exclusion enforcement,
recall rendering on both briefing surfaces, media-reuse flags, or a dry-run of
the erasure tool. It also does not check that the two new `app_setting` rows,
`photo_retention` and `rule_health`, exist in production with the intended
values, which is the difference between a configurable knob and a missing key.

**Disposition.** Extend the smoke checklist to cover everything shipped in the
four rev 4 PRs, and run it against production immediately after the deploy,
before demo data is archived.

---

## Severity 3. Business and legal gates outside the repo

| ID | Gap | Owner | Status |
|---|---|---|---|
| G-07 | Insurance is not addressed anywhere in the package | 🧑 | ⬜ |
| G-08 | No breach response procedure and no named owner | 🧑⚖️ | ⬜ |
| G-09 | Subprocessor agreements not executed | 🧑 | ⬜ |
| G-10 | No first House Manager and no first household | 🧑 | ⬜ |

### G-07. Insurance is not addressed anywhere in the package

W-2 House Managers enter homes, hold alarm codes and access instructions, and
the business now runs an incident register whose stated purpose is disputes
over complaints, breakage, and injury. General liability, a bond, workers'
compensation, and cyber or breach coverage appear in none of the eighteen
files. The privacy notice's ⟨add your breach-notification commitment⟩ blank is
the same gap seen from the legal side, since that commitment is usually
written against a policy.

**Disposition.** Yours, outside the repo, and it belongs on the same list as
QuickBooks configuration: a gate on the first paying household rather than on
the deploy. Worth pairing with the W-2 employment paperwork the first hire
requires anyway.

### G-08. No breach response procedure and no named owner

LAUNCH §3 asks you to name a data-recovery and incident owner and is marked
not started. That item also dropped out of the rev 4 brief's remaining-work
list, which is how an open item quietly becomes a closed one.

Beyond the owner, there is no written sequence for a data incident: who
detects it, who decides it is reportable, who tells the household, and inside
what window Virginia requires. The incident register's five kinds are
complaint, breakage, injury, near-miss, and other, so a security incident
lands in "other" with no distinct handling. Sentry is live and verified, but
no alert destination or on-call arrangement is named, so detection currently
depends on someone opening a dashboard.

**Disposition.** Name the owner, add a security or data kind to the incident
register if the distinction is worth having, and write one page: detect,
assess, notify, record. Route Sentry alerts somewhere a person sees them.

### G-09. Subprocessor agreements not executed

The privacy notice lists Vercel, Neon, Upstash, Railway, and Resend, with the
note that a data processing agreement with each is typically required. Five
standard agreements, no cost, and they are not on any list in the package.

**Disposition.** Collect them alongside the counsel conversation so the
notice's subprocessor section can be completed rather than left in brackets.

### G-10. No first House Manager and no first household

The TestFlight plan names internal testers as Rachel plus the pilot HM. No
House Manager is hired and no household is recruited or consented. Everything
downstream depends on both: the consent card stays red, the paper-parallel
protocol has nobody running it, repeat-season memory has no history to
accumulate, and the app has no real data to be ready for.

**Disposition.** This is the actual critical path to the pilot and the app
being finished does not move it. Worth stating plainly in the next revision of
LAUNCH so it stops reading as though software is the constraint.

---

## Severity 4. Governance obligations not implemented

| ID | Gap | Owner | Status |
|---|---|---|---|
| G-11 | ADR-001's paper-parallel discipline has no runbook and no log | 🧑🤖 | ⬜ |
| G-12 | The pilot has no exit criteria | 🧑⚖️ | ⬜ |
| G-13 | Nothing discloses to staff what the system holds about them | 🧑⚖️ | ⬜ |
| G-14 | The Apple review account conflicts with staff clause 3 | 🧑 | ⬜ |

### G-11. ADR-001's paper-parallel discipline has no runbook and no log

ADR-001 is accepted and binding: the paper workbook plus the Jobber stack is
the system of record for the entire pilot, every pilot visit is mirrored into
the app after the fact, and divergence between the two is logged as either an
app defect or a spec-revision candidate. Guardrail 1 is that paper wins every
conflict.

None of that exists operationally. There is no divergence log, no mirroring
procedure, and no owner. LAUNCH §4's onboarding runbook covers adding people
to the app and says nothing about running two systems in parallel. An ADR that
imposes an obligation no operational document implements is the kind of thing
that reads as governance and functions as decoration.

**Disposition.** A one-page mirroring procedure and a divergence log, which
can be a spreadsheet. The friction log ADR-001 mentions was supposed to serve
both outputs, so this may be an extension of it rather than a new artifact.

### G-12. The pilot has no exit criteria

ADR-001 says its guardrails hold until a written ADR supersedes it, and that
the pilot produces validated service doctrine and a field-tested application.
Nothing states what the pilot has to demonstrate for paper to be retired, or
who decides. Without that, the parallel period has no defined end and the
default outcome is that it runs until it is abandoned rather than concluded.

**Disposition.** Write the conditions now, while they are a design choice
rather than a judgment call under pressure. They become the trigger for
ADR-005.

### G-13. Nothing discloses to staff what the system holds about them

The staff confidentiality draft covers what a House Manager owes the business.
Nothing covers the other direction. The system holds an append-only record of
every action a staff member takes, every secured reveal logged to their name,
their hours, their TOTP enrollment, and eventually location if the geofence
stops being stubbed text. That is a personnel record, and if it ever informs a
conversation about performance it should not be the first time the person
learns it exists.

**Disposition.** A short staff-facing paragraph, either inside the
confidentiality acknowledgment or beside it. Cheap now, awkward later.

### G-14. The Apple review account conflicts with staff clause 3

The listing kit's review notes plan to hand a reviewer a working staff account
plus its TOTP secret. Staff confidentiality clause 3 says credentials and
authenticators are never shared. The reviewer needs access, so the answer is
probably a scoped review account that is not a staff member and holds no real
household, which is close to what "Fernbrook Demo" already provides.

**Disposition.** Note the carve-out in the review notes at submission so the
two documents do not contradict each other on paper.

---

## Suggested order

1. **With the deploy, same session:** G-05 (floor probe) and G-06 (extended
   smoke checklist). Both need the running stack the deploy provides, and
   both are cheaper before real data than after.
2. **This week:** G-01 (key custody) and G-03 (erasure guard). One is a
   decision and a sealed envelope; the other is a small change to a script
   nobody has run in anger yet.
3. **Into the counsel conversation:** G-04 as a fourth attachment, plus G-09
   and the G-02 retention question, so one engagement closes all of them.
4. **Gates on the first paying household, not on the deploy:** G-07, G-08,
   G-10, alongside QuickBooks configuration.
5. **Before the pilot starts running visits:** G-11 and G-12, because both
   describe how the pilot is supposed to work and are worthless written
   halfway through it.
6. **When convenient:** G-13, G-14.

## What this register does not cover

Everything SPEC_AUDIT already records as an honest delta stays there and is
not duplicated here: photoRefs unused, REQ-035 awaiting product definition,
REQ-036 needing the native build, managed KMS and pen review as founder
gates, REQ-075 as the 2027 to 2028 build, and the formal accessibility audit
recommended before scale. The rev 4 brief's own remaining-work list also
stands as written, with the single exception noted in G-08.

---

## Repo addendum (2026-07-25, same day — verification + immediate actions)

The register above is preserved as reviewed. This addendum records what was
verified against the repo and what changed in the commit that added this file.

| ID | Verification / action |
|---|---|
| G-03 | **CONFIRMED and FIXED this commit.** The tool now honours retention holds by default (`--override-holds` to defeat them, counsel-directed only) and REFUSES to run — dry run included — while the household has an open incident (`--despite-open-incidents` to proceed). Both flags land in the final audit entry. |
| G-04 | **CONFIRMED.** Noted in the tool's own header and printed in its dry-run output ("unrecoverable*"); added as the fourth attachment to the counsel packet in LAUNCH §3. The history-retention number IS the erasure-latency floor. |
| G-05 | **CLOSED (2026-07-25, follow-up commit).** The assertion now runs against a live stack on EVERY CI run: `tooling/e2e/floor-bypass.spec.ts` exercises the real scheduler path (dev-gated `/api/dev/trigger-pass`, 404 in production) — floor prompt survives a scope=all exclusion, ordinary prompt is suppressed, and schedules again once the exclusion ends. The security probe carries the same section (visible SKIP when pointed at production). |
| G-06 | **FIXED this commit.** DEPLOY §4 extended from 5 to 14 checks covering every rev-4 surface, including the two `app_setting` rows existing in production with intended values, and a dry-run of the erasure tool. |
| G-11 | **PARTLY INCORRECT — the runbook exists.** `docs/PARALLEL_PILOT_PROTOCOL.md` (absent from the rev-4 zip, hence invisible to this review) defines the per-visit mirror procedure, the friction log with APP DEFECT / SPEC CANDIDATE verdicts, the weekly drift diff (importer `--against`), and quarterly reconciliation. The remaining sliver is real: no named owner, and no decision on where the friction log physically lives. Future handoff zips must include the protocol. |
| G-12 | **PARTLY COVERED.** The protocol defines the exit test for the paper-parallel phase: one full month of zero APP DEFECT entries + clean weekly diffs, then an ADR proposes promoting the app to system of record. What remains Rachel's: the broader pilot's success criteria (service doctrine validated by what evidence, decided by whom). |
| G-01 | **ADR-005 drafted this commit** (`docs/adr/005-key-custody.md`, Proposed) with the custodian and mechanism as ⟨brackets⟩ — the afternoon it costs is now filling in names. |
| G-08 | Partly a rev-4 brief omission: LAUNCH §3 never lost the name-an-owner item (the brief's remaining-work list did). The breach one-pager, a possible `security` incident kind, and Sentry alert routing remain open as written. |
| G-02, G-07, G-09, G-10, G-13, G-14 | Stand as written — all outside the repo. G-09 and G-02's retention question joined the counsel packet note in LAUNCH §3. |
# Gap register, addendum B (rev 6 input)

Prepared 25 July 2026, evening. Review of the rev 5 handoff package against
rev 4 and against the original register. Appends to GAP_REGISTER.md and its
same-day repo addendum; neither is restated here.

**Owners:** 🧑 Rachel · 🤖 code or infra · ⚖️ a decision to make
**Status:** ⬜ not started · ⏳ in progress · ✅ done

## Verification of rev 5's claims

Checked file by file against the rev 4 package. The brief's claim, that the
register's severity-1 and severity-2 items which were code's to fix are fixed,
holds as worded.

| ID | Rev 5 disposition | Verified |
|---|---|---|
| G-03 | Holds honoured by default, refusal over open incidents, both flags in the final audit entry | ✅ Closed, and inverted the right way round rather than patched |
| G-04 | Documented in the tool header and printed in dry-run output, added to the counsel packet | ✅ Closed. Printing it where the operator is standing is the right placement |
| G-05 | Live e2e assertion on every CI run via a dev-gated endpoint | ✅ Closed with evidence rather than a claim about evidence. See G-15 for the surface it introduced |
| G-06 | DEPLOY §4 extended from 5 checks to 14 | ✅ Closed for the rev-4 surfaces. See G-15 for what it does not cover |
| G-11 | Partly incorrect, the protocol existed and rev 4 omitted it | ✅ Correction accepted. The two remaining slivers are the right ones and are carried below as G-20 |
| G-12 | Partly covered by the protocol's exit test | ✅ Accepted, with the qualification in G-16 |
| G-01 | ADR-005 drafted, Proposed, brackets to fill | ⏳ Correct status. See G-17 and G-22 |

Everything else in the original register stands as written.

---

## New items

| ID | Item | Owner | When |
|---|---|---|---|
| G-15 | The extended smoke checklist verifies rev 4 and not rev 5 | 🤖 | With the deploy |
| G-16 | The parallel-pilot exit test has no volume guard | 🧑⚖️ | Before visits start |
| G-17 | Key custody gates nothing | ⚖️ | Before any real s3 value |
| G-18 | G-02 is filed under counsel and is mostly not counsel's | 🧑⚖️ | Filing correction |
| G-19 | The counsel packet is missing the breach-notification commitment | 🧑 | Before the engagement |
| G-20 | The weekly drift check may be aspirational, and the friction log has no home | 🧑🤖 | Before visits start |
| G-21 | The quarterly lender reconciliation has no owner and leaves no evidence | 🧑 | Before the first lender number |
| G-22 | The key re-wrap has never been drilled | 🤖 | With ADR-005 |

### G-15. The extended smoke checklist verifies rev 4 and not rev 5

DEPLOY §4 was extended in the same session that shipped two code fixes, and
covers neither of them. Two instances, same pattern.

**The erasure guard never fires.** Item 7 logs a test incident and resolves it.
Item 13 then dry-runs the erasure tool. By the time 13 runs there is no open
incident, so the refusal added for G-03 is never exercised, and the checklist
would pass identically against a build where that guard was reverted.

*Fix:* split item 13. Run the dry run once while the item-7 incident is still
open and confirm the tool refuses, then resolve the incident and run it again
to read the plan. Two lines, and it makes the guard a tested claim.

**The new dev endpoint is not gate-checked.** G-05 introduced
`/api/dev/trigger-pass`, which drives the real scheduler path and is dev-gated
to 404 in production. Item 4 checks that `/dev/last-email` returns 404. The new
endpoint, which is the more consequential of the two, has no equivalent check.

*Fix:* extend item 4 to cover both dev-gated routes, and treat "any new
dev-gated surface gets a 404 line in §4" as the standing rule, since this is
now the second one.

### G-16. The parallel-pilot exit test has no volume guard

The protocol promotes the app toward system of record after one full month with
zero APP DEFECT entries and clean weekly diffs. With one House Manager and one
household that is roughly four mirrored visits. Zero defects across four visits
is equally consistent with the app being sound and with nobody logging
anything, and the second reading is the one that costs you the pilot's whole
purpose.

Addendum A2 already solved this exact problem one layer down. The
retirement-candidate flag fires only when the act rate is below the floor AND
at least three households AND at least two users have contributed, on the
stated reasoning that a fleet rule must not be retired on the evidence of one
household or one House Manager having a bad month. As it stands the system
applies more rigour to retiring a trigger rule than to retiring the paper
system of record.

*Fix:* give the exit test the same shape. A minimum number of mirrored visits,
a minimum number of distinct visits logged by the House Manager, and an
explicit rule that a month producing no friction-log entries at all is
inconclusive rather than clean. The numbers are policy and yours to set; the
guard is the point.

### G-17. Key custody gates nothing

ADR-005 is correctly drafted and correctly Proposed. What it does not have is a
guardrail, so nothing prevents real s3 values entering the vault while the
second custody is still a bracket. Given the failure mode is permanent and
total loss of every vault row, custody deserves at least the treatment consent
already gets.

ADR-001 has the pattern: guardrail 2 held real s3 values out until the vault
sprint was complete, and guardrail 3 holds real household data out until that
household consents. Both are refusals, not reminders.

*Fix:* add to ADR-005 that no real s3 value enters the vault until the sealed
second copy exists and has been confirmed readable once, and cross-reference it
from LAUNCH §1.1. That turns the register's most serious item from a task on a
list into something the process will not run past.

### G-18. G-02 is filed under counsel and is mostly not counsel's

The off-Neon backup question is now attachment 6 in the LAUNCH §3 counsel
packet. Two problems. First, whether Neon point-in-time recovery alone is
adequate protection for the only copy of every playbook, vault row, audit
event, incident, and photo in the business is a continuity decision, and it is
yours; counsel owns only the retention rule for a backup that ends up existing.
Second, a severity-1 item now sits in the process-and-legal section, so it gets
read at the wrong time and behind five items that genuinely are legal.

*Fix:* move the decision to LAUNCH §2 alongside the paid-tier and restore-drill
items, and leave a pointer in the counsel packet for the retention rule
conditional on the answer.

### G-19. The counsel packet is missing the breach-notification commitment

The privacy notice still carries ⟨add your breach-notification commitment⟩, and
the packet's six attachments do not include it. It is the legal half of G-08,
and splitting it into a second engagement wastes the consolidation the packet
was built for.

*Fix:* seventh attachment, phrased as the commitment plus what Virginia
requires by way of timing and content.

### G-20. The weekly drift check may be aspirational, and the friction log has no home

Two remainders in the protocol, one of which the repo addendum already
acknowledged.

The weekly step says the importer's `--against` dry run mechanically diffs the
app's household record against the workbook. SPEC_AUDIT REQ-016 records a
workbook import with a dry run as built and verified, which is a different
operation from a record-level diff against an existing household. Confirm the
diff mode exists and produces a readable delta; if it does not, the weekly
check has no mechanism behind it and the protocol's "zero silent drift allowed"
is a sentence rather than a control.

The friction log has no named owner and no decided location. It is the artifact
the entire parallel phase produces, it carries the APP DEFECT and SPEC
CANDIDATE verdicts, and G-16 above makes its completeness load-bearing for the
exit decision.

*Fix:* verify the diff mode, then name where the log lives and who writes in it
before the first mirrored visit rather than after.

### G-21. The quarterly lender reconciliation has no owner and leaves no evidence

The protocol requires the app's exhibit tables to be reconciled against the
hand-built WK_SBA workbook before any number is shown to a lender. That is the
one step in the document with consequences outside the business, and it has no
owner, no procedure, and no record that it happened. Given the DSCR figures and
the Year 5 plan are load-bearing in the lender package, a reconciliation nobody
can prove took place is close to no reconciliation at all.

*Fix:* a dated sign-off line naming who reconciled, which workbook version, and
which exhibit period. One row per quarter is enough.

### G-22. The key re-wrap has never been drilled

ADR-005 requires rotation to update both custodies in one sitting and describes
the re-wrap as the documented managed-KMS migration in reverse. Documented is
not drilled. LAUNCH §1.2 already establishes the principle in this package that
a recovery path is theoretical until it has been exercised, which is why the
Neon restore gets a drill rather than a paragraph.

*Fix:* rehearse the re-wrap once against a throwaway branch, ideally in the
same sitting that creates the second custody, so the first execution is not
during a suspected key compromise.

---

## Suggested order

1. **With the deploy:** G-15, both halves. It is the difference between a
   checklist that tests the build and one that tests the previous build.
2. **With ADR-005, same afternoon:** G-17 and G-22, since both attach to work
   already scheduled.
3. **Before the first mirrored visit:** G-16 and G-20. Both describe how the
   pilot is supposed to prove things, and neither is worth writing halfway
   through it.
4. **Filing, five minutes:** G-18 and G-19.
5. **Before a number reaches a lender:** G-21.

---

## Repo addendum B (2026-07-25, same evening — verification + actions on addendum B)

| ID | Verification / action |
|---|---|
| G-15 | **FIXED this commit, both halves.** DEPLOY §4 item 7 now leaves its test incident open; item 13 splits into 13a (dry-run must REFUSE, exit 2, while the incident is open — a build without the G-03 guard fails here) and 13b (resolve, re-run, read the plan). Item 4 checks BOTH dev-gated routes (`/dev/last-email`, `/api/dev/trigger-pass`) with the standing rule written in. |
| G-16 | **Guard added this commit** to the protocol's exit test, numbers left as ⟨brackets⟩ (founder policy): minimum mirrored visits, minimum visits with any friction entry, and the explicit rule that an empty-log month is INCONCLUSIVE, not clean. |
| G-17 | **Guardrail added this commit** to ADR-005 — no real s3 value enters the vault until the sealed second copy exists and has been confirmed readable once — and LAUNCH 1.1 demoted from ✅ to ⏳ with the cross-reference (its "done" covered the lost-laptop half only). |
| G-18 | **Refiled this commit.** The backup decision is now LAUNCH §2.4 (continuity, yours), with only the conditional retention rule remaining in the counsel packet. |
| G-19 | **Added this commit** as counsel-packet attachment 6 (breach-notification commitment + Virginia timing/content). |
| G-20 | **Verified, and the missing halves built.** `wk_import.py --against` exists and diffs; `dump-seed.ts` existed but grabbed an arbitrary first household and had no script entry. Now: `db:dump` takes a household uuid, and the protocol spells the two-command weekly procedure. The friction log's home/owner stays a ⟨bracket⟩ for the founder — flagged in the protocol itself. |
| G-21 | **Sign-off table added this commit** to the protocol's quarterly step (quarter, who, workbook version, exhibit period, deltas, date). |
| G-22 | **CONFIRMED — worse than "not drilled": no re-wrap tool existed** (only prose pointing at the foundation repo). Built this commit: `db:rewrap-kek` — dry-run-default rotation that proves every stored key unwraps under OLD and round-trips under NEW before anything is written, then rotates vault + TOTP wraps in one transaction with an in-transaction decrypt check before COMMIT. The rotation round-trip is unit-tested in @wellkept/vault (rotated wraps open under the new KEK and are opaque to the old). The operational drill against a throwaway Neon branch remains scheduled with ADR-005's custody sitting. |
# Gap register, addendum C (rev 7 input)

Prepared 25 July 2026, night. Review of the rev 6 handoff package against
rev 5. Appends to GAP_REGISTER.md, its repo addendum, and addendum B with its
repo addendum. Nothing already closed is restated.

**Owners:** 🧑 Rachel · 🤖 code or infra · ⚖️ a decision to make
**Status:** ⬜ not started · ⏳ in progress · ✅ done

## Verification of rev 6's claims

| ID | Rev 6 disposition | Verified |
|---|---|---|
| G-15 | Item 7 leaves the incident open, item 13 splits into refuse-then-plan, item 4 gates both dev routes with the standing rule | ✅ Closed. 13a now fails a build that lost the G-03 guard, which is the whole point. See G-23 for what the checklist does after go-live |
| G-16 | Volume guard added, numbers bracketed, empty-log month declared inconclusive | ⏳ Guard present, but criterion 3 as written pulls against criterion 1. See G-24 and G-25 |
| G-17 | Refusal guardrail in ADR-005, LAUNCH 1.1 demoted from done to in progress | ✅ Right guardrail, right demotion. See G-26 for its status problem |
| G-18 | Backup decision refiled to LAUNCH §2.4 as a continuity decision, conditional retention rule left with counsel | ✅ Closed, and the framing in §2.4 is correct |
| G-19 | Breach-notification commitment added as counsel attachment 6 | ✅ Closed |
| G-20 | `--against` confirmed to exist and diff; `db:dump` given a household argument; two-command weekly procedure written into the protocol; friction log home and owner left bracketed and flagged | ✅ Mechanism closed. See G-27 for what the dump leaves on disk |
| G-21 | Sign-off table added to the quarterly step | ✅ Closed |
| G-22 | No re-wrap tool existed at all; `db:rewrap-kek` built, dry-run default, round-trip proven before any write, one transaction with an in-transaction decrypt check, rotation unit-tested | ✅ Closed, and the finding was worse than reported, which is the right way to be wrong |

Six new items follow. None is a defect in what was built. Four are
consequences of the rev 5 and rev 6 fixes meeting parts of the package that
were written before them.

---

## New items

| ID | Item | Owner | When |
|---|---|---|---|
| G-23 | The smoke checklist stops being safe to run once demo data is archived | 🤖⚖️ | Before go-live |
| G-24 | Exit-test criteria 1 and 3 pull against each other | 🧑 | Before the first mirrored visit |
| G-25 | The exit-test numbers are a structural gate, not a tuning knob | ⚖️ | Same sitting as G-24 |
| G-26 | The strongest safety guardrail in the package sits in a Proposed ADR | ⚖️ | Five minutes |
| G-27 | The weekly drift dump is a new plaintext artifact with no retention rule | 🤖🧑 | Before the first mirrored visit |
| G-28 | The brief demotes two items that LAUNCH and the checklist depend on | 🧑 | Filing |

### G-23. The smoke checklist stops being safe to run once demo data is archived

Three things that were each correct in isolation now collide. The checklist
header says it runs after every deploy. The incident register is append-only
with no delete path, by design. LAUNCH §1.3 archives every demo household at
go-live.

So after go-live, running the checklist as written means logging a fake
incident on a real client's household, on a record that can never be deleted,
creating a topic exclusion against their prompts, toggling hold and reuse flags
on one of their photos, and dry-running the erasure tool against their
household id. Every one of those writes an audit row in a real household's
history. The first three deploys after go-live would put more manufactured
incidents in the register than a quiet quarter of real service.

The checklist was extended for the right reason and generalized to every deploy
for the right reason. What is missing is a production fixture to point it at.

*Fix:* keep one permanent non-client household in production, seeded and never
archived, explicitly not a real client, and point items 6, 7, 9, 11 and 13 at
it by name. `archive-demo-data.mjs` should exempt it. If you would rather not
carry a permanent fixture, the alternative is a reduced post-go-live checklist
that drops the write-heavy items, but that gives up exactly the coverage rev 6
just built. The fixture is the better answer and it costs one seed row.

### G-24. Exit-test criteria 1 and 3 pull against each other

The protocol says an entry lands in the friction log at any point where the app
made the mirror harder, easier, or different from paper, and every entry
carries one of two verdicts: APP DEFECT or SPEC CANDIDATE. Entries therefore
exist only where there was friction.

Criterion 1 requires zero APP DEFECT entries for the month. Criterion 3
requires at least eight of the twelve mirrored visits to carry at least one
entry of any kind. Together they require eight or more SPEC CANDIDATE entries
in the same month the app produced no defects at all. The exit condition is
satisfied only by a month where the software is flawless and the methodology is
still churning heavily, which is a narrow and slightly strange target.

The intent behind the guard was to prove the log was kept. The implementation
proves friction existed, which is a different thing and works against the
condition sitting next to it.

*Fix:* give every mirrored visit a row, and add a third neutral verdict such as
NO FRICTION. Criterion 3 then becomes "every mirrored visit has a row," which
evidences that the log was kept without requiring friction to occur, and an
empty log still reads as inconclusive because the rows are simply missing. One
column value, and the two criteria stop fighting.

### G-25. The exit-test numbers are a structural gate, not a tuning knob

Twelve mirrored visits in a calendar month, on a weekly membership, is roughly
three households running concurrently. The suggested numbers therefore say
something stronger than they appear to: the app cannot be promoted to system of
record until the pilot has at least three households live.

That may well be the right answer, and it is the same reasoning A2 already
applies to rule retirement, where the flag requires three households and two
users. But it should be chosen rather than arrived at, because as bracketed
numbers they read like dials, and as a consequence they are a gate that a
single-household pilot can never pass no matter how well it goes.

*Fix:* decide which you mean and say so in the protocol. Either state plainly
that promotion requires three concurrent households and keep twelve, or scale
the number to the pilot's actual visit volume and accept the weaker evidence
with the reason written down.

Second, smaller point in the same paragraph: criterion 4 asks for four
consecutive clean weekly diffs inside a single calendar month. Months with a
partial first or last week make that fragile for reasons that have nothing to
do with the software. A rolling thirty-day window removes the calendar
accident without weakening the test.

### G-26. The strongest safety guardrail in the package sits in a Proposed ADR

ADR-005 now carries the refusal that no real s3 value enters the vault until
the sealed second custody exists. Its status line is Proposed, and its own
consequences section says it stays Proposed until the brackets are filled and
the sealed copy exists.

By the repo's own convention, ADR-001 and ADR-004 bind because they are
Accepted. So the package's strongest safety gate is currently inside the one
ADR that is not yet a decision, and it cannot become one until the thing it
gates on has happened. The cross-reference in LAUNCH §1.1 carries it in
practice, which is why this is a five-minute fix rather than a serious one, but
the governance reads backwards.

*Fix:* separate the two halves. Accept the guardrail now, since it costs
nothing while no real s3 values exist and it is the part you want binding
immediately, and leave the custodian, mechanism and retrieval condition as the
open decision that keeps the rest Proposed. "Accepted in part, 2026-07-25"
with a line saying which part is enough.

While you are in that file: `db:rewrap-kek` succeeding writes a new KEK that,
by default, exists only in Vercel. ADR-005 item 5 already says a rotation that
does not update both custodies did not happen, but the tool does not say it.
Have it print that reminder as its final line on a successful `--commit`, so
the policy is in front of whoever just rotated rather than in a document they
read once.

### G-27. The weekly drift dump is a new plaintext artifact with no retention rule

The weekly procedure now writes `dump.json`, a household record export, to
local disk before diffing it against the workbook. That runs every week, for
the life of the parallel phase, on someone's laptop.

This is the same class of object LAUNCH §1.1 shredded and congratulated itself
for shredding. It is less severe, since it is not key material, but it is a
plaintext copy of a real household's record sitting outside every control the
system enforces: outside the role filters, outside the audit log, outside the
photo purge, and outside the erasure tool's reach. It is also the exact
artifact staff confidentiality clause 4 tells House Managers never to create,
which is defensible for a corporate tool but worth being deliberate about.

*Fix:* three small things. Confirm the dump excludes vault plaintext and
carries ciphertext at most. Write it to a gitignored temp path rather than the
working directory. And add one line to the protocol saying the dump is deleted
after the diff, so the weekly procedure ends where it started.

### G-28. The brief demotes two items that LAUNCH and the checklist depend on

The rev 6 brief reorganizes remaining work by when, which is a real improvement.
Two items landed in the wrong bucket.

`seed:rules` is under "Whenever." The trigger library has to exist for smoke
check 14 to show anything, and for the anticipation panel in check 3 to gain
items. It belongs with the deploy.

Neon history retention, the restore drill and paid tiers are also under
"Whenever." In LAUNCH they are §1.2, a data-safety gate before any real
household data, and the restore drill is the evidence base for the §2.4 backup
decision the brief lists separately. A gate that precedes a decision should not
sit after it in the same document.

*Fix:* move `seed:rules` to "with the deploy" and §1.2 to "before the first
real household," which is where LAUNCH already puts it.

---

## Suggested order

1. **Five minutes, now:** G-26, both halves.
2. **Before the first mirrored visit:** G-24, G-25 and G-27, ideally in one
   sitting since all three edit the protocol.
3. **Before go-live, and before `archive-demo-data.mjs` runs:** G-23. After
   that script runs the checklist has nowhere safe to point.
4. **Filing:** G-28.

---

## Repo addendum C (2026-07-25, same night — verification + actions on addendum C)

| ID | Verification / action |
|---|---|
| G-23 | **CONFIRMED — the best catch of the round — and FIXED this commit.** A permanent `Smoke Test Fixture` household: DEPLOY §4 now routes the write-heavy items (6, 7, 9, 11, 13) at it by name with one-time creation instructions, and `archive-demo-data.mjs` exempts it explicitly. One seed row buys back the whole checklist after go-live. |
| G-24 | **FIXED this commit.** Third verdict NO FRICTION added; every mirrored visit gets a row; criterion 3 now proves the log was kept rather than that friction existed. Criteria 1 and 3 no longer fight. |
| G-25 | **Half fixed, half framed this commit.** Criterion 4 moved to a rolling 30-day window (the calendar accident is gone). The N=12 structural-gate choice is written into the protocol as an explicit either/or with the reasoning — the founder picks which sentence stays. |
| G-26 | **DONE this commit, first half:** ADR-005 is now "Accepted in part" — the Guardrails section (including the no-real-s3 refusal) binds as of 2026-07-25; the custody brackets remain Proposed. **Second half was already satisfied:** `db:rewrap-kek`'s final line on a successful `--commit` has printed "update BOTH custody copies (ADR-005)" since it was built — the reviewer had the zip, not the source. |
| G-27 | **Verified and tightened this commit.** Confirmed: the dump carries NO vault material at all — s3 values are structurally absent from field rows (vault law), so not even ciphertext leaves the DB. Still a plaintext record: the procedure now writes to /tmp, ends with `rm`, both dump filenames are gitignored, and the tool's header says who runs it and why it dies after the diff. |
| G-28 | **Noted for the next brief.** The brief lives in the handoff zip, not the repo; rev 7's brief moves `seed:rules` to "with the deploy" and Neon retention/drill/paid tiers to "before the first real household," matching LAUNCH. |

---

## Deploy-run addendum (2026-07-27) — gaps the first production smoke run surfaced

Found during the 2026-07-25/27 deploy session (migrations 0014–0017 live,
12 of 14 checks passing at time of writing). Fixed-this-commit items say so;
the rest are filed, not fixed.

### G-29. Approval actions fail silently
`reviewEdit` (and its siblings) early-return with NO user feedback when the
edit is no longer pending, the role is wrong, or the input is invalid. The
operator sees a click that does nothing and cannot distinguish "refused" from
"broken" — this cost the smoke run two days of misdiagnosis. Checklist item 3
now warns about it (this commit); the action itself still needs a visible
refusal (redirect with an error param, matching the signin pattern).

**FIXED this commit, for the two corporate surfaces.** `refuse()` /
`refuseTo()` in `actions.ts` replace the bare `return` with a redirect
carrying `?refused=<reason>`; `<RefusalBanner>` renders it. Reasons are a
typed union (`bad-input`, `forbidden`, `not-pending`, `missing`,
`gate-unmet`, `self-target`) so a new guard cannot invent an undescribed
one. Fail-closed behaviour is UNCHANGED — every guard still refuses and no
refusal path writes; only the operator's feedback changed. Covered: every
action on the drill-in (`reviewEdit`, `setStatusTag`, `setVaultValue`,
`queueGesture`, `gestureGate`, `executeGesture`, `assignRole`, `revokeRole`,
`promoteDot`, `forceSignOut`, `resetTotp`, `recordHouseholdConsent`,
`createAnticipationExclusion`, `endAnticipationExclusion`, `createIncident`,
`resolveIncident`, `setPhotoRetentionHold`, `setPhotoReuseAllowed`) and both
on `/oversight/triggers`.

**Still silent, deliberately deferred:** `proposeEdit` (client page),
`logStrangerTest` / `captureField` / `recordPromptOutcome` (visit page),
`setMonthlyRate` (economics page), and `createTimeEntry` / `createCostEntry`
(rendered on BOTH the visit page and the drill-in, so the refusal target is
ambiguous and needs a `returnTo` before it can be wired). Each needs a
banner on its own surface; the helper is written to extend to them.

### G-30. A dropped Resend send returns the success page
Observed live: the first magic-link request produced no email AND no
`error=send-failed` — the failing send returned the normal `/verify-request`
redirect. For magic-link-only auth this is a silent lockout. Needs
investigation against Resend's delivery log (was the API call accepted then
dropped, or did the response mis-report?) before the first real household
signs in.

**RESOLVED 2026-07-27 — the app is exonerated.** Resend's delivery log shows
the Jul 25 send as **delivered**: the app sent it, Resend delivered it, and
Gmail filed or delayed it (spam/promotions — normal for a young sending
domain). Not a code defect and not a Resend defect; the "success page on a
dropped send" framing was wrong — the send succeeded. Hardened anyway, same
day: the send path logs Resend's message id (one dashboard search now
settles any future report), and the check-your-email page tells a waiting
user to check spam and that re-requesting is safe. Remaining, founder-side
and optional: add a DMARC record for `wellkepthomeops.com` if one doesn't
exist (start with `v=DMARC1; p=none;` + a monitoring address — improves
inbox placement over time), and mark any spam-filed sign-in email "not
spam" to train the mailbox.

### G-31. Page truncation is silent at every layer
A function killed at its time ceiling mid-stream renders a partial page: no
error client-side, no exception server-side, `responseStatusCode: -1`. The
oversight pages now export `maxDuration = 60` (this commit) and DEPLOY §4
documents the symptom, but nothing MONITORS for it — a `-1` status spike is
invisible unless someone is reading raw logs. Candidate: surface it in the
uptime check.

### G-32. The corporate drill-in is ~9 sequential DB round-trips, uncached
Fine at pilot scale; it is what let a slow Redis push the render past 10s.
Batch the queries (single SQL with joins, or parallelize the remaining
sequential awaits) before the fleet reaches double digits.

### G-33. A page refresh appears to write an s3_corporate_view audit row
Observed once (10:10:28 row during a reload, no click). If drill-in renders
re-log corporate views, the audit trail inflates with phantom reveals —
over-logging, the conservative direction, but it degrades the trail's
evidentiary value. Reproduce, then decide: is the row from a re-fired fetch
(client bug) or a server-side render path that logs (design bug)?

**CLOSED 2026-07-27 as unreproducible mis-observation** (review round two,
session E, POST_DEPLOY_FINDINGS_E_I.md Q6). Grounds: one writer in the
tree, firing only on explicit client action; no render, refresh, or retry
path exists (sessions A + E, repo-wide); the observation came from the
same day that produced multiple screen-reports later retracted against
the database, and no logs were running. **Reopen condition, explicit:**
any recurrence observed WITH a log stream running is investigated
immediately as unaccounted-for.

### G-34. One reveal wrote no audit row, unexplained (2026-07-26)
A fresh-page reveal on 2026-07-26 showed the value with no row landing; the
identical action on 2026-07-27 wrote its row correctly (check 5 PASS). No log
stream was running on the 26th, so there is no evidence either way. Recorded
as an open anomaly against the audit trail rather than tidied away —
counsel's packet describes the audit insert as load-bearing, so a recurrence
WITH logs running must be investigated immediately.

### G-35. The dormant second Vercel project
`well-kept-web`: git-connected, auto-deploys on every push to main, zero env
vars, serves nothing anyone uses. It burned hours of incident time as a
decoy and its auto-deploys will eventually confuse someone into "fixing" it.
Decision, founder's: delete the project, or wire it as an intentional
staging target. Either is fine; dormant-and-unexplained is not.
2026-07-28 addendum: a stray third project ("schema", created by a deploy
chained after a cd, DEPLOY.md sharp edges) was caught and deleted the
same hour. The episode is a live argument for resolving this: an
unexplained project in the list is exactly what makes a stray one hard
to notice. Decision remains the founder's.

### G-36. `sslmode=require` weakens in pg v9
Today it resolves to verify-full; pg v9 / pg-connection-string v3 adopt
libpq semantics where `require` skips certificate verification. Change the
connection strings (Vercel, Railway, `.neon-connection`) to
`sslmode=verify-full` before any pg major bump — a one-line change that
prevents a silent TLS downgrade.

### G-37. Stale server-action IDs fail with no feedback at all
Split out of G-29 at the fixer's suggestion, because it is a different
disease: G-29's guards run and refuse; a page loaded BEFORE a deploy posts
a server-action ID the new build no longer knows, and that request dies
before any application code runs — no guard, no banner, no error, nothing.
It produced the two costliest false failures of the 2026-07-27 smoke run
(checks 3 and 11) and cannot be fixed by anything inside the actions.
Candidate fixes, in preference order: (a) Next.js deployment-skew
protection, so old pages keep resolving against the build that served
them; (b) a build-id heartbeat — the client compares its build id against
the server's and overlays "this page is from before the last deploy —
refresh" the moment they diverge. Until one lands, the operational rule
holds: hard-refresh after every deploy (DEPLOY §4 step zero).

**VERIFIED 2026-07-27, both branches, against production.** The PR #24 deploy was the armed test: a tab parked on df5da156's build showed the red banner ON THE 60-SECOND INTERVAL, UNFOCUSED — no interaction — within ~60s of dpl_3LabQ97Z (build 2aba9812) taking the alias, and "Refresh now" cleared it to the current build. The unattended path is the one that mattered: a stale tab announces itself while nobody is looking, which is precisely when a dead button would otherwise be clicked. The previous deploy had already proven the match branch (no false positives on fresh pages); both branches are now exercised. One operational note earned twice (#22, #24): check whether main has MOVED before using a deploy as a skew test — redeploying an unchanged commit produces an identical build id and a false "failure" of a working feature.

The first verification attempt and its lesson, kept for the record: The first spot-check was structurally invalid — the parked tab predated SkewWatch, and the deploy that introduces client-side skew detection is the one deploy it can never catch (its own bootstrap). Proven so far: the server half answers with the correct sha, and fresh pages run the watcher without false positives. The valid test, armed: a tab parked on THIS build banners within ~60s (or on refocus) of the next deploy of any different commit. Only then does this entry earn "fixed."

The mechanism as built: Every build bakes
`NEXT_PUBLIC_BUILD_ID` (the commit sha) into both its client bundle and
its server runtime; `/api/build-id` answers with the LIVE deployment's id;
a root-layout watcher compares on a 60s interval and on every
tab-refocus — the exact moment stale pages resurface — and overlays "this
page is from before the latest update" with a reload button on a CONFIRMED
mismatch only (network failure renders nothing: the field client is
offline-first and must never nag from a driveway). This covers all five
observed vectors: dead server-action writes ×3, the stale read (G-38's
tail), and the /visit service-worker fallback that can resurrect an old
build offline. The platform alternative (Vercel skew protection) was
considered and not used: it keeps old pages WORKING against old code,
which is the right call for a consumer site and the wrong one for an
ops tool whose audit surfaces must converge on the newest build.
DEPLOY §4 step zero remains as belt-and-braces.

### G-38. The trailing-30-day time & costs card renders empty against present data
Observed 2026-07-27 on dpl_5x4uPWSZ (main 1265067): the drill-in's "Time &
costs" card shows its "Nothing recorded yet" empty state for EVERY
household, while the exact query the page runs — verified by executing
drizzle's generated SQL with the same parameters against production —
returns the rows (fixture: two intake entries, 241 minutes; Fernbrook: one
121-minute entry). The writes work (the entries were created through the
app), the reads work externally, the page is force-dynamic, and the same
build's other new surfaces (refusal banner, capture forms) work. The
contradiction is unexplained and deliberately not guessed at. A TEMP
`[g38]` diagnostic log line now rides the page render; the next log
capture during a drill-in load should name the mechanism. Remove the log
line when this closes.

**CLOSED 2026-07-27 — not a code defect; the card is correct.** The log
capture on dpl_C3BeJdVm (main e6872af) answered it in one load:

    [g38] tc-card hh=8a4b9786-… timeRows=2 costs=1 since=2026-06-27T15:22:02.056Z
    [g38] tc-card hh=7ed45b9b-… timeRows=2 costs=0 since=2026-06-27T15:22:13.167Z

The render sees the rows, and on that same freshly loaded page both cards
displayed their hours — the fixture `intake 4.0h`, matching 241 minutes in
the database exactly. No errors under either render. The query, the
connection, the `Map` fold, and the empty-state ternary are all sound; two
theories floated during triage (a missing `revalidatePath`, then the fold
dropping rows) were both wrong. TEMP log line removed this commit.

**What the empty readings were is NOT established, and the ticket is kept
for that reason.** They were real and repeated, across two households and
two deployments. Everything measured is consistent with the browser
holding pre-deploy state, which would make this the FOURTH instance in one
session after G-29's approval clicks, the photo toggles, and the first
time entry. One difference matters: those three were stale *writes* (dead
server-action ids, submissions discarded), while this was a stale *read* —
correct data, correct query, stale pixels, nothing submitted at all. G-29's
refusal banners cannot catch it, because nothing was refused.

The uncomfortable part is that step zero WAS performed before the readings
that came back empty, exactly as in check 11 where the first hard reload
did not take and the second did. Step zero is a human procedure and it is
not reliably achieving what it asks for; a background tab or bfcache
defeats it. See G-37 — the app detecting version skew and forcing its own
reload is the durable answer, and this ticket is the fourth data point for
it. If a card ever reads empty against present data again, capture the log
BEFORE reloading: that is the one measurement this round could not take.

### G-39. Uncontrolled selects retain stale choices across action re-renders
Found 2026-07-27 by the fixture (doing its job): the membership `kind`
select kept `tier_change` across server-action re-renders — React applies
`defaultValue` on mount only and reuses the DOM node afterwards — so two
fixture events were recorded with the wrong kind while the operator
reasonably believed the form had reset. The `statusTag` select had already
learned this (its `key` remount guard); the lesson had not propagated.
**FIXED this commit for the commercial card** (key guards on kind, tier,
initiated-by, referral), **plus the deeper fix: success is now as legible
as refusal** — `recordMembershipEvent` and `setReferralSource` redirect
with `?recorded=…` and the drill-in renders a green confirmation; no green
line means no write, ending the phantom-row ambiguity that burned three
diagnostic rounds. The refusal banner is sticky now too — a mid-page
operator can't miss either verdict. The sweep landed the same day:
key guards on the drill-in's time/cost/incident/exclusion/assign-role
selects and the visit page's time/cost selects (nonce-remounted via the
success redirect); createTimeEntry/createCostEntry gained an allowlisted
returnTo so verdicts — refusal AND success — land on the surface the
operator is standing on (an HM's refusal no longer redirects to a
corporate URL they cannot see), and createIncident gained the green
confirmation. G-29's still-deferred surfaces after this: proposeEdit
(client page — needs client-appropriate language, not the corporate
banner), recordPromptOutcome (its answered-state is already visible
inline), and setMonthlyRate (economics page).
The two mis-kinded fixture rows stay (append-only; they are fixture test
data and harmless).

---

## Post-deploy review addendum (2026-07-27 evening) — sessions C and D filings

Filed per POST_DEPLOY_SESSIONS.md, after read-only sessions A and B
(findings: POST_DEPLOY_FINDINGS_A_B.md). Current maximum read before
filing: G-39.

### G-40. Erasure drift over the capture tables — FIXED this commit
Session B's finding: `erase-household.mjs` reached none of `time_entry`,
`cost_entry`, `membership_event`, or `household.referral_note` — the
deletion story stopped being true at migration 0020. Extended this commit,
defaults chosen for counsel to confirm (packet rev 4, section 2a): time
and cost rows KEPT (employer/business records) with notes blanked,
deletable by `--erase-time-and-costs`; membership events KEPT with
cancellation reasons blanked, deletable by `--erase-membership-history`;
referral source and note CLEARED; receipt photos purge with the photo
pass. Standing rule for every future data category: the erasure tool is
part of the definition of done — a category ships with its erasure
treatment or it does not ship.

**ADDENDUM 2026-07-27 (review round two, sessions H and J).** The
standing rule is now a GUARD, not a policy:
`packages/schema/src/erasure-coverage.test.ts` fails CI whenever a
household-referencing table is absent from `erase-household.mjs`
(allowlist entries require a written reason). Run before it was first
committed, the guard immediately found four tables the remembered rule
had already missed — `anticipation_exclusion`, `notification`,
`field_event_outbox`, `trigger_rule` — proving the reviewer's point that
the rule depended on someone remembering. All four are now handled:
exclusion reasons/targets blanked, notification and outbox rows deleted,
household-scoped trigger rules emptied and disabled. Session H's split
also landed: `referral_source` RETAINED (channel is acquisition history;
clearing it would silently bias LTV/CAC toward retained households),
`referral_note` CLEARED (frequently names a person). Packet rev 5
describes both and asks counsel to confirm (section 2a, questions a and
d).

### G-41. Personnel data captured without a staff disclosure
`time_entry` records hours against a named House Manager; the G-13
staff-facing disclosure is unwritten. Nothing has gone wrong because the
only person logging hours is a founder. **G-13 now gates HIRING, not just
capture session 5** — the disclosure must exist and be acknowledged before
a real House Manager enters a single row. Cross-referenced from
CORPORATE_CAPTURE_SESSIONS.md session 1, whose "deploy clean" gate should
have carried this condition. Also queued as packet rev 4 question (b).

**DRAFTED 2026-07-27**: `docs/legal/staff-records-disclosure.md`, built
from the session I inventory, states the three facts session I said an
honest disclosure must state (the permanent attributed action log; that
prompt outcomes could support performance inference, that no surface
performs it, and the commitment not to build one without its own review;
and a bracketed staff-records retention period for counsel). The gate
STANDS until the founder approves the draft, counsel reviews it, and the
hire acknowledges it — what existed before this draft was nothing; what
exists now is a reviewable document.

**FOUNDER-APPROVED 2026-07-28**, as written. Two of the gate's three
conditions remain: counsel reviews it (it is enclosed in the packet as
the fourth draft; section 7 asks the standalone-vs-folded question and
sets the retention bracket), and the hire acknowledges it before their
first logged hour. Capture session 5 stays gated on that acknowledgment,
which requires the hire to exist.

### G-42. After-the-fact time entry meets W-2 recordkeeping
No live clock is fine while a founder logs their own time. It becomes an
employer recordkeeping question the moment a non-exempt employee
reconstructs hours from memory. **Trigger: the first non-founder time
entry**, not a household count. The revisit is capture session 1's own
noted follow-up (clock-based entry when a second HM exists).

### G-43. Membership price duplicated across systems
`membership_event` carries a price per event; QuickBooks is the billing
system of record; nothing reconciles the two. This is the ADR-004 seam
appearing where it was always going to appear first. At pilot scale a
quarterly eyeball suffices; the real reconciliation belongs to the
workforce/billing tool purchase ADR-004 already anticipates at 15–20
households. Filed so the seam has a name before it has a discrepancy.

### G-44. Unbounded spend after the Upstash upgrade
The pay-as-you-go upgrade (2026-07-27, mid-incident) replaced a quota
failure with a spend failure: no cap, no alert. Founder dashboard action:
set a monthly budget alert in Upstash (they support spend notifications);
five minutes, same visit as the other chores. The worker's queue polling
is the main consumer — the same behaviour that burned the free tier's
500k requests.

### G-45. Intake-hours capture is in no runbook
Capture session 1 shipped the `intake` category; nothing requires anyone
to use it during a first onboarding. Intake cost decides whether the
108-household arithmetic works, and it is capturable exactly once per
household, during a chaotic first week. Disposition: add one line to the
LAUNCH §4 onboarding runbook — "log every intake hour as you go
(time category: intake); it cannot be reconstructed later" — done this
commit. The schema was necessary; the habit is the sufficient part.

### G-46. Mileage substantiation fields — awaiting founder field list
Session C1, reported not built: `cost_entry` captures category, amount,
date, optional miles, optional note. IRS substantiation for vehicle
expenses generally wants date (have), business purpose and destination
(absent — reconstructable from `note` only by accident). A migration
would add `purpose text` and `destination text` on mileage rows, or the
founder may direct that the note field carries both by convention.
NOT added — the field list is the founder's call, per the session brief.
The G-40 interaction (destination fields exist to survive scrutiny years
later, yet a destination usually names the erased household's address) is
routed to counsel per the round-two decision: packet rev 5, section 2a
question (e), to be answered at the custody sitting BEFORE any columns
are added.

---

Filed 2026-07-27 (night) from the intake-capture review
(INTAKE_CAPTURE_GAP_REVIEW.md), after verifying every checkable claim
against the tree. Current maximum read before filing: G-46.

### G-47. Tier gating exists as data, not as behavior
`standard_provision.membership_tier_gate` (null = all tiers) has exactly
one consumer in the tree: a display string on the standards page. The
trigger engine reads neither the gate nor the household's tier (the
provision `tier` it does read is the floor-tier concept, a different
axis), and the provision loader omits the gate from its supersede update
set, so gates cannot even be revised through the normal versioning path.
All 1,146 seeded provisions carry null. Consequence: every household gets
identical cascade behavior regardless of what they pay for — a margin
problem and a promise problem the moment tiers differ in practice
(review §5). Enforcement is a small engine change; authoring 1,146 gate
decisions is content work and pointless before tiers differ. **Trigger:
the first household on a non-Concierge tier, or the first non-null gate
authored, whichever comes first.** The loader's update-set omission
should be fixed with the same change.

### G-48. Hired and non-owned auto liability — from manifest finding to documented fact
The 23 July manifest flagged hired/non-owned auto liability as apparently
uncovered, broker and counsel needed before the first pilot signature.
Sharper now than when written: `travel` and `mileage` are shipped capture
categories, so House Managers driving on business is a documented
operational fact the software itself records. **Founder action, same
call as binding workers' comp: ask the broker for hired & non-owned auto
before the first pilot signature.** Filed so it lives in the register,
not only in a manifest.

### G-49. Object observation series and horizon inputs gate first-household intake
The intake instruments capture series (condition 1-5, fill level over
repeated visits) and horizon-derivation inputs (install date, expected
lifespan, maintenance interval, last serviced); the schema holds neither.
No table supports an observation series against an object (`dot` is
household-level free text; `season_observation` is derived seasonal
lines), and the registry sweep reads only `key_date` + `cadence` —
horizons are maintained target dates that rot the first time nobody
updates one (verified in registry-sweep.ts). Both instruments are
collecting inputs to calculations the software cannot perform (review
§§1-2). **Both changes gate FIRST-HOUSEHOLD INTAKE**: every day of intake
without them produces states where series were intended. Two builds, one
migration each: the observation table (entry reference, date, measure,
value, recorder), then typed horizon inputs with sweep computation.
Related note recorded here so it is not lost: the registry `sizes` kind
defaults to sensitivity s1 (client-visible) like every registry entry;
children's sizes are child data under WK-SOP-019 and must not land
client-visible by default — the write surface, when built, sets s2 for
sizes, and counsel is asked about children's data handling (packet rev 6,
section 6).

## Checklist-sitting addendum (2026-07-28) — gaps the step-5 write paths surfaced

Found working DEPLOY §4 plus the three new write paths (flag loop, close-flow
deferral, paused decision) against `1385a1e`/`ae553fd` on production. The
standing checklist passed 1-14; the flag loop passed in full, both guards
firing and failing closed. These two gaps blocked the remaining verification
and will block it again every time, so they are filed rather than worked
around.

### G-50. No single identity can see both ends of a field-and-client feature
The deferral and paused-decision paths are written on `/visit` (a FIELD
surface), read back on `/playbook` (a CLIENT surface), and administered on
the corporate drill-in. Each surface gates on a different role, and
`household_role_assignment_user_household_unique` — a UNIQUE index on
`(user_id, household_id)` — permits exactly one role per person per
household. So one account cannot hold the roles those surfaces require on
the same household, and the feature cannot be verified end to end by one
operator.

Observed on 2026-07-28: `/visit` resolves via
`assigned.find(a => a.role === "house_manager" || a.role === "backup_hm")`,
so it pinned to Field Test Home (the only household with a field role) and
could not be pointed at the fixture, where the operator is
`corporate_admin`. Granting `house_manager` on the fixture would have
REPLACED that `corporate_admin` — losing the drill-in, the photo toggles,
consent, incidents, exclusions and membership events, i.e. checks 3 and
5-13. Step 5 therefore ran on Field Test Home, putting condition flags and
a deferral permanently on a non-fixture household — the G-23 situation the
fixture exists to prevent. The client-side verifications (deferral under
"Noticed, and planned for later", then "Since taken care of", and the
paused-decision leak check) could not run at all: `/playbook` requires
`role === "client"` and the CEO preview requires `corporate_admin` ON THAT
HOUSEHOLD.

**Disposition.** `ensure-smoke-fixture.mjs` should seed SEPARATE identities
on the fixture — an HM address and a client address alongside the corporate
grant — so the fixture is self-sufficient for all three surfaces without
anyone trading a role away. That also matches how the roles are held in
life: by different people. Until then, any checklist item spanning field and
client surfaces is unverifiable, and DEPLOY §4 should say so rather than
implying a single operator can work it.

**EXERCISED 2026-07-29.** The three-identity fixture was used for real
for the first time: the two overdue items were resolved as the
plus-addressed `+wk-fixture-hm` identity and the client card was read as
`+wk-fixture-client`, both on the same household, in one sitting. The
verification gap this entry describes is closed in practice. The
underlying product question - whether one person should be able to hold
both roles - was answered separately by the founder (AJ option 2: the
four visit-close surfaces admit corporate_admin; the index is unchanged).

### G-51. Resolution paths are time-gated and cannot be tested the same day
A deferral's and a paused decision's resolve controls render only when the
item is overdue: `openDeferrals.filter(d => d.revisitDate && d.revisitDate <
today)`, and the same shape for `overduePaused`. The comparison is strictly
less-than, so an item deferred with today's date is not resolvable today.

The consequence is that the whole-or-absent CHECK's PASSING direction —
`resolution`, `resolved_at` and `resolved_by` all set together — has no
same-day test path for either entity. On 2026-07-28 both were created and
verified (`deferral.visit_command_id` proven to reference a real applied
`visit.submit`; the paused decision holding valid timing with
`resolution`/`resolved_at` NULL) and both resolutions were left unverified
for this reason alone. The refusal directions passed; the constraint's
accepting direction did not, which is the half a CHECK is usually wrong in.

The gating itself is correct behaviour (AB/AD: the HM sees only what has
come due, nothing promotes automatically). The gap is that verification has
no supported way in.

**Disposition.** Seed the fixture with one already-overdue deferral and one
already-overdue paused decision, so the resolve controls are present on a
fresh fixture and the passing direction is testable in the same sitting.
Failing that, DEPLOY §4 must state that these two resolutions require a
back-dated row and are not same-day checks — silence currently reads as "run
it", and it cannot be run.

**Reclassified 2026-07-28 (session AI, SYNC_DEFECT_SESSIONS): a DEFECT,
and client-facing, not a verification gap.** AB's premise is the
noticed-then-handled story; a deferral completed early had no way to say
so, and a six-month deferral finished next week would sit on the client's
card as open for six months, visible and false. Fixed: resolution is
available whenever a deferral is open ("Deferrals on record" on the visit
page); the revisit date drives overdue surfacing (the tag, the briefing),
never the ability to resolve. One factual correction to the entry above:
the paused decision's resolve controls were never overdue-gated (the
visit-page card maps every open item; only the TIMING ARRIVED tag and the
briefing array key on the date), so the fix applies to the deferral side
alone. The fixture's pre-overdue seeds remain useful for exercising the
overdue path itself.

**FIX VERIFIED IN PRODUCTION 2026-07-29.** Both entities resolved from
the visit page on the day the items were surfaced, and both rows carry
resolution, resolvedAt and resolvedBy together - so the whole-or-absent
CHECK is now proven in BOTH directions (refusals the day before, the
accepting direction here). That accepting half had never run on either
entity, which was the substance of this entry.

### G-52. The visit close reported success for a visit that was never delivered, and the command was lost client-side

Observed 2026-07-28, section 4 sitting, Field Test Home
(d05ab5a2-7d9c-4cff-919a-250adafa0355): the first close-flow submit showed
the green "Visit submitted" card and wrote nothing server-side; a retry
succeeded (d76b04a5, applied 19:45:20Z). Initially read as "the central
write persists nothing," then narrowed by mechanism, then settled by
observation.

**Mechanism, in the code that shipped it.** The submitted card rendered at
local-queue time by design (offline first); the drain retried only on page
load and the browser online event; a failed drain was silent except a
counter that could not distinguish waiting from stuck; a failed head broke
the drain loop so nothing behind it could send. The command persisted in
IndexedDB and should have redelivered on any reload.

**Outcome, settled 2026-07-28 night.** After the fd1083c deploy, a hard
reload of /visit in the affected browser showed ZERO queued commands, and
the household still holds exactly one visit_command row (the applied
retry). A drain at any point would have inserted a second row, applied or
same-day conflict; none exists. Therefore the first submit's command left
the browser's storage without ever being delivered: **lost client-side**,
timing unknown. Consistent with the AE finding (the multi-tab rehydration
handoff is claim-by-delete, with a window where the command exists only in
one tab's memory) or with storage eviction; the "1+ queued" badge readings
during the sitting are consistent with in-memory state outliving the disk
record. Caveat: if the original submit ran in a different browser or
profile than the one reloaded, the command may still exist there; the
observed browser is believed to be the original. What was lost is
fixture-scale test data; the mechanism is what matters.

**Fixed the same day (sessions AF/AG/AH, live in fd1083c), each half
proven:** the queue self-schedules retries with bounded backoff and
dead-letters at a cap with operator retry-or-discard (discard writes the
audit row first, server-side); the sync status distinguishes syncing,
retrying, and stuck; the submitted card claims "saved on this device"
until nothing waits; and the visit_reconciliation floor (knob set,
gapDays 10) surfaces any household whose record shows no applied visit
inside the window, whatever the client did wrong.

**Remaining exposure, deliberately on the record.** The AE claim-by-delete
window between tabs is UNFIXED: a crash between a rehydrating tab's delete
and its re-put can still lose a command from disk, and divergent per-tab
in-memory queues can still hold the same command twice. Its fix (an
atomic handoff, or single-writer claim with the record kept until the
new copy is durable) is its own session, not yet authorized. Until then
the compensating controls are the retry loop, the honest card, the
reconciliation floor, and the operational rule that the field client is
opened from a home-screen install, not a browser tab (iOS evicts a
tab's IndexedDB after seven days without a visit to the site, which is
exactly the weekly-visit gap).

### G-53. The reveal audit records the attempt, never the outcome: a failed reveal is indistinguishable from a successful one

Demonstrated 2026-07-29 on the fixture's `alarm code` field, three rows,
three different real outcomes, no way to tell them apart:

    17:13:34  s3_corporate_view  {"field":"alarm code"}   FAILED: no vault item existed
    14:48:58  s3_corporate_view  {"field":"alarm code"}   SUCCEEDED: plaintext delivered
    14:37:13  s3_corporate_view  {"field":"alarm code"}   FAILED: sealed under the previous KEK

Same kind, same actor, same role, same detail shape. An auditor asked
"who has viewed this secured value" reads three views by corporate_admin
and is wrong about two of them.

**Mechanism, in `apps/web/src/app/api/reveal/route.ts`.** The audit row
is inserted at line 59, fail-closed, BEFORE the decrypt (the audit
invariant, and correct). The decrypt happens at line 76,
`vaultOpen(f.id)`, and its result is never recorded: a missing vault
item returns null and the route answers with the `vault-pending`
placeholder; a wrong-key decrypt throws inside `openValue`. In every
case the row already written says only that a reveal was authorized and
attempted. Nothing downstream ever amends it.

**Why this is not the audit invariant working as designed.** The
invariant's promise is "no audit row, no value" - the log cannot be
skipped before a secret is exposed. It says nothing about the reverse,
and the reverse is what an auditor actually asks. The trail currently
OVER-reports: it claims exposures that never happened. G-34 is the same
trail UNDER-reporting (a reveal that wrote no row at all, 2026-07-26).
Together they mean the reveal audit is unreliable in both directions,
which matters because the counsel packet describes the audit insert as
load-bearing evidence.

**Disposition, and the constraint on any fix.** Do NOT move the audit
write after the decrypt, and do NOT wrap the two in a transaction -
CLAUDE.md forbids both, for the reason that a decrypt failure would then
roll back the record of the attempt, which is the unsafe direction. The
shape that fits: keep the pre-decrypt row exactly as it is (the
authorization-and-attempt record), and append a SECOND row after the
decrypt resolves, recording whether the plaintext was actually
delivered. If that second write fails, the trail still holds the
conservative attempt row, so the failure mode stays "assume they saw
it". The outcome vocabulary is a taxonomy and therefore a founder
decision, not the implementer's: the minimum is delivered vs not, and
the candidate reasons are no-vault-item and decrypt-failed.

Until the fix lands, any audit export answering "who viewed this" must
be read as "who was authorized to view this and attempted it".

### G-54. A KEK rotation locks out every enrolled staff user, backup codes included, because the TOTP decrypt throws before the fallback is reached

Hit in production 2026-07-29 (digest 2073677018) minutes after the KEK
rotation: the founder's `user_totp` row was sealed under the previous
key, and every attempt to reach a staff surface returned a server-side
exception rather than a challenge.

**Mechanism, in `apps/web/src/lib/totp.ts`.** `verifyChallenge` opens
the confirmed secret first and only then falls back:

    if (verifyTotp(openSecret(row), token)) return true;   // line 128
    if (/^\d{6}$/.test(...)) return false;
    return redeemBackupCode(userId, token);                // line 130

`openSecret` is `openValue(kms(), ...)`, which throws on a GCM auth-tag
failure when the ciphertext was sealed under a different KEK. The throw
happens on line 128, so line 130 is unreachable. **Backup codes are
stored as hashes and are entirely unaffected by the rotation - the
escape hatch is intact and simply cannot be reached.** The same applies
to any future key rotation, any restore of a database snapshot taken
under a different key, and any partial rotation across environments.

**Disposition.** Wrap the secret open so a decrypt failure falls
through to the backup-code path instead of throwing: a secret that
cannot be opened is a factor that cannot be satisfied, which is exactly
the case backup codes exist for. Failing closed is still correct (no
TOTP match), but it must fail closed as a REFUSAL, not as a 500. Worth
pairing with an operator-visible reason on the challenge screen, since
"your authenticator no longer matches this server" is a different
instruction from "wrong code".

**Recovery used, recorded here because the trail cannot hold it.** The
`user_totp` and `user_backup_code` rows for the affected user were
deleted directly in SQL (the founder was locked out of the drill-in,
so the `resetTotp` action was unreachable). Two consequences follow
from the direct route rather than the action:

1. **Sessions were not revoked.** `resetTotp` revokes them precisely so
   a reset cannot leave a window with the second factor removed and old
   sessions still valid; ten sessions remained live. Cleared separately
   once noticed.
2. **No audit row exists for the MFA removal.** The trail has no record
   that a second factor was removed, by whom, or when. This is the
   third gap in the same direction on the same day (G-53 reveals logged
   identically whether they succeed or fail; G-52 a visit close that
   logged nothing) and the only one that was self-inflicted. Recorded
   in this entry because there is nowhere else durable to put it.

An operational rule follows and belongs in the rotation procedure:
**rotate the KEK only after clearing enrolled TOTP rows, or accept a
lockout**, because the sealed-secret failure mode gives no usable path
back through the UI.

---

### G-55. Twenty-five refusal paths land on a page that renders nothing, so a declined action is indistinguishable from a completed one

**Filed 2026-07-29**, from the last open item on the DEPLOY.md section 4
checklist: a stray fixture exclusion (`5e5d170a`, scope `person`, target
"topic") that reported green on two separate End attempts and wrote
nothing. The database settled the observation: `effective_to` is still
NULL, and the only `exclusion_ended` audit row in the entire store
belongs to a different exclusion, ended correctly the day before. Two
attempts, two green readings, zero writes. The action demonstrably
works, which made the difference worth chasing rather than filing as
mysterious.

**The data could not separate the two candidates** (a different
`exclusionId` reached the action, or the green came from something other
than the action). The code can narrow it, and in doing so exposes a
wider defect than the row that led here.

**Mechanism.** G-29 replaced the action layer's silent `return` guards
with a redirect carrying `?refused=<reason>`, on the explicit reasoning
that an operator cannot tell "the system declined this" from "the system
is down". A refusal can land on exactly four surfaces, and three of them
render `RefusalBanner`: the oversight drill-in, `/visit`, and
`/oversight/triggers`. The fourth is the fleet board at `/oversight`,
which took no `searchParams` and rendered no banner at all.

`refuse(householdId, reason)` falls back to `/oversight` whenever the
household is unknown (`actions.ts:38-40`), and **25 call sites pass
`null` deliberately**: every `bad-input` guard whose form named no
record, and every `missing` guard whose form named a record that does
not exist. All 25 produced a click, a navigation, and silence. That is
the precise signature observed on the exclusion: the operator acts, the
page changes, no error appears, nothing is written.

It also explains why the two candidates were indistinguishable from the
outside. `endAnticipationExclusion` refuses `bad-input` on an empty
`exclusionId` (`actions.ts:803`) and `missing` on an unknown one
(`actions.ts:806`); **both are `refuse(null, ...)`, so both landed on the
silent board.** A wrong or empty id submitted by the form would look
exactly like success. This does not prove that is what happened, and the
row is inert either way, but it removes the mystery from the class.

**Disposition, shipped in the same change.** The fleet board takes
`searchParams` and renders the banner. A guard
(`apps/web/src/lib/refusal-visibility.test.ts`, the eleventh) reads the
refusal target set out of `actions.ts` and resolves each target through
the route tree, then asserts each target page renders
`<RefusalBanner reason={x}>` with `x` destructured from
`await searchParams`. Both halves of its input are computed rather than
listed, per the inputs doctrine, with floors on the target count, the
route count and the call-site count so a broken extractor fails instead
of passing vacuously.

**The guard caught its own first version.** Proving it red on the actual
bug returned green: `includes("RefusalBanner")` was satisfied by the
leftover import of a component no longer rendered. A second weak
assertion, `/searchParams/`, matched any mention of the word. Both were
tightened and the proof re-run: green, red on five injections (the real
bug with the import left behind; a target with no page; the extractor
defeated by renaming `refuse`; a banner wired to `undefined`; a banner
wired to a real local that the redirect never sets), green again.

**The stray exclusion row is deliberately left in place, unresolved.**
Ending it by direct SQL would set `effective_to` with no
`exclusion_ended` row behind it, manufacturing a fourth audit hole in a
day that produced three (G-52, G-53, G-54) in order to tidy a row that
excludes a person named "topic" and therefore suppresses nothing. It
stands as the evidence that produced this entry.

**What this does not close.** The exclusion's green readings are
explained as *possible* here, not demonstrated. The stale server-action
hypothesis recorded against the checklist item is weakened rather than
eliminated: the clean-page retry that was supposed to settle it also
wrote nothing. A refusal that never redirects at all, and whether an
operator reads a banner that does render, are both outside this guard.

---

## Addendum (2026-08-01) — reconciled against the 1 August operating-library bundle

Two new gaps surfaced reading WK-SVC-007, WK-QA-015, WK-PLAY-001 Addendum C,
WK-STD-026 and WK-LEG-010 against the schema as it stands. Neither is a defect
in anything shipped; both are prerequisites the bundle names as blocking
work that has not started (Member Circle, Showing Up, the horizon channel).
Numbered G-56 and G-57: G-55 above was filed the same week, independently,
and lands first in the register.

### G-56. The Member Circle register does not exist anywhere in the schema
🧑 Rachel · ⚖️ a decision to make

WK-SVC-007 states plainly: this service must not run until two things exist.
The first is REQ-076 deletion (W-15, tracked). The second is THE MEMBER
CIRCLE, the register of non-client recipients (a sister, a neighbor, a
colleague someone asks Well Kept to help show up for) that WK-STD-026
governs. Checked `packages/schema/src`: no table, no model, nothing
resembling a recipient record exists today.

This is the second half of the same blocker W-15 already tracks, not a
separate one: no recipient record may be created before REQ-076 (deletion)
AND the register itself both exist. WK-LEG-010 (the client-facing "Record
Preview" document, drafted 1 August 2026) already describes this as
"Section 25, people outside your household we help you show up for," with
its own decline-the-whole-section provision (WK-LEG-010 §25, added 1 August
2026: declining it changes nothing else about the record). That legal
provision has nowhere to attach until the register is built.

**Scope, per WK-STD-026 and WK-PLAY-001 Addendum C section F:** name and
relationship, dietary and observance facts, sensitivities (scent, allergy),
a pre-decline that outranks every other rule in the library, recurring dates
kept only where the member asks, and what was sent and when. Twenty-four
months after last engagement, then deleted, unless a recurring date was
expressly asked to be kept. Never marketed to; never counted in a pipeline.

**Do not build this before W-15,** since a Member Circle write path without
a working deletion path is exactly the state WK-SVC-007 forbids.

### G-57. The temporal layer (83 fields) is unbuilt; the horizon channel has no substrate to run on
🧑 Rachel · 🤖 code or infra

WK-PLAY-001 Addendum C, issued 31 July 2026, specifies 83 fields across six
groups (People; Systems; Administrative custody; The household year; Guests,
pets and vehicles; The Circle) as one structural change, not 83 separate
decisions. Checked `packages/schema/src`: none of birth year/date, system
installation date, expected life, serial/model, warranty terms, passport or
visa expiry, policy renewal dates, vehicle registration/inspection, or a
field marking a household tradition as lapsed exist anywhere in the schema
(grepped for birth_year, birth_date, install_date, warranty, passport, visa,
policy_number, vehicle_registration, expected_life — zero matches).

This is the field-level detail behind two things already on record:
- CLAUDE.md's REQ-011 correction (SPEC_AUDIT.md row 011): the horizon
  channel is explicitly named as unpowered until date fields exist.
- **G-49 above**, which covers the narrower case of object-level horizon
  inputs (install date, expected lifespan, maintenance interval, last
  serviced) for the registry/appliance domain specifically. G-49 stays open
  and unchanged; this entry is the wider set Addendum C adds on top of it:
  person dates (birth year is "the highest-value field in the library,"
  unlocking ten downstream surfacings per WK-APP-007), administrative-custody
  dates (passport, visa, insurance policies, vehicle registration, FSA,
  professional licensure, each with its own lead time), household-year
  dates (school calendars, camp registration, enrollment windows), and the
  Circle fields tracked separately in G-56.

Also folds in the "ritual restored" gap: Addendum C section A lists
"household traditions, and lapsed ones" (tier 2) as "the origin of the
ritual restored Moment. A tradition that stopped is often a signal rather
than a preference." The schema records standing traditions; it has no field
for one having stopped. WK-SVC-002 Addendum B and WK-QA-015 both name this
gap independently; this is its one home in the register.

**Per WK-PLAY-001 Addendum C's own guidance:** not a new section. These
fields attach to sections that already exist (birth year with the person,
install date with the system). Six of the 83 are tier zero (intake); the
rest arrive over the first year through opportunistic capture and two
backstops, per WK-APP-007's blocking/staged/background model, which is
itself unbuilt: no field-dependency graph, no derived blocking/staged/
background state, no prompt-to-ask trigger class. Provenance-on-write
already exists (CLAUDE.md, "every write stamps provenance server-side");
what is missing is the layer above it that decides which field to ask for
next and when.
