---
status: living
---
# Which copy is authoritative, and what a dated snapshot does not tell you

28 August 2026. Report, plus one in-place marking. Nothing is reconciled:
where two copies disagree, both are reported and the disagreement stays open.

## 1. The question that has to be answered first, and cannot be answered here

**Which copy of WK-DEV-001 is the library of record under WK-SOP-029 is not
determinable from this repository.** WK-SOP-029 is not in it. The only
statement about it that this repo carries is `LIBRARY_INDEX.md:8`:

> The operating library's system of record is the founder's library under
> WK-SOP-000 and WK-SOP-029; this index covers only what is mirrored INTO the
> repository and what a code session needs to know exists elsewhere. When this
> index and the library disagree, the library wins; report the disagreement, do
> not reconcile it.

Read straight, that makes **the library the system of record and the repo copy
a mirror**, and it says so before any of today's questions came up, which is
the reason to trust it: it is not a rule invented to settle this case.

**So the authority answer and the content answer point opposite ways, and both
are true.**

- **By authority**: the library is the system of record. The repo copy is a
  mirror. That is the standing rule.
- **By content**: the repo copy is the superset. It carries the 5 August
  appends of REQ-078..082 and REQ-074 at WCAG 2.2 AA with the A567 citation;
  the 24 August archive copy carries neither. On REQ-078..082 the repo copy
  additionally carries an explicit ruling that it WON a verbatim divergence
  (section J's canonicity note: "the dated verbatim check found wording-level
  divergence from INSTRUCTION_UPDATES v2 and the rulings resolved it in the
  repo copy's favor").

**Those are not in conflict and should not be collapsed into one sentence.** A
mirror can be more current than its source when an amendment is applied to the
mirror first and the source has not caught up. That is exactly what happened
twice here. The library being the system of record does not make its 24 August
snapshot correct; it makes the library the place the correction has to land.

**The action that follows is founder-side and it is not "pick a winner":** the
library copy takes the two amendments, at which point the copies agree and the
authority question stops mattering.

## 2. What the divergence covers beyond those two items

**Cannot be enumerated from this container**, because the 24 August archive
copy is not in the repository and neither is `INSTRUCTION_UPDATES_2026-08-05_v2`
(held out deliberately, `FOUNDER_RULINGS_2026-08-24.md:102`). What can be
produced is the other side of the diff: **every in-place dated amendment the
repo copy carries**, so the archive can be checked against a list rather than
read end to end.

| Amendment | Date | Where |
|---|---|---|
| REQ-076 WITHDRAWN, with its original text preserved as the dated record | 1 August 2026 | line 67 |
| REQ-077 ADDED, replacing withdrawn REQ-076 | 1 August 2026 | line 68 |
| Section I appended: REQ-078..082 (WK-STD-028 response architecture, ruling A121) | 5 August 2026 | lines 74, 79-83 |
| REQ-074 PROMOTED to WCAG 2.2 AA per D2, A567, with the superseded text quoted | 24 August 2026 | line 71 |
| REQ-075's parenthetical corrected from a retired-plan reference | 24 August 2026 | line 72 |
| Section J appended: REQ-083..085, with the canonicity note | 24 August 2026 | lines 85-99 |

Six amendments, four dates. **Any archive copy predating an amendment is
missing it**, so a 24 August archive should carry everything above except, at
minimum, the two already identified. Whether it carries the 1 August pair and
REQ-075's correction is checkable in one pass against this table.

## 3. The version line is the mechanism, and it is worth naming

The document's header still reads `Version 1.0 | July 2026`. Six amendments
have landed since, none of which bumped it. **A reader who checks the version
line to decide whether a copy is current gets the same answer from an
amended copy and an unamended one.** The amendments are individually
well-annotated, each carrying its date, its authority and often the superseded
text, which is why nothing was lost. What is missing is a signal at the TOP of
the document that the body has moved.

That is what the marking in section 4 addresses. It does not fix the version
line, because bumping a version on a mirror is a library-side act under the
change-control path, not something to do here.

## 4. The marking, applied

The repo copy now carries a banner directly under its version line saying:
this copy carries in-place dated amendments made after that line; a dated
snapshot of it is not a statement of current state; here are the six
amendments; and this is a mirror, not the system of record.

**Deliberately NOT marked "authoritative".** The content answer and the
authority answer differ (section 1), and a banner claiming authority for the
mirror would be the same error in the other direction: a future reader would
quote it against the library. What the banner claims is only what is
established: that this copy is amended, when, and that a snapshot is not
current state.

**The archive copy cannot be marked from here.** It is founder-side, and
marking the non-authoritative copy on its face is the more useful half of the
task, since the archive is what got read. Suggested marking, one line at its
top: `SNAPSHOT, 24 August 2026. Amended since. Check against the repo copy's
amendment table before quoting.`

## 5. The same question for the handoff and WK-DEV-006

Both state at Gate 0 that REQ-078..082 are outstanding. Both were written 24
August, nineteen days after the append landed on 5 August.

- `IMPLEMENTATION_HANDOFF_2026-08-24.md:182`: "REQ-078 through REQ-082 are
  adopted in INSTRUCTION_UPDATES_2026-08-05_v2 but not yet appended to
  WK-DEV-001."
- `WK-DEV-006_Execution_Directive.md:26`, Phase 0 deliverables:
  "REQ-078..082 appended verbatim from INSTRUCTION_UPDATES_2026-08-05_v2".

**They are one error, not two.** The directive's Phase 0 list reads as a
transcription of the handoff's open-items table, and the handoff's line 182 is
the original. Correcting the handoff without correcting the directive would
leave the visible half standing, since the directive is what a build session
reads.

### Are they stale elsewhere?

**Reported as an open question rather than answered, and the reason matters.**
A full staleness audit of both documents would mean checking every factual
claim in a 1,593-line handoff against the repository, which is a session of
its own and a worthwhile one. What can be said now, from the checks that have
already run today:

- **The handoff's open-items table is the specific structure at risk.** It is
  a snapshot of what was outstanding on 24 August. Every row in it has the
  same failure mode as line 182: work that closed before or after the snapshot
  leaves the row unchanged. Line 182's item had closed nineteen days BEFORE
  the table was written, which is the worse of the two cases, because it means
  the row was wrong when it was written rather than going stale afterwards.
- **Two other 24 August claims have already been checked and hold**: 24.3's
  covenant-event description matches what the code emits, and 24.8's account
  list is accurate as a requirement (its GitHub clause is unmet, which is a
  different thing from stale).
- **One 24 August claim was already found false today** and is recorded:
  24.8's "GitHub organization" against a repository under a User account.
- **The pattern to look for, if the audit is run:** not opinions and not
  design, but STATUS rows. A design decision written on 24 August is still
  the decision. A status written on 24 August is a photograph.

**What would make the audit cheap:** most of the handoff's status claims map
onto things this repository can be queried for. The expensive rows are the
founder-side ones (accounts, insurance, counsel), which no audit from here can
settle anyway.

## 6. The thing this whole entry is about, stated once

The mistake being guarded against is not "reading an old document". It is
**reading a dated snapshot and reporting its contents as current state**, which
is a different and much easier mistake, because the snapshot is internally
consistent, correctly dated, and gives no signal that it has been overtaken.
Nothing in a snapshot says "amended since". The document looks exactly as
authoritative as it did the day it was accurate.

Three of today's findings are the same shape: the REQ-078..082 belief, the
REQ-074 belief, and the accessibility ruling that rested on the second. **One
snapshot, read once, produced three downstream errors**, and each of them
looked like a finding rather than a misreading.
