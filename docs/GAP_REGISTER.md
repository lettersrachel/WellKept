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

**FIXED 2026-07-27 — the app now detects its own skew.** Every build bakes
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
