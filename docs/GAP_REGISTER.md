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
| G-05 | Stands. Queued for the deploy session (the probe needs the running stack the deploy provides); recorded in SPEC_AUDIT since rev 4. |
| G-06 | **FIXED this commit.** DEPLOY §4 extended from 5 to 14 checks covering every rev-4 surface, including the two `app_setting` rows existing in production with intended values, and a dry-run of the erasure tool. |
| G-11 | **PARTLY INCORRECT — the runbook exists.** `docs/PARALLEL_PILOT_PROTOCOL.md` (absent from the rev-4 zip, hence invisible to this review) defines the per-visit mirror procedure, the friction log with APP DEFECT / SPEC CANDIDATE verdicts, the weekly drift diff (importer `--against`), and quarterly reconciliation. The remaining sliver is real: no named owner, and no decision on where the friction log physically lives. Future handoff zips must include the protocol. |
| G-12 | **PARTLY COVERED.** The protocol defines the exit test for the paper-parallel phase: one full month of zero APP DEFECT entries + clean weekly diffs, then an ADR proposes promoting the app to system of record. What remains Rachel's: the broader pilot's success criteria (service doctrine validated by what evidence, decided by whom). |
| G-01 | **ADR-005 drafted this commit** (`docs/adr/005-key-custody.md`, Proposed) with the custodian and mechanism as ⟨brackets⟩ — the afternoon it costs is now filling in names. |
| G-08 | Partly a rev-4 brief omission: LAUNCH §3 never lost the name-an-owner item (the brief's remaining-work list did). The breach one-pager, a possible `security` incident kind, and Sentry alert routing remain open as written. |
| G-02, G-07, G-09, G-10, G-13, G-14 | Stand as written — all outside the repo. G-09 and G-02's retention question joined the counsel packet note in LAUNCH §3. |
