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

**BANNER PROVEN IN PRODUCTION 2026-08-06** (the eighth deploy's second
proof): a stale second-tab end of the same exclusion landed on the fleet
board showing the red Action refused banner, the exact click-navigate-
silence shape this entry filed, now visible where it was invisible.

**RESOLVED 2026-08-06, evidence spent, root cause settled as user
error (founder-confirmed).** The row was ended that night through the
legitimate audited path, as check 9 of the section 4 sitting:
`effective_to` set at 07:45:32.435, an `exclusion_ended` audit row 9ms
behind it carrying `subjectToken` and no name (the row is
person-scoped, so ADR-006's tokenised branch applied; the token is
fresh, distinct from the only prior one, no linkage). Not the bare SQL
update this entry deliberately refused. A later reader should know the
filed defect no longer has a row behind it; this paragraph is why.

The end worked on the first press, no banner, which eliminates every
theory that the action was broken for this row: the id, the guards and
the write path were always fine. Whatever failed on 2026-07-28 failed
before the action ran. The founder then confirmed the cause: user
error, the same shape as the row's own creation. The drill-in offers
two adjacent controls both labelled Approve, one of which creates an
exclusion from free text; the same mechanism turned an intended
edit-approval into a live topic exclusion again the night of the
resolution (`cea920dc`, also since ended). The two July "end attempts"
were real clicks and real success banners on a different action than
the one intended, so no submit carrying this id ever reached
`endAnticipationExclusion`, which is why nothing was written and
nothing refused. The stale-tab hypothesis is retired with it.

The durable outcome of this entry stands on its own and is unchanged
by the cause: 25 `refuse(null, ...)` sites redirecting to a fleet board
that rendered no banner was real regardless of what happened here, and
the eleventh guard closed it. One string decision left for the
founder, reported rather than made: whether the two adjacent Approve
controls should stop sharing a label, since that affordance has now
produced the same misfire twice.

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

**Resolved, 2026-08-01: counsel confirmed no statutory obligation.**
`OPEN_ITEMS_INSTRUCTIONS.md` Item 1.1's question went to counsel: does any
statute or regulation require deletion of records about people who are not
clients, at Well Kept's size. Answer: no. The founder's instruction,
verbatim: "we do not need to require deletion of records about people who
are not clients. there should be no constraints."

**What this changes.** Deletion-on-request for non-client records is a
promise the company may choose to make, not an obligation it must
discharge under a statute. REQ-076's current wording ("hard delete, not a
soft flag") asserted a legal necessity that was never verified and is now
known to be false. It was drafted before `erase-household.mjs` was read,
per `OPEN_ITEMS_INSTRUCTIONS.md`'s own framing. Withdrawn.

**What this does not change.** "No constraints" answers the legal
question, not the design one. `ADR-006` (audit-identity tokenization) was
built to survive every possible ruling, including this one. Tombstone is
now confirmed sufficient, and tokenizing identifying fields at write time
still costs nothing and remains the correct shape, since it makes the
trail unlinkable on request without an unaudited deletion or a broken
append-only property either way. The specific retention design (the
24-month figure, the may-hold/may-never-hold field list, whether a
recurring date survives by request) was never a legal question and is
still the founder's to set. "No constraints" means the mechanism is
unconstrained, not that the record needs no design at all.

**Not editable from this repo.** `REQ-076` and `WK-STD-026` live in the
founder's document library, not in `packages/` or `docs/`. The matching
edits (`WK-STD-026` amended under `WK-SOP-026` with this decision and its
date, `REQ-076` rewritten to drop "hard delete, not a soft flag," and
`WK-DEV-005`'s "nothing hard-deletes" line corrected the same way `CLAUDE.md`'s
was in PR #104) are the founder's to make in her own copies, per the
`WK-APP-003 Addendum A1 §S3` / `membership_tier_gate` precedent (W-11).

**G-56 unblocked in principle, not yet scoped.** The register itself (the
`member_circle_entry` table) can now be built as a tombstone-pattern write
path, matching every other entity in this schema, rather than needing a
true hard-delete mechanism. Still not started: the table design, the
may-hold/may-never-hold enforcement at the API boundary, the 24-month
retention job, the non-marketable export exclusion, and `OPEN_ITEMS_INSTRUCTIONS.md`
1.3's flagged gap (a recipient is not a household, and `erase-household.mjs`
is household-shaped, engineering not counsel, and still open). Sized as
its own session or several, not something to start inside a documentation
commit.

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

---

### G-58. Suppression is more built than a first read suggests; one state is genuinely missing and the six are not one pipeline

**Filed 2026-08-01**, correcting an overstatement made earlier the same
session. Asked to recommend a path forward from session AQ, this session
first reported suppression as "1 of 6 states" (only LIFE-EVENT) based on a
grep for state-specific names (`escalate-only`, `pre-decline`,
`categoryDecline`). That grep was too literal: it looked for the vocabulary
`WK-APP-008` uses, not the mechanism the code actually built.

**What's actually there.** `anticipation_exclusion` (REQ-056,
`packages/trigger-engine/src/exclusions.ts`) is a generalized suppression
list (`scope: rule | topic | person | field | all`), consulted live and
fail-closed in both the delta and sweep paths (`run.ts:53-56, 72, 122`)
before a draft ever queues. Read against `WK-APP-008` Part 3's six states:

- **Pre-decline**: covered. An exclusion with `effectiveFrom` in the past
  and no `effectiveTo` suppresses from the first candidate onward
  (`exclusionActive`, `exclusions.ts:23-27`).
- **Field-level decline**: substantively covered via `scope: "field"`,
  matched against the field name or item text. Not identical to the spec's
  ask, though; see the gap below.
- **Category decline**: substantively covered via `scope: "topic"` or
  `scope: "all"`, matched by case-insensitive text containment against
  `itemText`/`packKey`. No `scope: "section"` exists, so it doesn't map
  cleanly onto WK-PLAY-003's 25 numbered sections the way "decline Section
  25" implies.
- **LIFE-EVENT**: covered, structurally and totally (`engine.ts:106`,
  `household.statusTag`).
- **Escalate-only**: genuinely absent. `filterExcludedDrafts` has one
  effect: drop the draft, count it as suppressed. Nothing routes a
  suppressed candidate to a corporate-only queue; a household-wide
  `scope: "all"` exclusion suppresses for everyone including corporate,
  which is a different behavior than "reaches corporate, never the client
  or House Manager."
- **Tier**: not evaluated in this pass. Part 4's tier-gating of what
  reaches which surface is a separate mechanism from suppression proper.

**Two real gaps, distinct from the false "1 of 6" headline.**

1. Section 0's field-level decline (`WK-DEV-001` REQ-011's 1 August
   correction) wants a confirmed-decline VALUE resident on the field
   record itself, distinguishable on the field's own display from
   `N/A-confirmed` and from unasked. `scope: "field"` exclusion rows
   suppress correctly but don't give the field that visible state; this
   is the same gap AQ's finding 1 already named, restated here in
   suppression terms rather than schema terms.
2. Escalate-only has no mechanism. Building it needs a decision this
   session isn't scoping: does an escalate-only candidate get a new
   `anticipation_exclusion` scope value with different runner behavior
   (route to a corporate queue instead of dropping), or a separate table
   entirely? Either way it's new schema, not an extension of what exists.

**Not checked in this pass, worth naming rather than assuming clean:**
whether exclusion-based suppression and LIFE-EVENT tagging, evaluated as
two independent mechanisms rather than one ordered pipeline, ever produce
an outcome `WK-APP-008`'s fixed order (pre-decline, category, field,
LIFE-EVENT, escalate-only, tier) would have prevented. Floors bypass
exclusions explicitly (`exclusions.ts` header); whether a floor also
reaches a House Manager correctly during LIFE-EVENT (the spec's own
carve-out) was not traced end to end here.

**Update, 2026-08-01, Direction 3a's WATCH read.** Checked whether WATCH
already implements escalate-only under another name, per the brief's own
hope (the shape that turned out true for G-49). It does not. Every WATCH
reference in the codebase is one of two things: `alertCorporateOnWatch`
(REQ-061, `apps/web/src/app/api/visit-commands/route.ts:46-51`), an email
to corporate on every visit close for a WATCH or LIFE-EVENT household, and
`setStatusTag`'s notification to the household's House Managers at the
moment the tag is set (`actions.ts:93-108`). Both are one-shot, tag-change
or visit-close triggered side channels. Neither touches `trigger_rule`
matching, `filterExcludedDrafts`, or `promptPackItem` emission in any way.
Client-facing candidates are not suppressed for a WATCH household (only
`"LIFE-EVENT"` sets `suppressedByTag`), so a WATCH household's client
portal and HM briefing behave exactly as a STEADY household's would. This
is the opposite outcome from G-49: escalate-only genuinely does not exist
under another name and genuinely needs new state.

**Also confirmed: the suppression log does not exist**, closing the
question Direction 3d asked before anything else got built. `filterExcludedDrafts`
(`exclusions.ts`) returns a bare count (`{ kept, suppressed: number }`),
not a per-candidate record of which gate stopped which item. Both callers
discard even that count: `field-events.ts:43` awaits `runTriggerPass`
without reading its return value, and `services/worker/src/index.ts:45`
does the same. `WK-APP-008` Part 3's "every suppressed candidate is logged
with the gate that stopped it" and Part 8's fire-rate telemetry are both
unbuilt; annual pruning is opinion today, exactly as the brief warned it
would be without this.

**Direction 3b, built the same session** (migration 0035): `prompt_pack_item`
gains `routed_to` (`client | hm | corporate | none`), defaulting to `'hm'`,
computed from what an item actually does today (the HM briefing query in
`data.ts` reads it; no client-portal surface renders it directly; corporate
sees it in the oversight pages regardless of tag) rather than hardcoded.
The migration changes no behavior: nothing reads or branches on `routed_to`
yet. Applied clean against a fresh local database, 36/36/36 three-way
count. Wiring actual escalate-only routing behavior against this column,
and the suppression-log gap above, are each their own session.

---

### G-59. Two live audit-write sites store an email address and a person's name directly, not an id pointing at one

**Filed 2026-08-01**, from Direction 1a's audit identity survey
(`docs/AUDIT_IDENTITY_SURVEY.md`), run to scope a forward-looking design
question about non-client records and finding a present-tense one instead,
raised separately per that direction's own instruction, since this is about
client-household data already in production, not about the recipient records
G-56 blocks.

**`role_assigned`** (`apps/web/src/lib/actions.ts:327`) writes
`detail: { email, role, ndaApproved }` to `audit_event` every time a
household role is assigned. `email` is the literal address, not a
reference to the `auth_user` row it belongs to (which `actorUser` already
provides for the actor, but not for the target of the assignment).

**`exclusion_created`/`exclusion_ended`** (`actions.ts:667, 813`) write
`detail: { exclusionId, scope, target, requestedBy }`. `anticipationExclusion.target`
is documented as holding "rule_id, topic tag, **person reference**, field
ref" (`tables.ts:884`); when `scope === "person"`, `target` is free text
naming a person. The fixture row this session has repeatedly referenced
(`5e5d170a`, scope `person`, target `"topic"`) is this exact shape with an
innocuous value; a real household's equivalent exclusion would hold a real
name.

**The erasure tool already knew.** `erase-household.mjs`'s own header
anticipates this: `--scrub-audit-detail` exists specifically because
`detail` payloads "can carry emails." But the flag is off by default, and
the dry-run's status line unconditionally reports audit events as "kept
intact (hashes, no values)" regardless of whether that's true for the
household being erased. **It answers Direction 1a's question 4 directly:
by default, an erased household's audit trail remains fully resolvable to a
person who was assigned a role or named in a person-scoped exclusion.**

**Disposition, not yet decided.** Two shapes fix this going forward, and
they are not mutually exclusive with catching up the historical rows:

1. Both sites store an id instead of the raw value (`assignmentId` already
   exists and resolves to the user; a `personId`/reference table would be
   needed for exclusion targets, which do not currently reference anyone
   structurally: `target` is untyped free text by design).
2. `--scrub-audit-detail` becomes the erasure default rather than opt-in,
   and the dry-run's status line is corrected to say what it actually knows
   rather than a blanket claim.

Direction 1b's audit-identity ADR (tokenize-at-write-time for non-client
subjects) is written with this finding in view, since the same mechanism
answers both the not-yet-built case and this already-live one, but building
either fix here is out of scope for a read-only survey.

**FIXED 2026-08-05, AR's first code session (Ruling 2), migration 0036.**
Built as ADR-006 specifies: `audit_subject_token` (id-as-token, household
scoped, kind email | person_ref, value at s2) holds the identifying value;
the audit row holds the token; resolution is a live join for an authorized
viewer (no surface renders these details today, so no display work was
needed yet); erasing the household DELETES the mapping rows, which is the
designed mechanism and the seventh documented DELETE exception in
erase-household.mjs (CLAUDE.md's exception list updated to seven in the
same change). All three write sites fixed: `role_assigned` mints an email
token; `exclusion_created` and `exclusion_ended` mint a person_ref token
when scope is person and deliberately keep plaintext targets for rule,
topic and field scopes (a topic tag is not a person, and blanking it would
blind the trail without protecting anyone). A fresh token per event, per
the ADR: dedupe per subject would itself be a linkage record. Proven red
(the email leak reintroduced, caught by name) and green in
apps/web/src/lib/actions.audit-identity.test.ts, four tests. Historical
fixture rows written before this fix keep their plaintext detail; no real
household exists, and rewriting audit history would break append-only for
zero privacy gain. Disposition option 2 (--scrub-audit-detail default and
the dry-run status line) remains open, deliberately: the tool's blanket
"kept intact (hashes, no values)" line is now TRUE for rows written after
this fix and stale only for pre-fix fixture rows, a smaller inaccuracy
than G-59 filed, left for the erasure tool's next reviewed pass.

**EXERCISED IN PRODUCTION 2026-08-06, the eighth deploy's first proof.**
A role assignment on the Smoke Test Fixture produced a role_assigned row
whose detail carries subjectToken with the email nowhere in the JSON, and
the matching audit_subject_token row holding the value. The first
tokenised audit write the system has ever performed, the strongest form
of the proof per standing doctrine.

---

### G-60. Direction 4's live-data read: no drift found, but the event log can't be trusted as pricing history, and two schema gaps confirmed empirically

**Filed 2026-08-01**, from the founder's Mac session running the four-query
package this session prepared. Corrects one claim made earlier in this
same register/thread and confirms two findings that were only suspected
from code before now.

**The headline question is answered clean: no drift exists today.** All
four households (`Chen-Williams Demo`, `Fernbrook Demo`, `Field Test Home`,
`Smoke Test Fixture`) have a `household.tier` that either matches their
`membership_event` history exactly or has no history to disagree with. One
apparent drift row in the first pass was a false positive in the query
itself, not the data: `Smoke Test Fixture`'s most recent event is a
`pause`, which carries `tier = NULL` by design, and the query's `DISTINCT
ON` picked the most recent event of *any* kind rather than the most recent
*tier-bearing* one, so `NULL IS DISTINCT FROM family_ops` read as drift
when the actual last tier-bearing event (the `tier_change` two minutes
earlier) matches `household.tier` exactly. **A guard proven wrong by real
data is the whole point of running it against real data**, recorded here
rather than quietly fixed and re-run, since the wrong first answer is
itself informative about how easy this class of query is to get subtly
wrong.

**Confirmed empirically what PR #105's commit message could only infer
from code: three of four households have a `tier` with zero
`membership_event` rows behind it at all** (`Chen-Williams Demo`,
`Fernbrook Demo`, `Field Test Home`, none of them have ever had a `start`
event). `tooling/seed/load-seed.ts` sets `household.tier` directly at
creation without a matching event, confirmed both in the code and now in
the data it produced. Harmless at fixture scale; at the point queue item 6
("consider putting one pilot household on a non-Concierge tier") is acted
on, a household whose tier has no origin event is a household whose
pricing history cannot be reconstructed from day one.

**New finding, not part of the original ask: `Field Test Home` has
`is_fixture = false`.** Every fixture-exclusion path in the code (the
`visit_reconciliation` gap mark, digest counts, analytics views) counts it
as a real household. It is also the household holding the stuck
`visit_command` from G-52, so it will continue surfacing as a genuinely
neglected real household in reconciliation views rather than being
excluded as test data. **Not corrected here.** A direct `UPDATE` would be
the same class of unaudited write this register already flags as a defect
pattern (G-55's "the row itself is deliberately left unresolved" reasoning
applies equally to fixing this by hand); it needs either a proper audited
path or the founder's explicit go before anyone changes it.

**New finding: `membership_event` has no state machine, unlike its
siblings.** `condition_flag`, `deferral`, and `paused_decision` each got a
DATABASE CHECK for their lifecycle rules (W-5, AB, AD). `membership_event`
has none: nothing requires a `start` to precede other events, nothing
prevents two `start` rows, nothing ties `pause` to a following `resume` or
`cancel`. The live fixture data demonstrates this isn't theoretical: its
own `tier_change` rows are timestamped *before* its `start` row (an
artifact of the checklist sitting's exercise order, not a production
defect, but the schema has no constraint that would have caught it either
way). `effective_on` also can't order same-day events on its own; every
row in the fixture's history shares one date, so ordering falls entirely
to `created_at` as a tiebreaker, which is insertion order, not a domain
claim.

**Correction to an earlier claim in this same thread.** Session AQ (and my
own recommended-path answer) said `membership_event.priceCents` existing
meant "MRR history is derivable." The schema claim was true; the practical
one was optimistic. Of the five `start`/`tier_change` rows in the only
household with any history, four have no price at all, and the one that
does (`$100.00`) is identical across two different tiers (`essential` and
`family_ops`), proof the write path doesn't derive price from tier, it
just records whatever was typed. **MRR is not currently derivable from
`membership_event` in practice**, only in principle. All data is fixture
data from the checklist sitting; this is a statement about the mechanism,
not about any real household's pricing.

**Two decisions, neither made here, matching the Mac session's own
posture:** whether `price_cents` should be required (a CHECK gated on
`kind`) or left optional with `membership_terms.monthlyRateCents` as the
authoritative source (unverified whether the economics read path already
falls back to it that way); and whether `membership_event` needs its own
lifecycle CHECK the way its three siblings got one. Both are scoped
sessions of their own, not a default to pick in passing.

---

### Commissioning addendum (2026-08-02): founder rulings applied to G-56, G-58, and G-60

The 2 August commissioning package (`FOUNDER_RULINGS_2026-08-02.md`,
`DURABILITY_REQUIREMENTS_2026-08-02.md`, `SESSION_COMMISSIONING_BRIEF.md`,
`INSTRUCTION_UPDATES_2026-08-02.md`, `PROVISIONAL_seed.md`; founder-held,
recorded here in summary) was reconciled against this register. Most of its
commissioned sessions had already run in the 1 August working session; the
rulings below are the new material.

**G-56 (Member Circle), per Ruling 5.** The register's scoping half closed
2 August: WK-PLAY-003 Addendum A (in the founder's library) scopes
`member_circle_entry` to the WK-STD-026 may-hold column, the pre-decline,
and the whole-register decline per WK-LEG-010 section 25. The pilot runs it
ON PAPER through the administrative alternative; per the 1 August counsel
ruling recipient records MAY lawfully enter the platform before a deletion
path exists, so paper-first is the founder's stricter-than-required policy
choice, never a compliance claim. REQ-076 is withdrawn and REQ-077 replaces
it at P2. What remains on G-56 is engineering only: a recipient-shaped
erasure path (erase-household.mjs is household-shaped) and the
member_circle_entry build under REQ-077. When those exist, G-56 closes.

**G-60's first open question, answered by Durability requirement 3:
`price_cents` becomes REQUIRED on `start` and `tier_change`.** Not built
here; the durability document's own consolidation note has it ride the
Temporal Layer migration window (Ruling 4) so the durability items cost one
migration rather than seven. G-60's second question (derive
`household.tier` from the event stream, or reconcile on write) is settled
by the drift query's own result: no drift exists, and reconcile-on-write
already shipped in PR #105, so the reconciliation branch is the standing
answer unless a later session deliberately supersedes it.

**Ruling 4 (Temporal Layer, G-57/G-49): approved as the first post-pause
schema build**, additive-only nullable fields, decline-class guards
required in place first (they are, PR #107). Two gates remain before it
can start: AO/AP/AQ have all reported (satisfied), and the founder's
August paper capture on her own household validates the field list
(NOT yet satisfied; founder-side).

**Durability requirements 1-8 recorded as binding on the Temporal Layer
migration window**: territory seam, explicit timezone per territory,
required lifecycle pricing, append-only lifecycle with coded end reasons,
referral lineage at creation, person-level identity mapping generalized
from ADR-006, export as a tested first-class capability, and a generated
data dictionary per migration. The don't-list is equally binding: no
multi-region, no microservices, no franchise tooling, no premature scale
work; one Postgres serves 1,200 households indefinitely.

**One divergence, reported rather than absorbed (report-and-stop):**
Ruling 1's condition reads "the sweep of existing fields (2e) is REPORT
ONLY and any existing field that would be caught comes back as a separate
ruling." The 1 August build (PR #107) instead TAGGED the three existing
matching fields (Resident-member health horizon, Aging-parent horizon,
Other dependents) after verifying zero trigger rules bind to any of them,
so the tagging changed no live behavior. The ruling was written
independently of that build and asks for a separate founder ruling on
exactly these fields. **RATIFIED by the founder, 2026-08-02, same day**
("ratify", on the reported divergence naming all three fields). The tags
on Resident-member health horizon, Aging-parent horizon, and Other
dependents (elder care, special needs) are now founder-approved, closing
the separate-ruling condition rather than bypassing it.

---

### G-61. Date-only facts stored as timestamps render one day early: the consent date on screen is not the date the client signed

**Filed 2026-08-06**, found by the section 4 sitting's check 6, on the
first exercise of the green consent branch. Ten minutes before the
founder recorded the fixture's consent, that branch was on record as
unreachable until a household signs; its first real execution surfaced
this defect, which is the strongest form of proof doing exactly what the
doctrine says it does.

**The observation, founder-reported verbatim from the drill-in:** the
Household consent card reads "Signed consent on record: August 4, 2026."
The database says `consent_signed_at = 2026-08-05T00:00:00.000Z`, and
the `consent_recorded` audit row carries the same 2026-08-05 value. The
screen is wrong by one day; the record is right.

**The mechanism, both halves in code.**
`recordHouseholdConsent` (apps/web/src/lib/actions.ts:592) parses the
`type="date"` form input with `new Date(signedAtRaw)`, which reads a
date-only string as UTC midnight. That is correct under the store-UTC
convention. The drill-in card
(apps/web/src/app/(corporate)/oversight/[householdId]/page.tsx:549)
renders it with `toLocaleDateString` pinned to `America/New_York`. UTC
midnight on the 5th is 8pm on the 4th in Eastern, so the card prints
the 4th. The timezone pin is deliberate, not drift; the collision is
structural: a date-only value stored at UTC midnight can never survive
display in a west-of-UTC zone. Every consent date will render one day
early, for every household, permanently. Not a fixture artifact.

**The class has exactly two members, verified against the schema.** The
codebase already has a correct convention for date-only facts: `date`
columns holding regex-validated `YYYY-MM-DD` strings, used by
`membership_event.effective_on` (actions.ts:1012), `cost_entry.incurred_on`
(actions.ts:955), and all three `revisit_date` columns (condition_flag,
deferral, paused_decision). Exactly two fields break it, both captured
from `type="date"` inputs but stored as `timestamp withTimezone`:

- `household.consent_signed_at` (tables.ts:52; parse at actions.ts:592;
  render at the drill-in card, page.tsx:549).
- `incident_report.occurred_at` (tables.ts:420; parse at actions.ts:725;
  rendered Eastern-pinned at the drill-in incident table, page.tsx:254,
  and the triggers page, triggers/page.tsx:265). Every incident's
  occurrence date has the same one-day-early display defect.

**Why this is worse than an ordinary display bug.** The consent date is
the legally significant one: it is the date a client signed, it anchors
legal/README.md and the privacy notice, and the one screen a person
would read it from shows the wrong day. The incident date feeds an
evidentiary register with the same property. The audit rows hold the
correct values, so both are recoverable; the presentation is not.

**Secondary observation, not a defect:** the fixture's
`consent_doc_version` is the literal string `consent`. actions.ts:591
accepts any non-empty text up to 80 characters, so nothing constrains
the field to identify a document, which is its entire purpose.
Re-recording with a real version identifier is the founder's, once the
display question settles (re-recording is the designed correction path;
the audit trail keeps the prior value).

**Check 6's verdict, recorded here for the sitting close-out: not
passed as written.** Its assertion is the red NO-CONSENT banner on a
household without consent, and the fixture no longer qualifies. The red
branch remains observable on Fernbrook Demo or Chen-Williams Demo
(both still `consent_signed_at IS NULL`), without touching the
fixture's new record.

**Two fix shapes exist; neither is chosen here (stop-and-ask).**
(a) Render fix: pin the affected `toLocaleDateString` calls to
`timeZone: "UTC"` for these two fields only. Two-line change, no
migration, correct today; leaves the type mismatch latent for whichever
render site is written next. (b) Schema alignment: migrate both columns
to `date`, joining the convention the other five date-only fields
already follow. One migration; and Durability requirement 2 (explicit
timezone per territory) touches this same seam, so the column change
could ride the Temporal Layer migration window where the other
durability items are already consolidated. Recommendation: (a) now,
because the screen is wrong today and the fix is two lines; (b) rides
the Temporal Layer window rather than spending this cycle's migration
on it. The founder decides scope and timing; also open is whether the
fix belongs to this sitting or to its own session.

**RESOLVED, option (a), 2026-08-24.** Executed under the founder's
proceed-with-recommendations authorization of the same day: the two
date-only fields render in UTC at every site (the consent line and the
incident occurred column on the oversight drill-in, and the incident
line on the triggers board, a third render of the same field found
during the fix), so the stored date displays as written. The consent
journey e2e now pins the rendered date string, which is the regression
guard: a return to a zone-shifted render fails CI. Option (b), the
date-column migration, stays queued in the Temporal Layer window with
the other durability items; this entry does not close that queue item.

### G-62. Three new data categories merged without the same-PR legal updates the merge-gate rule requires; caught and corrected one day later

Filed 2026-08-25 during the Tell Well Kept build, whose own legal pass
surfaced the miss.

**The rule** (CLAUDE.md, merge gates): "A new data category updates
`legal/README.md` and the privacy notice collection table in the same
PR. Both copies of the notice." The rule is memory-held; the guard
table's own honesty row for `client-copy.test.ts` says the guard scans
for em dashes, not for coverage, and `child-data-kinds.test.ts` covers
CHILD_DATA surfaces only through a hardcoded list that also was not
extended.

**What happened:** the substrate-window PRs shipped four new
household-content tables with erasure treatments, payload-guard
signatures, and staff-disclosure entries, but with NO legal/README
category, NO privacy-notice row in either copy, and NO CHILD_DATA
row: `shadow_log` (0038, 24 Aug), `work_item` (0041), and
`attention_record` (0042) and `decision_record` (0043, both 25 Aug
overnight). Each PR's checklist discipline held everywhere a CI guard
was standing and slipped exactly where memory was the enforcement,
which is the depends-on-remembering pattern this register exists to
name.

**Correction, same day (this entry's PR):** legal/README gains the
three catch-up categories (internal work/attention/decision records;
the anticipation shadow log; Tell Well Kept captures, the last being
the new category that shipped correctly in its own PR), both privacy
notice copies gain the Operational records row, CHILD_DATA gains rows
for all five tables, and child-data-kinds.test.ts's surface list is
extended to include them (proven red on the missing rows, then green).
Every catch-up entry is dated and marked as such; nothing pretends to
have been there.

**Exposure while open: none in practice.** No real household exists;
the notice's audience is empty. The gap is procedural, not a
disclosure breach.

**Residual, a decision rather than a defect:** the same-PR legal rule
has no guard. A structural option exists: extend the hardcoded surface
list in child-data-kinds.test.ts into a computed census (the
staff-disclosure pattern: derive free-text household tables from the
schema, require each named in CHILD_DATA and legal/README, allowlist
with written reasons). That converts this memory into a guard, the
preferred fix per CLAUDE.md, but building it is its own small session
and its detection pattern needs the same both-directions proof the
disclosure guard got. Not built here; scope holds.

### G-63. deploy.sh --preflight runs the production migration: a dry-run-shaped flag performs the batch's least reversible step

Filed 2026-08-25, from the 0037-0055 deploy. The founder ran
`--preflight` on the developer's advice that it was "all the checks,
no deploy," which is exactly what the script's own usage comment says
("checks only, no deploy"). Both statements are literally true and
both mislead: the checks INCLUDE running `db:migrate` against
production, because the three-way migration-count assertion needs the
migrations applied to count them. The nineteen-migration batch
(0037-0055) was therefore applied to the production database by a
command both the tool and the operator's advisor described as a
preflight.

**What held:** the migrations were each individually proven and the
batch had been reviewed line-by-line for destructive statements the
same morning; a Neon branch snapshot was created BEFORE the run as
the rollback hatch; and the schema-ahead-of-code state that resulted
is the survivable direction for an additive batch. The one
non-additive migration (0037's reviewed copy-then-drop of
field_event_outbox) made the interim state genuinely broken for the
old build's field-event path, which is why the web deploy followed
promptly rather than sitting. No data was lost; the deploy closed the
skew the same day.

**The defect class:** a flag whose NAME promises read-only behavior
performing a write is the sha-gate lesson in a new place: the tool's
own description was trusted where its behavior should have been. The
fix is structural, its own session: split the modes so `--preflight`
performs NO writes at all (count on-disk files against the database
WITHOUT migrating; report "N pending" instead of applying them), and
prove the new mode in both directions: red that it refuses to write
(a pending migration stays pending through a preflight), green that
the full mode still applies. Until that lands, the honest reading is
that deploy.sh has NO dry-run mode, and DEPLOY.md's usage comment
should say so in the same change.

**Also recorded here, unfiled until their details arrive:** the 6
August sitting logged two defects that were never filed in this
register (reported by the founder's local session, 25 Aug). They
should be filed by whoever holds the sitting notes; this line exists
so the fact of them is not lost with the superseded sitting.

**FIXED same day (2026-08-25, the entry's own session):** --preflight
is now structurally read-only. The preflight branch comes FIRST in the
migrate step, so no override can reach the write; pending migrations
are REPORTED ("N PENDING ... NOTHING was applied") with a database
BEHIND the tree accepted as the expected pre-deploy state and a
database AHEAD of the tree refused as a stale checkout. Proven in the
selftest with a live sentinel rather than by reading the code: case 10
runs a preflight against a behind database and asserts the migrate
path never fired and the pending count was said aloud; case 11 runs
the FULL mode the same way and asserts the migrate path DID fire
(then refuses downstream on the mismatched count, as it should); case
12 proves the stale-tree refusal. Twelve selftest cases total, eight
refusals and four green paths. DEPLOY.md states the read-only
guarantee in the same change. The two unfiled 6 August defects remain
the entry's open remainder.

**Remainder RESOLVED (2026-08-25, evening):** the sitting notes named
both defects. The first, date-only values rendering a day early on the
consent card and incident register, was already filed as G-61 on 24
August and its fix (UTC-pinned rendering at both sites) is live in the
deployed build; the 6 August observation predates the filing. The
second, em dashes in erase-household.mjs's refusal message, was
narrower than the truth: the file carried roughly fifteen across its
output strings and comments, because the W-10/W-13 sweeps covered
pages, docs, and legal and never this script. All swept to plain
hyphens the same evening, syntax verified. The founder-side selftest
of the preflight fix also ran on the deploy machine (twelve cases,
eight refusals, four green paths), which is the strongest home for
that proof. Nothing of this entry remains open.

**Confirmation 2026-08-26, the proof this entry could not have on the
day it was fixed.** The 25 Aug selftest and the local red/green runs
exercised the no-write path with nothing genuinely pending: the
database and the disk agreed, so a preflight that applied migrations
and one that did not were observationally identical. The 26 Aug
preflight ran against a real two-migration gap (0056 situation, 0057
preference_rule) and reported `database 56, disk 58` with NOTHING
applied. That is the exact invocation the old behaviour would have
turned into a production migration ahead of its build, which is how
the 0037-0055 batch landed. Recorded because the doctrine calls for
it: a guard proven locally and then meeting the real condition it
exists for is the strongest form of the proof, and this one also
NAMES ITS NUMBERS rather than saying "pending", so the disagreement
between database and tree is legible instead of a verdict.

### G-64. The HG provisioning script wrote a real tenant and a staff assignment with no audit history behind them

Filed 2026-08-25, from the founder's production provisioning run the
same afternoon: `db:hg` created Household Green (is_fixture=false, the
first real tenant in production) and assigned the tester as its
house_manager, and audit_event was unchanged at 62 rows. The same two
acts through the app write a `role_assigned` audit row carrying an
ADR-006 subject token (actions.ts assignRole), so the trail now
depended on which door the act came through, which is the audit
invariant's posture applied nowhere.

**Boundaries of the gap, stated so the excusals are reviewed rather
than assumed:** `db:capacity` is excused because app_setting_version
IS its attributed, versioned record (who, when, what changed, what it
replaced); `db:tasks` writes global reusable semantics with an
--author requirement and no member data; `db:training` resets a
fixture board (is_fixture=true, excluded from every real-record
claim); `ensure-smoke-fixture.mjs` (added to this list at the 25 Aug
sitting) seeds and re-seeds the Smoke Test Fixture, the same fixture
class as db:training, so its writes claim nothing about a real
person or tenant. The gap is specific to db:hg because HG is real.

**FIXED the same day (this entry's PR):** db:hg now requires
`--by <corporate email>` and refuses unless the identity exists and
holds a corporate_admin role somewhere (the app path's posture:
provisioning is a corporate act). It writes the audit history the app
would have written, in the same shapes: `household_provisioned`
(provisionedVia, pseudonymized, isFixture) and `role_assigned` with a
minted audit_subject_token, so the tester's email never enters the
audit row (G-59/ADR-006 held on the script path too). Idempotent on a
marker row: one provisioning history per tenant however many times
the script re-runs. A re-run against a tenant provisioned BEFORE the
fix BACKFILLS the rows marked `recordedLate: true`, honest about when
the trail was written. Proven locally against the exact pre-audit
state production is in: three refusals (missing --by, unknown
identity, non-admin identity), the backfill with recordedLate, the
idempotent no-op, email absent from every detail payload, and the
token resolving to the address through the mapping.

**The production remediation is one founder command:** re-run
`pnpm db:hg --email <tester address> --by <founder email>` against
production; it backfills the two audit rows marked recordedLate and
changes nothing else.

**Residual:** future seeding scripts that create real records need the
same discipline, currently held by memory plus this entry. If a third
real-record script ever appears, a shared provision-audit helper (and
a guard over scripts that insert into real-record tables) is the
structural fix; two call sites do not yet justify it.

**G-62 residual RESOLVED (2026-08-25, evening): the candidate guard is
BUILT.** legal-census.test.ts computes the household-referencing table
set from tables.ts (the staff-disclosure pattern; count floor >= 30
per the inputs doctrine) and requires every table to be named in
CHILD_DATA.md's surface table or excused in an allowlist with a
written reason. Its first red run surfaced TWENTY uncovered tables,
which is the census the memory-held rule never had: fifteen received
dated catch-up rows in CHILD_DATA.md (each restating the standing
treatment, none deciding new policy: visit_command, client_edit,
time_entry/cost_entry, membership_event, gesture,
trigger_rule/prompt_pack_item, prompt_outcome, season_observation,
stranger_test, notification, anticipation_exclusion,
object_observation, event_outbox) and six carry written excusals
(household, vault_item, audit_event, audit_subject_token,
household_role_assignment, time_segment). Proven red on a deliberately
removed doc row, green restored; joined the guard manifest and the
CLAUDE.md table in the same change. The legal/README and
privacy-notice PROSE stay on the same-PR rule, stated in the guard's
own not-covered column.

**G-61 class re-verification (2026-08-25, from the section 4
sitting):** the deployed fix was observed in the pulled tree (both
members UTC-pinned; the sitting's check 6 doubles as the live proof on
the fixture's stored 2026-08-05 consent). The founder's local session
then surveyed the ten remaining zoned renders; every one traced to a
true instant (audit createdAt, vault access, deferral resolvedAt,
quiet-hours fireAt arithmetic), so the entry's exactly-two-members
claim survives. ONE LATENT MEMBER recorded: registry_entry.key_date is
timestamp-typed like the broken pair but has NO capture path today
(seed scripts only, stamped noon UTC, which renders the same day in
every US zone). The day a capture form feeds it from a date input
parsed to UTC midnight, the defect returns on RegistryCard and the
context route; a warning comment now sits at the column for that
form's future author.

### G-65. /visit pins the founder to whichever field-role household sorts first, and her sitting capture proved it live

Filed 2026-08-25, from the founder's Field Test Home grant run, which
surfaced an audit row nobody had placed: a `capture_artifact` on Field
Test Home written at 16:41 as house_manager, during the section 4
sitting. The cause is in the code, not the data.
`getFieldHouseholdAndPrincipal` (apps/web/src/lib/data.ts:46) resolves
the field surface's household as `assigned.find((a) => a.role ===
"house_manager" || a.role === "backup_hm")`, over the list
`getAssignedHouseholds` returns ordered by `household.created_at`. So
/visit shows THE OLDEST household the signed-in person holds a field
role on, whatever they are actually working on that day. The founder
holds house_manager on Field Test Home (a July test tenant), so her
Tell Well Kept glance at the sitting captured onto Field Test Home,
which she then could not reach to dismiss it, because the same
household was the check-15 orphan. Two independent gaps compounded
into one invisible write.

**Not a defect in the capture path.** The artifact recorded correctly,
attributed correctly, and sat in the correct router queue; the queue
was simply unreachable. The single-household case (Lauren on HG) is
unaffected, which is why nothing caught this before a person held
field roles on two households at once.

**REPORTED, not fixed: the resolution rule is a founder decision.**
Three shapes, none chosen here. (a) Leave it and treat the
first-by-age rule as adequate while only the founder holds multiple
field roles, accepting that her /visit is pinned to whichever test
tenant is oldest. (b) Add an explicit household chooser to the field
surface when the principal holds more than one field assignment, which
is the honest UI but adds a step to the surface WK-DEV-007 section 2
is trying to make quieter. (c) Order the resolution by something
meaningful (most recent applied visit, or a founder-set primary), which
keeps one gesture but invents a rule about what "my household" means.
Adjacent, not the same: AJ's one-role constraint (2026-07-28) is about
two roles on ONE household; this is one role across SEVERAL.

**Interim ATTEMPTED AND NOT TAKEN (25 Aug 2026, evening; this entry
previously recorded it as taken, corrected in place):** the founder
attempted the revoke as the ftc-admin corporate identity and reported
it clean, and this line, the inspection document, and the weekly note
all recorded it as done. Verification the same evening found ZERO
role_revoked rows on the household and the assignment still standing
(aa4b7053). The revoke did not write; the accompanying capture
dismissal is unverified for the same reason. So the interim is NOT in
place: Field Test Home remains on her field surface, and everything
above stands unchanged. Field Test Home still passes check 15 on the
ftc-admin corporate assignment, which the failed revoke does not
touch. Retry-with-verification is the next action, and G-66 records
the surrounding finding.

**Interim NOW TAKEN, verified (25 Aug 2026, 23:28:59). The retry
wrote.** Field-role assignments on Field Test Home: ZERO; the July
`house_manager` row aa4b7053 is gone, and a `role_revoked` audit row
stands behind it, actor corporate_admin. The household is corporate
only now: one assignment, the ftc-admin identity, so check 15 still
passes and no field surface resolves there. **G-65 itself is
UNCHANGED and still open**: the interim removes the founder from that
household's field surface, which is why /visit now resolves elsewhere
for her, but the resolution RULE (oldest field-role assignment wins,
data.ts:46) is untouched and still hers to decide. The verification
also settled an unrelated loose end recorded here so it is not chased
again: the Smoke Test Fixture assignment that vanished earlier today
was revoked through the app at 16:34 with its own audit row, which
the first query missed by not reading role_revoked at all. Not a
defect; a query that looked in the wrong table.

### G-66. Role assignments made before 25 August carry no audit history at all, and the backfill is refused on purpose

Filed 2026-08-25, from the verification that corrected G-65's interim
line. Field Test Home holds two assignments and exactly ONE role audit
row: today's `db:grant` write. The July assignment (aa4b7053,
2026-07-19, `lettersrachel@gmail.com` to house_manager with
`nda_approved = true` on a non-fixture household) has no
`role_assigned` row behind it: no actor, no reason, no recorded
ndaApproved claim, nothing. It was a direct write, made before either
of today's two fixes existed.

**Same defect class as G-64, in a place nobody had looked.** db:hg
created Household Green with no audit history until G-64 added the
backfill; db:grant exists precisely so that a corporate grant is not a
silent SQL write. This row predates both and is what those fixes are
for. The finding is the founder's local session's, on its own
initiative during a different query.

**The nda_approved flag is unsourced in the strong sense.** It asserts
that an NDA familiarisation happened, and the only evidence for the
assertion is the column itself. It is inert today (NDA mode does not
gate corporate s3 access per the matrix, and Field Test Home is old
test data), and it is inconsistent across the same person's roles
(true here and on Household Green, false on both demos, the fixture,
and today's deliberately conservative db:grant write). What that flag
is meant to assert, and who may set it, is a founder question
separate from this entry.

**DECIDED: no backfill.** The two options were a `recordedLate` audit
row in the db:hg style, or leaving the row and recording the silence.
The backfill is REFUSED because it would have to invent an actor and a
reason, which is the exact thing today's fixes were careful not to do:
G-64's backfill was honest only because `--by` supplied a real actor
and the script knew its own provenance. Here nobody knows who created
the July row or why, and a manufactured attribution in an append-only
trail is worse than an acknowledged hole. So the treatment is: the row
stands as it is, and this entry is the record that **role assignments
predating 25 August 2026 carry no audit history**.

**Open, and deliberately not answered here:** the fleet-wide count.
The same pattern that produced aa4b7053 plausibly produced the
assignments on the demo households and the fixture, so the honest
scope is a census (assignments with no corresponding `role_assigned`
audit row), not one row. That count is a founder-side query; when it
lands it belongs in this entry, and if the number is large it argues
for a computed guard in the staff-disclosure/legal-census pattern
rather than more prose.

### G-67. Two corporate server actions reported success and wrote nothing, in the same session, on the same page

Filed 2026-08-25, from the retry verification that corrected G-65's
interim line. On the Field Test Home drill-in, as the ftc-admin
corporate identity, the founder performed two actions and reported
both clean. Neither wrote:

- `revokeRole` on the founder's own `house_manager` assignment: ZERO
  `role_revoked` rows on the household; assignment aa4b7053 still
  standing.
- `fileCaptureArtifact` dismissing the 16:41 capture: the artifact is
  still `status = captured`, `disposition` NULL, `filed_by` NULL.

**One silent no-op is a click that missed. Two, in one session, on one
page, is a pattern.** That is the finding; the cause is NOT diagnosed
here, deliberately.

**What is ruled out by reading the code.** Not permissions: the Revoke
control renders only when the viewer is corporate_admin and the row is
not their own, and the filing form renders only for
corporate_admin/ops, both true for that identity, so the controls were
present precisely because the gates passed. Not a refusal either: every
failure path in both actions calls `refuse(...)`, which redirects to a
page the eleventh guard (refusal-visibility.test.ts) proves renders the
banner.

**The gap that let this hide, which is the part worth keeping.**
refusal-visibility proves a refusal is VISIBLE. It cannot prove an
action EXECUTED. If the action never runs at all (a stale server-action
id, client JS that never hydrated, a form post that never leaves the
browser), no refusal is emitted, no banner appears, and the operator
sees exactly what success looks like. This is the G-55 defect class
recurring one level up: G-55 was a refusal that produced a click, a
navigation and silence; this is a NON-refusal that produces the same
three things. The 2026-07-28 fix closed the first and could not have
closed the second.

**Not a second bug, recorded so it is not counted twice:** the capture
sitting at `captured` with a null disposition is the CORRECT resting
state for an unfiled capture (`status` defaults to `captured` at
0044:1284 and only `fileCaptureArtifact` moves it). It is evidence
consistent with the dismissal never running, not an independent stuck
flow. It is also the first production row that table has ever held, so
there is no precedent to compare against.

**The decisive evidence, not yet gathered:** whether a POST leaves the
browser at all when the control is clicked. No request means the fault
is client-side (hydration or a stale action id) and the honest fix is
detection, since a silent client is indistinguishable from success
today. A request that returns 200 while nothing changes means the fault
is server-side and considerably more serious. One click with the
network panel open settles it, and no fix should be designed before it
does.

**Adjacent, in scope when the cause is known:** the same silence would
apply to every other corporate action on that page, which is most of
the ways a person changes anything in this product.

**UPDATE 25 Aug 2026, 23:28:59: the revoke SUCCEEDED on retry, and
that is evidence, not a closure.** Same action, same control, same
identity, same household, a later attempt: the assignment is deleted
and a `role_revoked` audit row stands behind it (verified by query,
not by screen). What this narrows: a systematic server-side fault in
`revokeRole` is ruled out, since the identical call path wrote
correctly minutes later with no code change in between. What survives:
a transient failure on the FIRST attempt, which is the stale
server-action id or the never-hydrated form, both of which produce a
click that never reaches the server and are indistinguishable from
success at the screen. **The decisive evidence is still owed and still
the same** (whether a POST leaves the browser), and it is now harder to
gather, because the state that produced it is gone. A retry that works
is the weakest kind of diagnosis: it proves the code can work, never
that the failure will not recur.

**Still open on the other half:** the capture dismissal
(`fileCaptureArtifact`) has NOT been re-attempted or re-verified since
the original silence. It is the second of the two actions this entry
was filed for, and it stays unclaimed.

**What changed around it:** G-68 (filed and fixed the same night) makes
the operator-facing half legible. Every action now confirms, so a click
that produces no green line is visibly a click that did not run. That
would have made this evening diagnosable in the moment. It does not
close this entry: a confirmation proves the code path ran to its end,
not that the row committed, and it says nothing at all about a request
that never left the browser.

## DISPOSITION, 2026-08-26: cause NOT observed, both symptoms resolved on retry, the instrument now calibrated

**Not closed as fixed, and the distinction is the whole entry.** Both
actions this was filed for have now written on retry with no code change
between the failure and the success:

- `revokeRole`, 25 Aug 23:28:59: the assignment deleted, a `role_revoked`
  audit row behind it.
- `fileCaptureArtifact`, 26 Aug 09:42:04: the artifact moved `captured`
  to `dismissed`, all four fields together (status, disposition,
  filed_by 7f1da977 the ftc-admin identity, filed_at), `work_item_id`
  correctly NULL for a dismissal. Nothing half-set.

**The healthy path was watched end to end, which had never been done.**
With the network panel open and filtered to `method:POST`, the
dismissal produced exactly one request of ours: a POST to the drill-in
URL returning **303**, 152 kB, 685 ms, followed by the re-rendered page
carrying the row as dismissed and G-68's confirmation banner. Three of
the four POSTs in that log were other sites in other tabs; ours was the
303.

**What that buys, stated plainly, because it is less than it looks.** It
does not diagnose the original failure: that failure did not reproduce,
and a mechanism never watched failing is a mechanism not diagnosed. What
it does is CALIBRATE THE INSTRUMENT. Before this, nobody knew what a
healthy server action looks like in the network panel, so a silent click
could not be read against anything. Now it can, and the next occurrence
is a two-minute diagnosis rather than an open question:

- `method:POST` shows NO row for the surface: the request never left the
  browser. Client-side, and the honest fix is detection.
- A row with anything other than 303: the request landed and the server
  refused or failed. More serious, and immediately actionable.

**Ruled out with more confidence than before:** a systematic server-side
fault in either action. Both call paths ran correctly, twice, against
production data. **Still standing:** a transient client-side failure on
the first attempt, most plausibly a stale server-action id across a
deploy or a form that never hydrated.

**The register's position:** this entry stays OPEN as a known,
unreproduced failure mode with its detection in place, rather than being
closed on the strength of two retries. If it never recurs, it ages out
as an unexplained pair; if it recurs, the panel now answers it in one
click. Either is honest. Claiming a fix would not be.

**Coverage note from the same verification, worth keeping:**
`capture_artifact` has now had exactly ONE row through its entire
lifecycle, captured to dismissed, in about seventeen hours, and it is
the only row the table has ever held in production. The
file-into-work-item path is unexercised outside tests.

### G-68. Half the action layer changed stored state and said nothing, so a working click and a dead click looked identical

Filed and FIXED 2026-08-25, the same evening as G-67 and directly out
of it. The question that produced it was the founder's own, one line
long: clicking Revoke, "it says nothing when revoked, its gone".

**It says nothing was the finding.** A census of every exported server
action in `apps/web/src/lib/actions.ts` (57 of them, all writing) split
almost exactly in half: 30 ended in `recordedTo(...)`, which redirects
carrying `?recorded=<what>` and renders a green line naming what
landed; **27 ended at `revalidatePath` and said nothing at all.** The
silent list is not the obscure half. It is `assignRole`, `revokeRole`,
`setStatusTag`, `reviewEdit`, `setVaultValue`, `recordHouseholdConsent`,
`resolveIncident`, `createAnticipationExclusion`,
`endAnticipationExclusion`, `forceSignOut`, `resetTotp`, `captureField`,
`setMonthlyRate`, the three gesture actions, the two photo-permission
toggles, `scoreShadowSignal`, and the rest: most of the ways a person
changes anything in this product.

**This is G-29's lesson, never finished in the other direction.** G-29
(2026-07-27) replaced the action layer's silent `return` guards with a
visible refusal, on the reasoning that an operator cannot tell "the
system declined this" from "the system is down". The same reasoning
applies unchanged to success, and success was left alone. For those 27
actions the operator's only evidence was the table below re-rendering
with rows that look the same as they did a second ago.

**Why it matters more than a missing green line.** It is what made the
G-67 evening unresolvable in the moment. Two actions were clicked,
reported clean, and wrote nothing, and no one could tell, because a
click that works and a click that dies produced identical screens. The
diagnosis had to wait for a database query the next morning.

**FIXED, in three parts.**

1. `recorded(householdId, what)` now exists beside `refuse(householdId,
   reason)`, the symmetric twin, redirecting to the same surface the
   operator is standing on. Every one of the 27 silent actions calls it
   or its path-taking form; the two that had hand-built the redirect
   themselves (`setReferralSource`, `recordMembershipEvent`) moved onto
   the helper. All 57 exported actions now confirm.
2. `RecordedBanner` is a component rather than four hand-copied inline
   blocks, and it is now rendered on every page a confirmation can land
   on: the four that already had one, plus the fleet board,
   `/oversight/economics`, `/oversight/triggers`, `/intake`, and the
   client `/playbook`.
3. **The sixteenth guard, `success-visibility.test.ts`**, holds it:
   every action that changes stored state must reach a confirmation or
   be excused in an allowlist with a written reason (the allowlist is
   EMPTY today, deliberately), and every page a confirmation can land
   on must render the banner bound to the redirect's own param. Both
   inputs are computed from the source, both carry floors, and it was
   proven red five ways (a lost confirmation, a lost banner, a banner
   bound to nothing, a value interpolated into a message, a broken
   extractor) before being trusted.

**What the fix does NOT do, stated because the temptation is real: it
does not close G-67.** A confirmation proves that the code path ran to
its end. It cannot prove the row committed, and it says nothing at all
about the case where the POST never leaves the browser, which is
exactly the case G-67 is about. What it changes is that the same
evening would now be legible: a click that produces no green line is
visibly a click that did not run. G-67's decisive evidence, one click
with the network panel open, is still owed.

**Two riders, both from proving the guard rather than writing it.**

- The red-proof found a hole in the ELEVENTH guard, not the sixteenth.
  `refusal-visibility.test.ts` extracted refusal targets from literal
  arguments only, so an action pinning its surface in a local const
  (`const returnTo = "/oversight/tasks"`, as the three task actions do)
  was invisible to it: that page could have lost its refusal banner
  with CI green. Both guards now resolve local-const surfaces, and the
  extension was itself proven by deleting the tasks page's banner and
  watching the older guard finally fail.
- The G-29 conversion is now complete on every STAFF surface: the
  remaining bare-return guards in `logStrangerTest`, `captureField`,
  `setMonthlyRate` and `recordPromptOutcome` refuse visibly.
  **`proposeEdit` is the deliberate exception and an open founder
  item:** it is the member-facing surface, and every message in
  `RefusalBanner` is written in staff voice ("Your role on this
  household does not permit that action"). A member's refusal copy is
  the founder's call, not a guess. Its SUCCESS confirms today, in
  client voice, as a proposal.

**Copy is a proposal throughout** (the AG precedent): every message is
one string, and the founder adjusts any of them without touching logic.
The one rule that is not copy: a message names WHAT was recorded and
never a value, because it rides in a URL and lands in browser history.
The guard enforces that for the actions that hash or seal their input.

### G-69. The revocation audit row could not say whose role ended

Filed and FIXED 2026-08-26, from the founder's read of the first
`role_revoked` row this system has ever written in production. She
found it herself, in the row itself, the same night it was created.

**The finding.** The detail carried `{"assignmentId":"aa4b7053-..."}`
and nothing else. No subject, no role, no NDA standing, no reason. And
because the assignment ROW IS DELETED by the same action, that id
dereferences to nothing the moment it is written: the trail says an
assignment ended, and cannot say whose it was, which role it carried,
or under what standing.

**Why it is a real gap and not a nit.** It is the weaker half of a pair
whose other half is careful. `role_assigned` has carried `role`,
`ndaApproved`, a reason where the caller supplies one, and an ADR-006
`subjectToken` since G-59 (2026-08-06). So a household's role history
reads as a series of well-described beginnings and undescribed endings.
That is exactly the asymmetry an audit trail cannot afford: for
questions like "who had access to this household in July", the ending
matters as much as the beginning, and the deletion is the one event
after which the answer can no longer be recovered from anywhere else.

**FIXED.** `revokeRole` now reads its subject BEFORE the delete (there
is nothing to read after it) and writes `{ assignmentId, subjectToken,
role, ndaApproved }`, mirroring `role_assigned`. ADR-006 holds on this
side too: the token resolves to the address while the subject's mapping
exists and stops resolving the day it is erased; the email itself never
enters the audit row. A subject whose `auth_user` row is already gone
records `subjectToken: null`, which is the honest statement that there
was no address to tokenize, not a blank to fill in later.

Proven in both directions, and the ordering claim is a test rather than
a comment: the suite's database mock EMPTIES its select results when a
delete runs, so an implementation that read the subject after deleting
would fail. Red on the old thin detail (two tests), red on the reordered
read (one test), green on the fix.

**NOT fixed, and a founder decision rather than an omission: there is
still no reason on a revocation.** `db:grant` requires `--reason` and
records it, because a grant from outside the app has no other context;
the in-app `assignRole` and `revokeRole` forms ask for none. Whether
removing someone's access should require the operator to say why is a
policy question about how much friction belongs on that control, and it
is the founder's, not a default to invent. Recorded here so the absence
is a decision on the record rather than a gap nobody noticed.

**Not a second finding, recorded so it is not counted twice:** the
production row correctly carries no `recordedLate` marker. That
revocation happened when it says it did. Only the July GRANT's
provenance is missing, which is G-66, and nothing can honestly fill it.

### G-70. Nothing in the sign-in flow says which address it is signing you in as

Filed 2026-08-26 from a live diagnostic round it cost. Reported with one
half fixed; the rest is the founder's copy call.

**What happened.** Signing in as the alter corporate identity
(`lettersrachel+ftc-admin@gmail.com`) failed three times in a row and
looked like a broken login. It was not: browser autofill silently
replaced the typed alter address with the primary one, so the link that
arrived was for the wrong identity, and nothing anywhere said so.

**Why it could not be caught.** Plus-addressing means both identities
deliver into ONE inbox, and the two sign-in emails are byte-identical:
same subject, same body, same button. The only difference is the `to:`
header, which most mail clients collapse by default. The MFA page does
name the identity ("Signed in as ..."), which is how the session was
finally read correctly, but by then three rounds had been spent.

**Three places could have echoed the address back, and none did:**

1. `/signin` accepts an autofilled address with no confirmation of what
   was actually submitted.
2. `/verify-request` said only "A sign-in link is on its way" while
   HOLDING the address in its own query string and in the code form's
   field below.
3. The email body names no recipient at all.

**Why this is not a one-off.** The alter-identity pattern is not a
workaround, it is what the one-role index REQUIRES when one person
covers two roles on a household (AJ, 2026-07-28, option 1), and the
Field Test Home grant is the first production instance of it. It will
recur every time it is used.

**FIXED, the cheapest of the three:** `/verify-request` now names the
address it sent to and asks the reader to check it is the one they
meant. The page already held the value; this echoes it. Copy is a
proposal, one string.

**NOT fixed, both founder calls:**

- **The email body naming its recipient.** A line like "This link signs
  in <address>" would have caught it at the last possible moment. It is
  client-facing copy in a template the founder owns.
- **Autofill behaviour on `/signin`.** Suppressing autofill helps the
  operator running two identities and hurts the far more common case of
  one. That is a trade, not a defect, and picking it is not an
  engineering default.

**AMENDMENT, same day: the email body is fixed too, as a proposal.** The
sign-in email now carries "This link signs in <address>. If that is not
the address you meant, ignore this email and ask for another." One
string, the AG precedent, and the founder changes it without touching
logic. The address is HTML-escaped, since it is the one user-supplied
value in that template. Two of the three places now name the identity;
only the autofill trade stays open, and it stays open because it is a
trade.

**RIDER, and the more serious half of this entry: the sign-in email was
never covered by the copy guard.** `apps/web/src/lib/auth/config.ts`
holds the body of the one message EVERY user receives, client and staff
alike, and it was not in `client-copy.test.ts`'s COPY_SOURCES. W-10's
own reasoning names email copy as in scope, and its closure claims six
templated sources; this was a seventh, uncovered since the guard was
written. Nothing was wrong in it (both em dashes in that file are in
comments, which the guard strips), so this is a hole that had not yet
been fallen into rather than a live violation. Added and proven in both
directions: green on the file as it stands, red on a planted em dash in
the email body, naming config.ts and its line. **The rule is always
wider than its guard** is the standing CLAUDE.md warning, and this is
the third time this month it has been the finding rather than the
caveat.
### G-71. The Smoke Test Fixture is identified by a predicate the schema does not make unique

Filed 2026-08-26 while replacing the Part B script's fixture-resolution
step with the fixture tool's own predicate, so the two would agree by
construction rather than by two people writing the same string twice.

**The finding.** `ensure-smoke-fixture.mjs:33` locates its household
with `SELECT ... FROM household WHERE name = $1` against the constant
`FIXTURE_NAME = "Smoke Test Fixture"` (line 25), and destructures
`rows: [hh]`. But `household` carries no unique constraint on `name`.
Confirmed in both directions: the live table's index list is
`household_pkey PRIMARY KEY, btree (id)` and nothing else, and
`tables.ts` declares unique indexes on four other tables and none on
this column.

So a second household named "Smoke Test Fixture" is representable, and
if one existed the tool would silently take whichever row the planner
returned first. Every write the smoke checklist makes against "the
fixture" would land wherever that pointed. The same is true of
`db:export-floors` and any other tool that resolves a household by name.

**Why it has not bitten.** Nothing creates households by name except
seeds and the intake path, and no duplicate exists today. This is a
gap nobody has fallen into, stated as such rather than dressed up.

**NOT fixed here, and deliberately.** The fix is a unique index on
`household.name`, which is a migration and therefore its own session
under the one-migration rule. It is also not obviously the right fix:
whether two households may ever share a name is a product question
(two clients genuinely called "The Smith Residence" is not absurd), and
a global unique index would refuse that. The narrower shape, a partial
unique index on `name` where `is_fixture` is true, constrains only the
fixtures and leaves real households alone. Either is a decision, not a
default, so the register carries it rather than a migration inventing
one.

**Mitigated where it can be, today:** the Part B script's P4 asserts
exactly one row from the name predicate and STOPS otherwise, so the
ambiguity surfaces at the one moment it would do damage, even though
nothing there can prevent it.

**A CONCRETE INSTANCE, 27 August 2026, replacing the hypothetical.** The
corporate board reads four active households, and two of them are demo
households: **Fernbrook Demo and Chen-Williams Demo**. They carry
distinct names today, so nothing is ambiguous and nothing is broken. What
changed is the argument. This entry was filed with "nothing creates
households by name except seeds and the intake path, and no duplicate
exists today", which is true and reads as remote. The board now shows a
live population where **two households of the same class coexist and are
told apart by name alone**, which is the shape the predicate depends on,
one duplicate away from the failure. The distance from "no duplicate
exists" to "a duplicate exists" is one intake with a repeated name, and
the intake path does not check.

It also sharpens the product question the entry left open. The demo pair
argues FOR the narrow fix rather than the global one: a partial unique
index on `name` where `is_fixture` is true would not have touched either
demo household, since neither is a fixture, while still pinning the one
household the smoke tooling resolves by name. Two real clients called
"The Smith Residence" stay representable. Still a decision and still not
made here, but the option space is now informed by a real population
rather than by a thought experiment.

### G-72. A mutation that never lands and a test that cannot fail look identical

Filed 2026-08-26 from two near-misses in one session, both while proving
Part B's rehearsal assertions sensitive.

**What happened, twice.** The technique for proving an assertion is real
is to break the code deliberately, watch the test go red, revert, and
watch it go green. Twice in a row the deliberate break DID NOT LAND, and
the run reported a pass:

1. **D1d, an ambiguous anchor.** The patch matched on a field list that
   appears in TWO actions (`resolvePausedDecision` and
   `resolveSituation` set an identical `status`/`resolution`/timestamps
   line), so the guarded replacement refused and the file was untouched.
2. **D1c, a broken relative path.** A `cd` earlier in the same shell
   meant the patch targeted a path that did not exist. The file was
   untouched.

In both cases the test then reported `1 passed`, which is the correct
result for unmutated code and the WRONG conclusion about the assertion.
Only a printed traceback and a printed "not found" caught them. Had
either been quiet, the register would now say an assertion was proven
sensitive when nothing had been proven at all.

**Why this is the inputs doctrine and not carelessness.** CLAUDE.md
already says a guard proven red and green tests its logic, not its
inputs, and that where a guard can compute its own input it should. The
same applies one level out, to the PROOF: a red-green proof tests the
assertion, not whether the mutation reached the code. A green run after
an intended break is ambiguous between "the assertion is decorative"
and "the break never happened", and those are opposite conclusions.

**WIDENED 2026-08-27, after the same failure arrived in a second
costume.** As first written this entry said: confirm the mutation
landed before reading the result. That is the narrow form, and the
narrow form is what the next variant walks straight past.

While proving migration 0058's CHECK constraints, six refusal cases
reported a clean REFUSED **while Postgres was down**. Nothing had been
mutated and nothing needed to be: every case would have read REFUSED
with or without a constraint existing, because the connection failed
before the statement ran. The proof asserted the right answer for a
reason that had nothing to do with the thing under test.

No mutation was involved, so the narrow rule did not apply. The general
one does:

> **A proof asserts its own preconditions before any case runs.**

The preconditions are whatever the proof's conclusion silently depends
on, and they are always the things nobody thinks to check:

- **Mutation proof:** the patch landed, at the intended site, once.
- **Constraint proof:** the database is reachable AND the constraint
  exists. Print the constraint names from `pg_constraint` first.
- **Guard proof:** the guard file is the one being run, and its
  detection returns a non-trivial input set (the floors doctrine).
- **Gate proof:** the input is real, not a sentinel (the four-live-sha
  rule below).

Stated at this level because the narrow version has now been evaded
twice by variants that were not mutations at all. A third costume is
likelier than not; the rule has to be about the CATEGORY, which is a
proof resting on an unstated assumption, rather than about patches.

**The rule, adopted and added to CLAUDE.md's verification section:**

- **Confirm the mutation landed before reading the result.** Print the
  changed line, or assert the new text is present, as a separate
  observable step. A patch that reports success is not evidence; the
  file's content is.
- **Qualify every anchor.** A patch anchor that matches more than once
  is not an anchor. Prefer a line number resolved at patch time, or an
  anchor that includes enough surrounding context to be unique, and make
  the patch REFUSE on an ambiguous match rather than pick one.
- **Use absolute paths in proof scripts.** Working directory is state,
  and state that survives between commands is state that will eventually
  be wrong.

**Both proofs were then redone correctly and both turned red**, so
nothing in the Part B record rests on the failed attempts. This entry
exists because the failure mode is silent and would have produced a
confident false claim, which is the class this register was created for.

---

**OBSERVATION, 2026-08-27, on where this rule fails to get applied.**
Not a fifth variant. The variants above are about kinds of proof; this
is about the moment the rule is not reached for at all.

Sixty seconds after committing the widened rule, a `pnpm test` run
exited 1 and was pushed anyway. It was diagnosed a minute later as
Postgres having died, `ECONNREFUSED`, so the diff was fine and nothing
was harmed. **The benign outcome was luck, not judgment**, and the two
are indistinguishable at the moment of pushing: a failing suite means
either "your change is broken" or "a precondition of the run was not
met", and pushing before separating them is the same act either way.

**The rule is hardest to apply to a run you are not thinking of as a
proof.** A CHECK-constraint case is obviously a proof and gets the
scrutiny. A test suite is infrastructure you run at the end, so its
result gets read as a verdict rather than as a claim with preconditions
of its own. `pnpm test` asserts nothing about whether the database it
needs is up; it just fails, in the same shape as a real regression.

Third instance this week of the input to a proof being the wrong thing,
and the second to land on the person who had just written the rule
about it. Proximity to the lesson does not prevent it, which is the same
finding the withdrawn stray-project incident records. What that
suggests is that the rule cannot live only as a rule: the runs whose
preconditions matter most are the routine ones, and routine is exactly
where a written rule stops being consulted. A mechanical check that
refuses to report a suite result while the database is unreachable
would cost little and is worth considering on its own merits; it is
named here, not proposed, because this entry is a record and not a
design.

---

### G-73. `main` has no branch protection, so CI green has never been a platform gate; a standing document says it is

Filed 2026-08-26, from the investigation into why PR #195 produced no
`ci` run yet reported `mergeable_state: "clean"`.

**The reading, from primary sources.** Two independent endpoints agree
that nothing gates `main`:

- `GET /repos/lettersrachel/WellKept/branches/main` returns
  `"protected": false`, with `required_status_checks` reading
  `enforcement_level: "off"`, `contexts: []`, `checks: []`.
- `GET /repos/lettersrachel/WellKept/rules/branches/main`, the modern
  rulesets mechanism that can enforce checks while the legacy field
  still reads false, returns an EMPTY LIST. Zero rules apply.

The authoritative `/branches/main/protection` endpoint returns 403 to
this session's token, so the two readings above are what is available
here. They agree, and one of them (rulesets) is not subject to the
legacy field's known blind spot.

**What that falsifies.** `docs/WORK_QUEUE.md`, "Not software" item 0,
reads: "Branch protection: DONE 2026-07-28 (founder; gates and airplane
both required on main). The #60 hole is closed: a PR that never
triggers CI can no longer merge." As of this reading that is false in
both halves. `ci` is not a required check, and a PR that never triggers
CI merges exactly as easily as one that passes it. This is the class
CLAUDE.md's own opening paragraph exists for: a factual claim in a
standing document that loads as premise into every session and that
nothing re-reads critically.

**What it explains.** `mergeable_state: "clean"` on #195 means nothing
is blocking the merge, not that checks passed. With `ci` unreported and
unrequired there is nothing to block, so `clean` is the correct value
and it carries no information about CI at all. Every merge in this
repository to date has been gated by a person reading run results, not
by the platform. Nine PRs merged on 26 August were each read green
before merging, so the convention held; it was a convention.

**What it does NOT explain, and what stays open.** Protection being
absent says nothing about why `ci` stopped producing runs. The last
`ci` run of any kind, repo-wide, is `577666d` on main at 13:03 UTC on
26 August, and two branch pushes plus a PR open since have created
none. Adjacent facts, recorded without a causal claim joining them: the
repository is PUBLIC (`"visibility": "public"`), its `updated_at` is
2026-08-26T13:08:57Z (five minutes after the last run), the `ci`
workflow reports `state: "active"`, `ci.yml` is byte-identical between
`577666d` and the current branch head, it is valid YAML, and its `on:`
block carries no `paths` or `paths-ignore` filter. Something in the
repository's settings changed at 13:08 and CI has not run since. That
correlation is not a diagnosis and is deliberately not written as one.

**Not fixed here, and the reason is that two of the three questions are
not engineering questions.** Whether `main` should be protected is a
founder decision about friction on her own merges. Whether the repo
should be public is a founder decision that Q's clean-history finding
informs but does not make. Only the third, restoring the required
checks once the answer is known, is a settings change, and it must be
designed together with the `on:` block: a required check that never
fires on a docs-only PR blocks that PR permanently. Today `ci.yml` has
no path filter, so requiring `ci` is safe on that axis; adding a filter
later without revisiting the requirement would reintroduce the problem
in the opposite direction.

**The WORK_QUEUE claim is corrected in the same change as this entry**,
per the make-it-true-or-fix-the-file rule. It is corrected rather than
deleted, because the fact that it was believed for a month is the part
worth keeping.

---

**ADDENDUM, same day: the missing `ci` runs are DIAGNOSED, and it is a
fourth control silently not in place.** The five candidates were worked
in order against primary sources.

- **Ruled out, the workflow itself.** `GET /actions/workflows` returns
  exactly one workflow, `.github/workflows/ci.yml`, with
  `state: "active"`. A manually disabled workflow reports
  `disabled_manually` and would have produced exactly this silence; it
  does not.
- **Ruled out, an organization policy.** The repository owner is a
  User, not an Organization, so there is no org-level Actions setting
  to be off.
- **Ruled out, a path filter.** `ci.yml` at `577666d` carries
  `on: push: branches: [main]` and a bare `pull_request:`. No `paths`,
  no `paths-ignore`.
- **Ruled out, the credential.** A push made with a token that lacks
  workflow permission silently creates no run, which is the same
  signature. It is not this: the identity making today's pushes is the
  User `lettersrachel`, and the same login is the `actor` and
  `triggering_actor` on run 490, the last run that fired. Nothing about
  the identity changed.
- **Inapplicable, billing.** The repository is public, and
  GitHub-hosted Actions minutes are free and unmetered for public
  repositories. The billing endpoint is not readable from this session
  in any case.
- **Unreadable from here, a platform incident.** githubstatus.com is
  blocked by the network egress proxy.

**The decisive reading is the check-suite differential.** Every push
creates one check suite per installed app. On `577666d`, the last
commit that ran, there are FIVE: vercel, railway-app, sentry, claude,
and `github-actions` (completed, success, 2 runs). On `da585c5`, the
current head, there are FOUR: vercel, railway-app, sentry, claude.
**No `github-actions` check suite is created at all.** That is not a
queue delay and not a run that failed to start; the Actions app is not
acting on the event for this repository, while four other apps act on
the same commit normally. A platform incident does not selectively skip
one app's suite while creating four others' on the same commit, twice,
thirty minutes apart, across two and a half hours.

**So the only candidate consistent with the evidence is repository-level
Actions disablement** (Settings, Actions, General, "Disable actions").
That is stated as an inference and not as a confirmed reading, because
the confirming endpoint is not available here: this session's agent
proxy refuses `GET /repos/{owner}/{repo}/actions/permissions` with its
own 403 and its own documentation link, which is a proxy policy and not
a GitHub answer. **The founder-side confirmation is one page:** repo
Settings, Actions, General. If "Disable actions" is selected, that is
the cause and re-enabling it restores the runs.

Recorded as a control rather than a glitch, per the same reasoning as
the rest of this entry: with `main` unprotected AND the runner not
running, there is at present NO automated gate of any kind between a
push and production. The two absences are independent and they
compound.

**CONFIRMED at 16:25 UTC the same day, and the confirmation is the
strongest form the inference could have taken.** The founder read the
Settings, Actions, General page and re-enabled Actions. Within one
minute the `ci` workflow fired on the unchanged head `73d67aa`, event
`pull_request`, and both jobs passed (`gates` success, `airplane`
success, run created 16:25:19). No commit, no workflow edit, no
re-push: the only variable that moved was the setting, and the runs
resumed immediately.

That converts this from a diagnosis to a cause. The check-suite
differential predicted something specific and falsifiable, that the
`github-actions` suite would reappear on the SAME commit the moment the
repository-level setting changed, and the prediction held on the first
test. A queue delay, a platform incident, or a credential problem would
each have failed that prediction. It is the same shape as the KEK
validation earning its first real red in production: a claim made from
indirect evidence, then met by the world.

**Kept as written above rather than rewritten**, including the sentence
saying the endpoint was unreadable and the cause was inferred. The
value of this entry is partly that the reasoning is legible without the
answer, since the next time a control is silently absent the confirming
endpoint may be unavailable again and the differential is the technique
that worked.

One reading not established, and it stays open: WHEN and HOW Actions
came to be disabled. The repository's `updated_at` moved at 13:08:57,
five minutes after the last run before the stop, which is consistent
and is not proof. The audit log that would settle it needs a scope this
session does not hold. Left as a known unknown rather than a story.

---

**SECOND ADDENDUM: Actions stopped a SECOND time, seven hours later, by
a different mechanism.** Recorded here rather than as its own entry
because it is the same subject, an Actions configuration silently
gating every merge, and splitting it would scatter one story across two
numbers.

Green through `967c8e3` at 17:23 UTC on 26 August. From 00:32 UTC on 27
August, every run returned **`startup_failure` with ZERO jobs**,
`created_at` equal to `updated_at`, four runs across three commits.
**This is a different signature from the first stop:** there, no
`github-actions` check suite was created at all; here the suite and the
run are created and the run dies before any job exists.

Established: `ci.yml` byte-identical to the last green run; the branch
changed one docs file; the workflow reporting `state: "active"`; one
re-run attempted and refused by GitHub with 403 `Resource not
accessible by integration`, the token lacking `actions: write`.

The diagnosis offered at the time: `ci.yml` depends on
`actions/checkout@v5` and `actions/setup-node@v5`, both owned by the
`actions` org rather than by `lettersrachel`, so an **Actions
permissions** setting narrower than "Allow all actions and reusable
workflows" would block them and kill the run at startup with no jobs.
That is exactly this signature. It was stated as a hypothesis because
`GET /actions/permissions` is refused to this session by its own agent
proxy.

**The founder then updated the Actions policy and the setting now reads
"Allow all actions and reusable workflows."** Two things about that,
stated carefully:

- **The PRIOR value is not recorded.** The screenshot shows the result
  and the "Actions policy updated" banner, not what was selected
  before. So the hypothesis is not confirmed by the change itself.
- **The recovery is the test, exactly as it was for the first stop.**
  A settings change does not re-run a failed run, so the next push is
  what decides it. If `ci` goes green on an unchanged workflow with the
  policy as the only variable that moved, the diagnosis is a cause. If
  it fails again, the diagnosis was wrong and this entry says so.

Twice in one day, by two different mechanisms, an Actions setting
silently stopped every merge gate in the repository, and in neither
case did anything in the product say so. That is the durable finding,
and it is the same one the rest of this entry carries: **the absence of
a control is silent by construction.**

---

**THIRD ADDENDUM, recorded as UNEXPLAINED rather than closed: the stray
project reconfigured itself mid-afternoon and the artifact is now
gone.** Between the Vercel payloads of 15:39 and 15:47 UTC on 26
August, the `well-kept-web` project's build configuration CHANGED: the
later payload carries `"rootDirectory":"apps/web"` and the earlier one
carries no `rootDirectory` at all. Nobody reported making that change.

**It is probably benign.** The likeliest reading is that a
`vercel --prod --yes` or a dashboard action set the root directory on a
project that had none, which is exactly the class of accident
`deploy.sh:278` exists to catch and did not need to catch here, since
the pinned-id checks kept every real deploy on `wellkept`.

**But probably is the whole point of this entry.** The project was
deleted later the same evening, so the deployment history, the build
settings history, and whatever actor record Vercel held are gone with
it. **The question is now permanently unanswerable**, and it is
recorded that way rather than folded into the deletion as though the
deletion resolved it. Deleting the thing that would have answered a
question is not an answer.

Kept because the shape recurs: a configuration changed with no actor
recorded, was noticed, and then the evidence was destroyed by a
remediation that was correct on its own terms. If the same shape
appears again, capture the settings history BEFORE removing the
artifact.

---

### G-74. A register entry is evidence a control was built, never evidence it is still in place

Filed 2026-08-26 alongside G-73, which is its first confirmed instance
and the reason it exists.

**The general form.** This register records that a control was
implemented. It has no mechanism for recording that a control was later
removed, reverted, silently reset by a platform, or never landed in the
first place. So a DONE line is a claim about a past act, and reading it
as a claim about the present state is the same error as reading a
carried-forward test result without checking its baseline commit (the
26 August section 4 correction, recorded in WORK_QUEUE). Both mistake a
dated fact for a live one.

**Therefore: every line asserting a control is in place must be re-read
against the thing itself, not against this register.** A control that
can only be confirmed by reading the document that claims it is not
confirmed at all.

**The re-read, run the day this was filed.** Split by whether the
control is reachable from the build container at all, because that
split is itself the finding: seven of fourteen cannot be checked from
here, which means seven have been carried on the register's word.

FALSE, both already corrected in their own entries:

1. **Branch protection on `main`** (WORK_QUEUE "Not software" item 0,
   asserted DONE 2026-07-28). No protection of any kind; G-73.
2. **The `well-kept-web` Vercel project is dormant** (G-35's premise).
   It rebuilt this branch twice on 26 August and its configuration
   changed between the 15:39 and 15:47 payloads, when a `rootDirectory`
   appeared. Not dormant.

FALSE IN EFFECT, and new here:

3. **The sixteen CI guards are enforced.** Each guard was built and
   proven red and green, and each still passes when run by hand. What
   enforces them on a merge is the `ci` workflow, and no `ci` run has
   been created for any commit since 13:03 UTC (G-73's addendum). The
   guard files are intact; the runner is not running. This compounds
   with item 1 rather than overlapping it: with `main` unprotected AND
   the runner stopped, there is at present no automated gate of any
   kind between a push and production. Two independent absences, and
   neither is visible from any document that claims either control.
   `guards-manifest.test.ts`, the guard whose whole purpose is to
   notice when a guard stops running, cannot notice this, because it
   runs in the thing that stopped.

HOLD, re-read against the system today:

4. `sizes` CHECK: `registry_sizes_not_client_visible` present in the
   database.
5. The one-role unique index:
   `household_role_assignment_user_household_unique` present.
6. The check-15 allowlist is empty, as the 25 August Field Test Home
   entry claims: `const ALLOWLIST = {}` in `tooling/smoke-mechanical.sh`.
7. `ci.yml` still fans out `pnpm test` and `pnpm typecheck`.
8. `erase-household.mjs`'s header still names its DELETE exceptions.

NOT REACHABLE FROM THIS CONTAINER, so asserted-only until the founder
reads them. Listing them is the point: each has been carried on a
document's word for as long as it has existed.

9. `visit_reconciliation` still `{"gapDays": 10}` in production.
10. `flag_promotion.rateThreshold` still null in production, which is
    what keeps promotion from firing.
11. `capacity_gate` still at version 1 with the ruling's figures.
12. The Railway worker still Git-connected and auto-deploying.
13. The production `WK_KMS_KEY` still decoding to 32 valid bytes. Last
    exercised at the seventh run, by the boot validation passing.
14. `seed_reviewed` still false, which is what keeps the standards
    library dark.

**What this entry does not propose.** It does not propose a periodic
re-read ritual, because a ritual nobody runs is another control asserted
and absent. The durable fix is the census pattern already used three
times here: where a control can be READ by a program, a guard should
read it rather than a person remembering to. Items 4 through 8 are
already in that shape. Items 9 through 14 are production state that no
CI job can see, and the honest treatment is the one this entry gives
them: named in a list that says out loud that they are unverified.
Which of them deserve a check is a founder decision about where to
spend the effort, not one to make here.

---

### G-75. The absent control was cited as the reason to skip the check that would have found it absent

Filed 2026-08-27. This is the fifth instance of the week's premise
pattern, and it is filed separately from the other four because it is
not a recurrence. It is the pattern completing a circuit, and the
circuit explains why the other four survived as long as they did.

**The artifact.** `tooling/deploy.sh` carried this comment from round
seven until 27 August, on the named-sha gate:

> Being on origin/main also implies the required checks were green,
> since branch protection refuses the merge without them: the
> check-status half of the brief needs no API call and no token.

Read it as a syllogism and the shape is exact:

1. **Premise:** branch protection exists and refuses un-green merges.
2. **Inference:** therefore a sha on `origin/main` carries green checks.
3. **Conclusion:** therefore this script need not ask whether CI passed.

The premise was false the entire time (G-73: no protection of any kind,
`ci` never a required check). So the conclusion is unsupported. But the
damage is not that one inference was wrong.

**The damage is that step 3 removed the only mechanism that would have
tested step 1.** An API call asking "did `ci` pass for this sha" would
have returned `none` on any commit merged without a run, on any day
Actions was off, and on the very first deploy after the protection was
believed to exist. The check was declined *because of* the control, and
the check was the thing that could have revealed the control was
absent. That is a closed loop: the absence justifies not looking, and
not looking preserves the absence.

**Why this is worth its own entry.** G-74 says a register entry is
evidence a control was built, never that it is still in place, and
prescribes reading the system instead of the document. That is
necessary and it is not sufficient, because it assumes someone goes
looking. A circuit is what removes the reason to look. The four earlier
instances each had a moment where someone could have checked and had no
particular prompt to; this one had a comment in the deploy path
explaining, persuasively and in writing, why checking was unnecessary.

**The general form, and it is a design rule rather than a habit:**

> When a control is the reason a check is skipped, the skipped check is
> usually the cheapest test of that control. Cite a control to explain
> what a check is FOR, never to justify not performing it.

**Fixed in the same change.** The comment is corrected in place, naming
what it used to claim, and the CI gate now performs the half the
comment described as free. It computes its own input and fails closed
on every unclear answer. Selftest 14/14, with the real API path
exercised separately against four live shas.

**Not claimed:** that the circuit was noticed by insight. It was found
while building the check the comment said was unnecessary, which is the
same accident that found the other four. Nothing structural currently
finds a circuit; the rule above is the only defence, and it is memory.

**THE BASE RATE, stated as a number because a future reader weighing
whether a check is worth building needs one and not an intuition.**
Five controls were found absent in the week of 26 August:

| Control | How it surfaced |
|---|---|
| Branch protection on `main` | while investigating why a PR showed `mergeable_state: clean` with no run |
| The `well-kept-web` project's dormancy | while reading PR event payloads for something else |
| Actions, first stop | while waiting for a merge that never went green |
| Actions, second stop | while waiting for a different merge |
| The `deploy.sh` check-status comment | while building the check it said was unnecessary |

**Five out of five surfaced as a side effect of doing something else.
Zero were found by looking.** Nobody audited, and no scheduled review
would have run in that window anyway.

That is the argument for structural controls over attentive people, and
it is not a claim that the people were inattentive. The same week
produced sixteen CI guards, a computed copy census, and a
verify-then-merge protocol, all built by paying attention. Attention
was abundant. It still found nothing by looking, because looking
requires a prompt, and an absent control is precisely the thing that
emits no prompt.

**So the operative test when deciding whether to build a check is not
"would we notice this?" It is "what would make us look?"** If the answer
is a person happening to be nearby, the base rate above says the honest
expected detection time is however long until the next unrelated
investigation touches it. For branch protection that was a month. For
the first Actions stop it was ten hours, and only because someone was
actively merging.

---

### G-76. The copy census walked a directory a test writes into, and vitest runs files in parallel

Filed 2026-08-27, found while eliminating a candidate for an
unreproduced failure rather than by looking for it (the G-75 base rate,
sixth instance).

**The mechanism.** `provisional-markers.test.ts` proves itself against
real files on disk: it writes `__tmp_marker_*.ts` INSIDE
`packages/schema/src`, scans them, and unlinks them in a `finally`. That
has been safe since it was written, because nothing else walked that
directory.

The copy census's **channel rule**, added 26 August, walks `apps`,
`packages` and `services` for `.ts` files and `readFileSync`s each one.
Vitest runs test FILES in parallel by default and this package has no
config overriding it. So a `__tmp_marker_*.ts` enumerated by `readdir`
and unlinked before the census reads it throws `ENOENT`, failing
`client-copy.test.ts` for a reason that has nothing to do with copy.

**Introduced by the census itself.** The older test did not become
wrong; the new guard reached into a directory that was never meant to
hold stable files. A guard's scope is not only what it checks, it is
what it touches.

**Fixed by excluding `__tmp_` by NAME PATTERN**, not by catching the
read error. Swallowing `ENOENT` would also hide a real file
disappearing, which is a defect the census should report rather than
absorb. Proven: a planted `__tmp_marker_probe_race.ts` is excluded by
the predicate, and the suite stays green.

**What this does NOT explain.** The unreproduced failure of 27 August
was a two-file invocation, `guards-manifest.test.ts` plus
`client-copy.test.ts`. `provisional-markers.test.ts` was not running,
so this race cannot have caused it. That failure remains OPEN with two
candidates now eliminated: a concurrent writer of CLAUDE.md (there is
none in repo code; one reader, zero writers) and this race. Recorded so
it does not age into resolved by silence.

---

### G-77. The completeness survey counted renders and the thing at risk was columns, so its number was wrong in the reassuring direction

Filed 2026-08-27, from the systems-schema read. Fifth instance of the
count problem this week, and **the first produced by a survey whose
stated purpose was completeness.**

**What the survey said.** The G-61 class re-verification of 25 August
surveyed the zoned date renders, found ten, traced every one to a true
instant, and concluded the entry's exactly-two-members claim survives
with **ONE LATENT MEMBER**: `registry_entry.key_date`, timestamp-typed
like the broken pair but protected because seed scripts stamp noon UTC.

**What is actually true.** `RegistryCard.tsx` formats THREE date-only
columns through one Eastern-pinned helper: `key_date`, `installed_at`,
and `last_serviced_at`. The survey enumerated render SITES and reported
a count of COLUMNS. RegistryCard is one site, so it contributed one to
the tally, and the two extra columns behind it were never counted.

**And the protection did not cover them.** Read against the seeded
database: `key_date` is stamped 12:00, `installed_at` and
`last_serviced_at` are stamped **00:00**. The noon convention that made
`key_date` safe was never applied to the other two, so the defect was
not latent at all. It was rendering one day early, on the corporate
drill-in and on the CLIENT playbook, on seeded values, the whole time.
Proven red and green on the real render path; fixed in the commit
beside this entry.

**Why the direction matters.** The error was not random. Counting sites
while reporting columns can only ever UNDERCOUNT, because one site can
carry many columns and no site carries fewer than one. So the mistake
made the system look safer than it was, and it did so inside a document
whose entire job was to establish that nothing had been missed. A
survey that undercounts is worse than no survey, because it closes the
question.

**The rule this joins.** CLAUDE.md already carries "no count is written
where it can be computed", from three prior instances. This adds the
second half:

> **State the unit, and check that the unit you counted is the unit at
> risk.** A survey reporting a count must name what it enumerated, not
> only what it concluded. "Ten renders, therefore two members" is a
> claim with a hidden conversion in it, and the conversion is where the
> error lives.

**What would have caught it.** Nothing that existed. The columns are
discoverable from the schema (`timestamp` columns fed by date-only
facts) and the render sites are discoverable from the source, so the
census shape applies: derive the date-only column set, require each
render of one to be UTC-pinned or excused in writing. That is proposed
as its own session and deliberately NOT built here, since it is a guard
and guards get proven in both directions before they are trusted.

**Base-rate note (G-75):** this one also surfaced as a side effect,
while reading the schema for an unrelated systems-import question.
Nobody re-read the survey. Sixth of six.

---

### G-78. The client projection is default-open at the column level: every new column reaches the member unless someone remembers to filter it

**CORRECTED THE SAME DAY IT WAS FILED, 27 August 2026. The measurement
below is wrong and the fix it recommends is withdrawn.** The original
text is left standing rather than rewritten clean, the way the withdrawn
stray-project incident is kept: how the claim came to be written down is
the part worth having. Read the correction at the end of this entry
before acting on anything above it.

Filed 2026-08-27, found while adding columns in migration 0058. Caught
that time because the new columns were obviously internal. The next set
may not be.

**The mechanism.** `getRegistries` reads with a bare `db.select()`,
which takes every column of `registry_entry`, then filters with
`readDecision(role, r.sensitivity)`. That filter drops ROWS whose
sensitivity the role may not read. It does nothing about columns. So
adding a column to a table a client can read publishes it, and the
publishing is the default rather than the decision.

**Three mechanisms exist and none of them sees a new column.**

| Mechanism | What it actually does | New column? |
|---|---|---|
| `readDecision(role, sensitivity)` | drops rows by row sensitivity | invisible |
| `filterFields(role, fields)` | drops rows by row sensitivity (`continue`) | invisible |
| `assertClientPayloadSafe` | rejects KNOWN staff-only signatures | invisible |

The payload guard is the closest thing and it asks a different
question: it knows the shapes that must never appear, so it catches a
`recordedBy` or a `decidedBy`, and a column invented tomorrow matches
nothing it knows.

**The size, measured rather than estimated.** The client playbook reads
through six functions. Three take every column
(`getRegistries`, `getFields`, `getPendingEdits`) and three do not.
**Two of the six already use explicit column lists**
(`getStewardship`, `getClientDeferrals`), so the correct pattern is
already in the codebase and the outliers are the exception rather than
the rule.

**Why this is the wrong direction for a household record.** Everything
else here fails closed: a blank sensitivity fails closed in
`readDecision`, the vault refuses without an audit row, the erasure
tool refuses on an open incident. A projection that publishes by
default is the one surface where forgetting has a permissive outcome.
It is also the same shape as an access register that records who holds
a key and has no revocation trigger: the additive act is easy and the
subtractive one depends on somebody remembering.

**Cheapest fix, reported and NOT built.**

1. **Bring the three outliers into line with their two siblings**:
   explicit column lists at the three client-reaching reads. This flips
   the direction at the earliest possible point, because a new column
   then requires an affirmative act to reach a member. Three functions,
   no new machinery, no new concept, and the pattern is already here to
   copy.
2. **To make it STAY flipped, a guard**: no client-reaching read uses a
   bare `.select()`. The "client-reaching" set is derivable, unusually
   for this codebase, because the client route group is a directory:
   walk `(client)`, collect what it imports from `data.ts`, assert each
   uses an explicit column list or is excused in writing. That is the
   census shape and it is cheap here precisely because the input is a
   directory rather than a judgment.

Step 1 alone is worth more than step 2 and should not wait for it. Step
2 without step 1 protects nothing.

**Not built, deliberately.** Step 1 touches three client-facing reads
and would need the payload guard exercised against each; that is its
own session with its own proofs, not a rider on a migration that is
already doing four things.

**Base rate (G-75), seventh of seven:** found as a side effect of adding
columns, not by anybody auditing projections.

#### Correction, 27 August 2026: the measurement, and the fix it recommended

**What the entry claimed**, kept visible above in its own words: "The
client playbook reads through six functions. Three take every column
(`getRegistries`, `getFields`, `getPendingEdits`) and three do not. Two
of the six already use explicit column lists (`getStewardship`,
`getClientDeferrals`), so the correct pattern is already in the codebase
and the outliers are the exception rather than the rule." And its step
1: "Bring the three outliers into line with their two siblings: explicit
column lists at the three client-reaching reads."

**What is actually true, read from the tree rather than from the query
layer alone.**

| Read | Query | Does every column reach the member? |
|---|---|---|
| `getFields` | bare `select()` | **No.** The playbook projects at the call site to six named fields, then runs three live assertions over the projected array |
| `getPendingEdits` | bare `select()` | **No.** The result is reduced to a `Set` of `fieldId` before anything renders |
| `getRegistries` | bare `select()` | **Yes, it was.** Passed whole into `<RegistryCard entries={...}>`. Already closed by 0058, which nulls the six assessment and capture-pass columns when `role === "client"` |

So the three was a count of BARE QUERIES. The thing at risk is payloads
that reach a member, and there was exactly one, which the migration this
entry was filed beside had already closed.

**The "correct pattern already in the codebase" half does not survive
either.** `getStewardship` and `getClientDeferrals` have one caller
each, the client playbook. `getFields` has six callers, `getRegistries`
five, `getPendingEdits` two. Those two are not a pattern the others fail
to follow; they are single-purpose client reads, which is exactly why an
explicit column list fits them and says nothing about a read five staff
surfaces share. There was no outlier to conform.

**The founder's ruling, which replaces the recommended fix.** The
invariant is **projection at the boundary, not explicit column lists at
the query.** `getFields` and `getRegistries` are both already correct
under it, and shared reads are not to be narrowed. Narrowing a read that
six surfaces use, five of them staff, to fit the one client surface,
moves the constraint away from where the risk lives and buries a client
rule inside a staff query.

**The corrected finding, which is narrower and harder than the one
filed.** One default-open read existed and is closed. What remains is
that **nothing enforces projection before a shared read crosses to a
member.** The projection on the playbook is a thing a person wrote and
the next person can forget, and `assertClientPayloadSafe` cannot cover
for that, because it is a known-bad-signature check: it knows the shapes
that must never appear, so a column invented tomorrow passes it
unnoticed. The guard shape is proposed separately and is deliberately
not built here.

#### The unit error, recorded rather than absorbed

**I counted queries and reported exposure.** Different units, and the
conversion between them is the call site, which is precisely where the
answer was. **Filed one day after G-77**, which is an entry about this
exact mechanism, written by the same session, and the rule it added to
CLAUDE.md ("state the unit, and check that the unit you counted is the
unit at risk") did not fire on the next survey I wrote. So the honest
reading is that writing a rule down is weaker evidence of having learned
it than it feels at the moment of writing.

**Second instance in two days**, and the two point in OPPOSITE
directions, which is worth stating precisely because it was put to me as
though they matched:

| Entry | Counted | Reported | Direction |
|---|---|---|---|
| G-77 | render sites | columns at risk | UNDERCOUNT. Made the system look safer than it was, inside a document whose job was completeness |
| G-78 | bare queries | payloads reaching a member | OVERCOUNT. Three claimed, one real |

**Reported and not reconciled**, per the standing doctrine: the founder's
instruction for this correction characterized both instances as
inflating the problem. G-77 as written says the opposite of that in its
own heading ("wrong in the reassuring direction") and in its body ("made
the system look safer than it was"). Both are recorded here as they
stand rather than one being edited to agree with the other.

The generalization that does hold across both is not the direction, it
is that **a hidden unit conversion inside a number carries no marker at
all.** Undercounting closes a question that should stay open;
overcounting sends work at a problem that is not there. Neither reads as
uncertain on the page, and that is the shared failure.

**And this one propagated rather than sitting inert.** The recommended
fix was endorsed downstream on the strength of the unmeasured claim, and
came back as an instruction to bring three client-reaching reads into
line. Had the diff been produced on the order rather than the
measurement being checked first, two shared staff reads would have been
narrowed to satisfy a count. A wrong number in a register entry is not a
private error: this register is read as premise.

**Base rate (G-75), eighth of eight:** the correction itself surfaced as
a side effect of being ordered to implement the fix, not from anybody
re-reading the entry. Same shape as G-77's own base-rate note, one day
later.

#### Precision on the correction, same day, before it was acted on

Two claims in the correction above did not survive the read that the
guard proposal required. Left standing and corrected here, same
discipline as the correction itself.

**1. The wrong function was named.** The correction says
`assertClientPayloadSafe` is "a known-bad-signature check". It is not.
Read at `packages/permissions/src/index.ts:143`, it asserts that every
row in the payload carries a KNOWN sensitivity and that the sensitivity
is `s1`. It inspects one key per row and nothing else. The
known-bad-signature checks are its two neighbours,
`assertNoProvisionRows` and `assertNoAnticipationRows`, which recognize
provision ids and anticipation column pairs however deeply nested. The
conclusion is unchanged and is if anything firmer: **none of the three
sees a new column**, the first because it reads only `sensitivity`, the
other two because a column invented tomorrow matches no signature they
know.

**2. "Yes, it was" overstated the registry exposure.** The correction's
table says every column of `registry_entry` reached the member through
`getRegistries`. What is actually true: the rows are passed whole into
`<RegistryCard entries={...}>`, and **RegistryCard is a server
component** (no `"use client"`, imports one type, renders no nested
component) inside a server-component page. It renders none of the eight
columns 0058 added. So those columns were composed into a payload object
that never left the machine. The accurate statement is that
`getRegistries` was default-open **at the payload**, and the last mile
that turns a payload into exposure, a render or a `"use client"` prop
crossing, did not exist for those columns.

**This does not change 0058 and does not reopen the ruling.** Nulling
the six working-note columns for `role === "client"` is still right and
is still what was ruled on. What changes is the justification: it is
defense in depth at the boundary, not the closing of a live leak. Saying
so matters because "a live leak was closed" and "a latent one was made
structural" carry different urgency for everything queued behind them.

**Third instance in three days, same shape.** G-77 counted render sites
and reported columns. G-78 counted bare queries and reported payloads
reaching a member. This one counted payload composition and reported
exposure, when the unit at risk is what a member can actually receive,
which on a server-rendered page is the HTML and nothing else. Each time
the reported unit sat one conversion away from the unit that mattered,
and each time the conversion was invisible on the page. **The one
difference worth keeping:** this one was caught by checking a premise
before writing the next thing on top of it, rather than by being ordered
to implement it. That is the cheapest place any of the three was ever
going to be caught, and it is the only one of the three that cost
nothing downstream.

#### FIXED, 27 August 2026: the shape assertion ships as the seventeenth guard

`assertDeclaredClientKeys` (packages/permissions) plus
`client-payload-shape.test.ts` (packages/schema). A member-reaching
payload may carry only the keys declared for it; anything else throws.
The declared registry list is asserted against `registry_entry`'s own
columns with a written-exclusion hatch, empty today, so a migration that
adds a column fails CI until somebody decides whether a member may see
it. Both blessed projections pass unchanged: the allow-list literal and
the spread-with-deny-list.

**Proven in four directions, preconditions first** (the assertion is
exported, the column derivation clears a floor of 20, and no database is
involved, said plainly so a green run here is not read as evidence about
one):

1. A simulated migration 0059 column added to `tables.ts` turned the
   census red AND made the runtime assertion fire through the
   schema-derived payload, which is the real input rather than a fixture.
2. The assertion call deleted from the page turned the wiring test red.
3. **The live data path, which is the strongest of the four:** with the
   undeclared key added to `getRegistries`, the running dev server threw
   `undeclared key "installerPhoneNumber" reached a client payload at
   registry entries[0]` and the client playbook refused to render rather
   than publishing it. Restored, and the journey passes again.
4. Green on the unmutated tree throughout, and the full suite plus 26
   e2e journeys.

**One asymmetry worth recording, because it bounds the guard's value.**
The guard bites on the SPREAD projection and is redundant on the
allow-list literal, which cannot grow a key on its own whatever the
declared list says. So the protection is concentrated entirely on the
deny-list shape, which is also the shape that produced the finding. It
is wired on both so neither payload depends on a reader knowing which
syntax is at which call site.

**The residue is recorded at the guard**, in the function's own comment,
the test header, and the CLAUDE.md table's not-covered column, rather
than here where it would be read separately from the thing it qualifies.
The short form: this checks which keys may be PRESENT, never what a
permitted key CONTAINS. A staff-only fact typed into a correctly
client-visible column reaches the member and nothing in this system
catches it.

---

### G-79. The endpoint that answers "is this branch protected" depends on how it was protected, and each one alone can answer wrongly in both directions

Filed 2026-08-27, from applying G-74's own rule to branch protection on
the day it finally landed. Not a defect in the repository: a defect in
the CHECK that G-73 and G-74 left behind.

**The reading.** Protection is now in force on `main`, and the classic
branch endpoint says this about it:

```
GET /repos/lettersrachel/WellKept/branches/main
  protected: True
  required_status_checks.contexts: []
  enforcement_level: off
```

Read alone, that is a branch with protection configured and enforcing
nothing. It is also, word for word, the shape Gate 3 was written to
refuse ("empty contexts with `protected: true` does not clear the
gate"). The truth is the opposite: the rules endpoint carries ruleset
21654765, `enforcement: active`, `bypass_actors` empty, requiring
`gates` and `airplane` BY NAME on integration 15368 with
`strict_required_status_checks_policy`, plus `pull_request` and
`non_fast_forward`.

**The mechanism.** Classic branch protection and rulesets are two
systems. The classic endpoint does not project ruleset rules into its
own `contexts` array, so a ruleset-protected branch reads as
protected-but-empty there. The failure runs both ways:

| Endpoint | Can wrongly say NOT protected | Can wrongly say protected |
|---|---|---|
| `/branches/main` | yes, when a ruleset holds it (today) | yes, `protected: true` with nothing enforced |
| `/rules/branches/main` | yes, when CLASSIC protection holds it | no |

So **neither endpoint alone answers the question**, and the correct
check is both, every time. G-73's August reading happened to be right
because it checked both and found the rulesets list empty as well. That
was thoroughness, not a rule, and a rule is what this entry adds.

**The generalization, which is the part that outlives this API.** G-74
says a register entry is evidence a control was built, never evidence it
is still in place, and the remedy was "read the endpoint". This is the
next layer down: **an endpoint is a view, and a view has a scope.**
Reading one and treating its silence as absence is the same error as
reading a document and treating its claim as fact, one step closer to
the machine and therefore more convincing. When a control can be
implemented two ways, "I checked" means checking for both
implementations, and a verification that names only one is incomplete
even when it happens to return the right answer.

**Where this lands.** WORK_QUEUE "Not software" item 0 now closes on
both readings, and its own text carries the instruction to re-read it
against both endpoints rather than against its paragraph.

**Base rate (G-75), ninth of nine:** found while verifying something
else, on the way to a merge. Nobody was auditing the verification
method; it just failed to match what the founder had already
confirmed, and the mismatch was the signal.

---

### G-80. Protection earned a real red on its first pull request, on a change reported green

Filed 2026-08-27, the same afternoon, and kept as a short entry because
the value is the fact rather than the analysis.

#203 reached the gate at `a259749` and `gates` FAILED: three `tsc`
errors in `client-payload-shape.test.ts`, the seventeenth guard's own
test file, in a change reported here as proven in four directions with
the full suite green.

**The suite WAS green. Vitest does not typecheck.** The miss was
process: `packages/permissions` and `apps/web` were typechecked and
`packages/schema` was not, which is the one package the new file was
in. A green test run said nothing about it and was read as though it
did.

**Why it belongs in the register rather than only in a commit
message.** Under the convention that stood until this morning, that
merge would have gone in, because the convention was a person reading a
summary and the summary said green. The control that caught it had
existed for under an hour. This is the KEK-validation pattern exactly:
a guard proven red and green in a container is worth something, and a
guard that refuses something real on its first day is worth more.

**The lesson that transfers:** "the suite is green" and "the change
compiles" are different claims, and the first is routinely offered for
the second. Typecheck the package you added a file to, by name, and do
not let a passing runner in a sibling package stand in for it.

**Addendum, on the mechanism rather than the incident.** Vitest does not
typecheck. It transpiles and runs, so a suite can be green on code that
does not compile, and the greener the suite the more confidently the
wrong conclusion is drawn. The package that gained the new file was the
one package never typechecked, which is not a coincidence: the packages
I chose to check were the ones I had EDITED existing files in, and the
new file felt like it belonged to the guard rather than to a package.

**And the gate was never the problem.** Confirmed by reading `ci.yml`
and `turbo.json`: the `gates` job runs `pnpm typecheck` at the root,
which is `turbo run typecheck`, fanning out to every package carrying
the script. Eleven ran on the failing run and eleven ran on the fixing
one. So CI checks all of them and always would have; the miss was
entirely local, in running per-package filters instead of the root task.
**The local rule is therefore: run `pnpm typecheck` at the root, not
`pnpm --filter <pkg> typecheck`.** A filter encodes a guess about which
packages a change touched, and that guess is exactly what was wrong.

**One real gap found while confirming it. RESOLVED 27 August, founder
ruling.** Three workspace packages carried NO `typecheck` script, so
nothing typechecked them anywhere: `@wellkept/e2e`, `@wellkept/export`,
and `@wellkept/security-tooling`.

`@wellkept/e2e` now has one, and the root fan-out is twelve rather than
eleven. **This is the same shape as vitest not typechecking, one layer
out:** the journeys are TypeScript and ran under Playwright's own
transpile, so a type error in a spec was invisible until that spec ran,
and the journeys could rot silently between runs.

**What its first run found, reported exactly:** 16 errors across 5 files
(`airplane`, `floor-bypass`, `journeys`, `partb-rehearsal`,
`playwright.config`), and **every one was a missing type declaration
rather than a defect in the spec logic**: `process`, `Buffer` and
`node:crypto` unresolved, and `pg` implicitly `any`. Fixed by adding
`@types/node`, `@types/pg` and `typescript` as devDependencies at the
versions the rest of the workspace already pins, plus a `tsconfig.json`
extending the base. No new library enters the project and no spec was
edited. Zero errors after.

`@wellkept/export` and `@wellkept/security-tooling` are **NOT given
one**, and the reason is that a `tsc --noEmit` there would check
nothing. Each is a single plain-JavaScript `.mjs` file
(`wk_playbook_export.mjs`, `authz-probe.mjs`), run by hand through its
own `pnpm` script, imported by nothing anywhere in the tree (verified by
search). A typecheck script over them would pass vacuously, which is the
guard-that-checks-nothing shape the census floors exist to prevent.
Type-checking them at all would mean `allowJs` plus `checkJs`, a
different and larger decision about whether the operator scripts should
be TypeScript, and it is not made here.

Fixed at `f5ab83d`; both jobs green; merged as `324b2931` through the
verify-then-merge script, which bound the sha it verified to the sha it
merged.

---

### G-81. A suppressed client email is visible only in a log nobody reads

Filed 2026-08-27 with the Step 5a assertion, as its own known gap rather
than as a caveat inside it.

**The mechanism.** The client visit report now refuses to send when the
payload does not carry exactly three non-empty sentences (the close-flow
contract, enforced at the boundary because the state machine that owns
it runs client-side and this route validates no shape at all). The
founder ruling is that a refusal must NOT throw: `applyVisitCommand` has
already committed by then, so throwing would hand the HOM a false
failure and make the offline queue retry a landed write. The record is
the record.

**So the refusal is a `console.error` and nothing else.** It names the
household, states that the visit stands, and states that no email was
sent. That is the loudest thing available to it, and it is still a log
line in a serverless runtime that no operator opens.

**Why this is the G-29 shape again, one surface along.** G-29 was about
an operator unable to tell "declined" from "down". G-68 was the same
reasoning in the success direction: an action that wrote and said
nothing. This is the third: a MEMBER-facing thing that did not happen,
where the person who would care is a corporate operator and the person
who caused it is a HOM who has already walked out of the house. Nobody
learns. The member simply never gets an email, which is
indistinguishable from a quiet week.

**A surface exists and is NOT wired, deliberately.** The corporate board
at `/oversight/board` already renders an exception queue of open
`attention_record` rows with household, age, and seen/unseen, and the
notification firewall already carries a `corporate_queue` destination
for exactly this class of noticing. Writing an attention record from the
mail path would put a suppressed send in front of the one person who
should see it, using machinery that already exists and needs no
migration.

**RULED AND WIRED, 27 August 2026, narrowly.** A client-facing send that
the system itself refused now raises an `attention_record` with
`audience: corporate`, routed by `destinationFor` (never a literal) to
`corporate_queue`, where the board's exception queue already renders it
with household, age and seen/unseen. No migration: `source_kind`
`system` with a null `source_id` is already in the CHECK's vocabulary,
and nulls never collide in the `(source_kind, source_id)` unique index,
so each suppressed send is its own row, which is right because each one
is a separate thing a member did not receive. The reason is STRUCTURAL
and never carries a report sentence: the sentences are the member's own
content, and a message names what happened, never a value (G-68's rule).
Recording is best-effort like the send it reports on, since
`applyVisitCommand` has already committed.

**This is a SCOPED EXCEPTION to the standing posture, not a precedent
for routing decisions being made in engineering.** The posture is
unchanged and still governs: it is why the capture router does no
keyword or severity routing, why nothing reaches `immediate_interrupt`,
and why the firewall shipped a deliberately conservative v1. The
exception was granted for one stated reason, and the reason does not
generalize: **the failure is invisible by construction.** A member who
receives nothing cannot distinguish a suppressed send from a quiet week,
and neither can anyone else, so no rule set can ever be written about an
event nobody can observe. Where a founder rule set CAN be written later,
the posture applies unchanged.

**The boundary, written where it can be enforced rather than remembered
(the module's own header, and asserted in tests):** one trigger, a send
this system decided not to make. NOT delivery failures, NOT bounces, NOT
vendor or provider errors, which are things that happened TO a send we
chose to make and already surface as thrown errors at the mail seam. No
adjacent event class joins because it fits the same plumbing. When a
broader capture-router ruling exists, this folds into it; it does not
stand in for one.

**Proven both directions.** Green against a real database, with the
liveness precondition asserted first: the row lands open, audience
corporate, destination corporate_queue, source id null, reason
structural, and its `attention_record.opened` event carries ids only.
Red twice: routing to the HOM brief instead failed both the integration
assertion and the narrowness assertion, and making the recorder throw
instead of logging failed the best-effort case with a real FK refusal.

**Base rate (G-75), tenth of ten:** surfaced by building the assertion,
not by anybody asking what happens when a guard refuses.

---

### G-82. A check that a value is LEGITIMATE is not a check that it is CURRENT, and the two feel identical when both pass

Filed 2026-08-27, found by the founder while reading the deploy
instructions written the same afternoon, against a real checkout.

**The hole.** `deploy.sh` made two checks on the named sha, and both were
correct:

```
git merge-base --is-ancestor "$FULL_SHA" "$MAIN_REF"   # any ANCESTOR passes
[[ "$HEAD_SHA" == "$FULL_SHA" ]]                       # local HEAD must match
```

Nothing compared it to the TIP. Run `deploy.sh a538ace` from a checkout
sitting at `a538ace` and both pass, because it genuinely is on
`origin/main` and it genuinely is HEAD. It is also **thirteen commits
behind**. The deploy would ship thirteen commits of stale code through a
green gate, and step 7's three build-id reads would then confirm the
wrong sha, correctly, three times over.

**Why the shape is worth naming rather than just patching.** This is
"'already up to date' is not confirmation" in a new place. The gate
established PROVENANCE (this sha is real, merged, and checked out) and
was read as establishing CURRENCY (this sha is what we want to ship).
Both feel like the same reassurance at the moment they pass, and the
difference only becomes visible when the answer is wrong.

> **The general form: a check that a value is LEGITIMATE is not a check
> that it is CURRENT.** Ancestry, membership, well-formedness, signature,
> and existence are all legitimacy. Freshness is a separate question with
> a separate answer, and a passing legitimacy check is exactly what makes
> nobody ask it. Where a value can go stale, name the currency check
> separately or state in writing that staleness is acceptable.

The same sentence covers the variants already in this register: a pull
that succeeds against a `main` not yet carrying the change (legitimate
pull, stale result); `/api/build-id` serving one stale reading
mid-alias-flip (legitimate response, stale value); and a
carried-forward section 4 pass describing an older build (legitimate
result, stale subject).

**The fix, and why it warns rather than refuses.** Deploying an older sha
is a legitimate rollback, and a gate that refused it outright would be
worked around within a week, so the refusal is the default and
`--rollback` is how a deliberate rollback says so out loud. It states
the gap concretely: the commit count behind, and the tip's sha. Two
riders the founder specified:

- **`--rollback` on the current tip REFUSES.** Passing the flag and
  hitting the tip means somebody believed they were going back and were
  not, which is a false belief about which code is shipping, and this
  gate exists to prevent exactly that in either direction.

  **This is a CORRECTION to the original instruction, not a fresh
  decision, and the weaker call was the founder's own.** Her first
  instruction was "say so": warn and proceed. She corrected it the same
  day, reasoning that the gate treats a false belief about which code is
  shipping as serious enough to interrupt in the stale direction, and
  that someone passing `--rollback` on the tip holds the same false
  belief pointed the other way. **The practical asymmetry settles it:**
  refusing costs one re-run without the flag; proceeding costs an
  operator who believes a rollback happened and reasons from that belief
  afterwards, which is the shape of most entries filed this week.

  Recorded this way deliberately. A register that shows only the final
  call reads as though the right answer was obvious, and the useful
  information is that the weaker version was stated first, by the person
  with the most context, and corrected within the hour on a second
  reading.
- **The tip is read from the ref this script FETCHED**, never from
  whatever a stale remote-tracking ref held. A currency check reading a
  stale ref would inherit the exact defect it exists to catch, which
  would have been a fine joke and a real outage.

**Proven in four directions plus the real input.** Selftest cases 15-18
(the file is now at eighteen, with the tally derived from the case
numbering as the count rule requires): preconditions, stale-without-flag
refused, stale-with-flag accepted, tip bare accepted, and tip-with-flag
accepted WITH the not-a-rollback notice asserted on the message rather
than the exit code. Then the real input, because a sentinel proves the
logic and not the input: run against `a538ace` from a worktree checked
out at `a538ace`, the gate refused and computed **13 commits behind**,
matching the founder's independently derived count, and the same run
with `--rollback` proceeded past it.

#### The proof errors, which are the more useful half of this round

Three instances, all in the INSTRUMENT rather than in the thing being
measured. Stated as instances rather than as an aside, because that is
now the dominant category: the gate itself was correct on its first
write, and every error made proving it was an error about the proof.

**Instance 1. A consistent rename is not a mutation of behavior.** One
deliberate break renamed `is NOT CURRENT` to `is NOT CURRENTX`
EVERYWHERE, including the selftest's own grep target. The gate kept
working with different wording, the suite passed, and for a moment that
read as a precondition failing to fire. Changing every occurrence of a
string changes wording and leaves behavior intact. **"Confirm the break
landed" has to mean confirming the BEHAVIOR changed, not that the text
did**, which is a harder thing to check and therefore the thing that
gets skipped.

**Instance 2. A guard that reads the file it lives in must not match its
own text.** Case 15 originally ran `grep -q "is NOT CURRENT" "$0"`, and
that assertion line itself contains the string, so it matched itself and
could never fail: a vacuous precondition written to prevent vacuous
cases. Deleting the gate entirely left case 15 GREEN.

**And case 16 caught the deletion instead, which is the argument for the
four-direction discipline.** The individual case failed and the redundancy
did its work. That is what having four directions is FOR, and it is the
first time in this register that the redundancy can be shown paying for
itself rather than asserted to. A single case, however carefully written,
is one thing that can be wrong; four cases pointed at the same mechanism
from different sides survive one of them being wrong.

**Instance 3, the same error again, twice more, in the check written to
catch it.** While proving the corrected refusal, the landed-check
`grep -c 'fail "--rollback was passed'` reported the runtime refusal
still present after two mutations that had removed it. It was matching
case 15's own assertion line, which quotes the refusal text. Third
occurrence of self-matching in one session, in the instrument built
because of the first two. Corrected by printing the actual matching
lines with numbers rather than a count, so the two sites are visibly
distinct.

Isolating case 18 needed a fourth attempt for the same reason: removing
the refusal fires case 15 first, and changing `fail` to `echo` also
fires case 15, because that precondition checks for the refusal
specifically. The mutation that isolates case 18 keeps the refusal text
intact and makes its branch unreachable. **The general lesson is that a
layered proof needs mutations designed for each layer**, and a mutation
that trips an earlier layer proves the earlier layer, not the one you
aimed at.

**Why this category matters more than the defect it found.** A wrong
instrument does not fail loudly. It reports the answer you expected,
which is exactly when nobody looks again. Every instance above produced
a GREEN or a plausible-looking result, and each was caught only by
someone asking a second question about a run that had already answered
the first.

**Base rate (G-75), eleventh of eleven:** found by a person reading
prose written for a different purpose, not by a check. The instructions
were being written to explain the gate; explaining it is what exposed
what it did not do.

---

### G-83. A guard can pass for reasons unrelated to the question it appears to answer, and no mutation could have turned it red

Filed 2026-08-27, from the founder's own question after the fourteenth
deploy: migration 0058 added eight columns and two foreign keys to tables
the erasure tool already handles, `erasure-coverage.test.ts` passed on the
merge, so was the treatment covered or did the columns not trigger it?

**Neither. The guard cannot see columns at all.** It reads `tables.ts`,
splits on `export const \w+ = pgTable("(\w+)"`, and asserts each table
NAME appears in `erase-household.mjs`. There is no column logic in it.
`capture_artifact` and `visit_photo` were both already named, so the guard
returned green **and would have returned green had nobody considered the
new columns at all.** Its result on this merge carries no information
about them.

**This is worse than a proof that reports the right answer for the wrong
reason, and the difference is worth being precise about.** G-72's class
is a proof whose preconditions were not asserted, so a case passed that
should have failed. Those are at least falsifiable: mutate the thing and
the proof goes red. Here **no mutation existed that could have turned this
guard red**, because the property it checks (is the table named) was
already true and is independent of the property being asked about (is the
new column's treatment correct). A guard that cannot fail on a question is
not weak evidence about that question; it is no evidence, and it reads
identically to strong evidence on the CI summary.

**Which control actually did the work, since only one of the two will fire
next time.** The treatment WAS decided, correctly, by a person under the
same-PR legal-and-erasure rule, and written into the erasure tool's own
header:

- the eight new `registry_entry` columns are cleared with the entry, and
  **each whole-or-absent group is cleared AS A GROUP so the CHECKs survive
  erasure**;
- `visit_photo.registry_entry_id` and `capture_artifact.registry_entry_id`
  are KEPT, reasoned: the link is skeleton rather than content and points
  at a `registry_entry` the same pass tombstones and blanks, so it can only
  ever resolve to `[erased]`, and `capture_artifact` rows are deleted
  outright anyway.

**The CHECK-survival detail is the sharp end.** Blanking one half of a
whole-or-absent pair would leave a row that violates its own constraint,
which is the identical problem W-6 hit with `revisit_condition` and solved
the same way, by blanking to a marker rather than to NULL. **Nothing
automated would have found it.** The erasure guard is table-scoped, the
legal census is table-scoped, and the CHECKs themselves only fire when the
erasure runs, which in production means once, on a real household, at the
worst possible moment to discover it.

So the honest ledger for this merge: **the same-PR rule caught it, the CI
guard did not and structurally could not.** The rule is memory-held, which
is what G-62 was filed about, and it has now held twice running.

**The general form, stated so it catches the next one:**

> **A guard's green answers the question the guard asks, which is not
> always the question you brought to it.** Before reading a pass as
> coverage, ask what mutation would turn it red. If no mutation of the
> thing you care about could do so, the guard is silent on your question
> however loudly it passes. The CLAUDE.md table's "not covered" column
> exists for exactly this and is only as good as the reader who consults
> it.

**Not fixed here, and named rather than assumed.** A column-scoped erasure
census is the obvious candidate (the staff-disclosure and legal-census
pattern applied one level down: derive the columns of every
household-referencing table, require each to be named in the erasure tool
or excused in writing). It is a guard, guards are proven in both
directions before they are trusted, and it is its own session.

**Base rate (G-75), twelfth of twelve:** found because the founder asked a
question about a green run rather than accepting it. No check produced
this; a person distrusting a pass did.

---

### G-84. A difference between two pointers is not a claim about the thing they point at, and this is the third surface today

Filed 2026-08-27, short, because the content is the recurrence rather than
the incident.

**The incident.** A stop hook reported "1 unpushed commit on branch
`claude/system-functional-gaps-f91l1k`". Read literally that says work
exists only locally. It did not: the commit named was `7bcbb16`, the merge
of PR #206, **already on `origin/main`**. The local feature branch had been
reset onto main after the merge, so it sat one merge commit ahead of a
stale remote feature-branch pointer. `git log origin/main..HEAD` was empty
throughout. Nothing was ever at risk, and the resolution moved a pointer
rather than shipping anything.

**Why it is filed at all.** The hook's reading was TRUE. Two refs did
differ. The error available here is supplying a wider conclusion than the
observation supports: *these pointers differ* became *work is unpushed*,
and those are different claims. Acting on the wider one would have been
harmless this time and is not always: the same misreading is how somebody
force-pushes to "fix" a divergence that was a stale pointer.

**The recurrence, which is the point.** Three times in one day, on three
unrelated surfaces, a true and narrow reading was available to be read as
a wider claim:

| Surface | The true, narrow reading | The wider claim it invites |
|---|---|---|
| The deploy sha gate (G-82) | this sha is on `origin/main` and is HEAD | this sha is what we want to ship |
| The branch endpoint (G-79) | classic protection reports nothing here | this branch is unprotected |
| A stop hook (this entry) | these two refs differ | work exists only locally |

Each observation was correct. Each conclusion was wider than its
observation. **None of the three would have been caught by checking the
observation again**, which is the trap: re-reading a true statement
confirms it, and the error is not in the statement.

**The general form, which subsumes G-79 and G-82 rather than repeating
them:**

> **Every reading answers a specific question. Before acting, say out loud
> what question the reading actually answers, and check it is the one you
> asked.** Where they differ, the gap is where the error lives, and it is
> invisible precisely because the reading is true.

The practical form is cheap: name the narrow fact and the intended
conclusion as two separate sentences. They look obviously different once
written apart and identical when compressed into one.

**Base rate (G-75), thirteenth of thirteen:** surfaced by a hook firing on
something unrelated to the work in hand.
