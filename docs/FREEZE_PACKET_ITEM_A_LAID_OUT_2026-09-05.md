---
status: living
---
# Freeze packet item A, laid out

**Preparation batch item 10.** The question is already on the 25 September
agenda as Ruling A of `docs/FREEZE_DECISION_PACKET_2026-09-25.md`, and that
entry states the three shapes. **This page is what the batch item asks for
beyond them: the exact language that would have to be amended under each
shape, with file and line, so the ruling is a sentence in the room rather than
a reconstruction of the question.**

It chooses nothing. Where a shape carries an engineering consequence the
consequence is stated beside it, which is not the same as arguing for it.

## The question

**Do a visit's HOURS reach a member archive, and in what shape?**

Not what a member sees on a screen. The archive is the artifact a member asks
for and receives, built by `pnpm db:export-household --scope member`.

## What is true today, read from the code rather than from a document about it

**The hours live in two places.** `visit_command.payload` is jsonb and carries
the hours the HOM typed at close; `visit` is the row the close flow fills and
travels as a unit with it. Four more tables carry a duration or compute one:
`time_entry` (wage records), `time_segment` (computed from the window, not
stored), `estimate_snapshot`, `task_occurrence`.

**Every one of them is held out of the member archive**, by written reason in `CORPORATE_ONLY`
(`packages/schema/src/household-archive.ts:164`, the duration block at lines
193 to 204). That block holds EIGHT tables and six of the eight reasons name
D7; the two that do not are `time_entry`, which is a wage record on its own
account, and `household_task_profile`, which carries no duration at all.

**So the member archive carries no visit at all**, and the consequence is
exactly one empty portability category. The table below is READ FROM THE
MODULE rather than from a document about it: `MEMBER_SCOPE` holds seven tables,
and folding them by category leaves two of the nine phrases with nothing in
them.

| Portability category | Member scope today | Why |
|---|---|---|
| canonical household structure | `playbook_field`, s1 rows only | |
| document and media manifest | `visit_photo`, bytes replaced by a hash | |
| asset history | `registry_entry` | |
| outcome history | `deferral` only | the only work-and-outcome table with a decided client projection |
| preferences and standing rules | `preference_rule` | |
| access history | `household_role_assignment` | |
| audit metadata | `audit_event` | |
| **work history** | **NOTHING** | **this ruling** |
| vendor history | NOTHING | a different question: nothing in the schema holds vendor engagements at all (Q-8v) |

**Read the last two rows apart.** Only "work history" is empty because of D7,
and only it moves under this ruling. "Vendor history" is empty because the
data does not exist, and no shape below fills it. Crediting this ruling with
both would be a claim about a question it never asked.

**One asymmetry worth seeing before ruling.** `visit_photo` is IN the member
scope by founder ruling B of 4 September. So the archive today can carry the
manifest of a photograph taken during a visit while carrying nothing about the
visit it was taken during. That is a consequence of two rulings made
separately, not a decision anybody made.

## A finding that holds under ALL THREE shapes, and it is the reason to read this page before the room

**The D7 guard does not walk the export.** `client-duration.test.ts`'s
`clientSurfaceFiles()` walks the `(client)` route group plus three named copy
builders (`apps/web/src/lib/mail.ts`, `apps/web/src/lib/push.ts`,
`packages/mail/src/index.ts`). `household-archive.ts` and
`export-household.ts` are in neither set. **So no shape below is
CI-enforced on the archive**, whichever is chosen: today's holding-out is
enforced by the archive's own written member-scope list, and shape (b)'s
key-drop would be enforced by review alone.

**Queue row Q-11k**, opened for it under the standing authority that a guard
finding is a row rather than a question: extend the walk to the member-scope
archive path, proven both directions. **Today this is not a live leak**, and
the row says so: the archive holds every duration-carrying table out through
`CORPORATE_ONLY`, and the archive's own tests assert that list. What is missing
is the second opinion, since the list and its assertion are the same decision
checked against itself. Read beside
the client-payload-shape guard's known limit, which is the same shape one
layer down: **nothing checks what a permitted key CONTAINS.**

---

# The three shapes, with their exact edits

## Shape (a). D7 holds as written. Visits stay out.

**What the member receives:** the archive as it is today, with work history
empty. The manifest's `knownLosses` already carries a member-scope sentence;
under this shape it should also name the absence, because an artifact whose
point is completeness must say what it does not carry.

**Amendments needed: NONE.** No line of D7 changes anywhere.

**What changes, and it is one line of prose rather than a rule:**

| File | Change |
|---|---|
| `packages/schema/src/export-household.ts:144-148` | add to the member-scope `knownLosses` push a sentence naming work history as deliberately empty and D7 as the reason |

**What does not change:** the directive, the guard, the legal documents, the
archive's held list, the client surfaces.

**The engineering note:** this is the only shape with nothing to get wrong. It
is also the one that leaves the largest hole in the artifact, and the hole is
invisible unless the sentence above is written, which is why the sentence is
part of the shape rather than a nicety.

---

## Shape (b). Visits travel with the hours REMOVED.

**What the member receives:** what was done and when, without how long it
took. `visit_command` enters the member scope through a projection that drops
the duration keys inside the jsonb payload.

**Amendments needed: NONE to D7's text.** D7 bars the client product from
DISPLAYING durations; under this shape no duration travels, so the rule is
satisfied rather than amended. **That reading should be recorded in the
ruling itself**, because the next reader meets a visit row in a member archive
and has to know it was considered rather than overlooked.

**What changes:**

| File | Change |
|---|---|
| `packages/schema/src/household-archive.ts:197-198` | `visit` and `visit_command` move OUT of `CORPORATE_ONLY` and INTO `MEMBER_SCOPE` (line 115) under the category `work history` |
| `packages/schema/src/household-archive.ts:70-75` | a second `ARCHIVE_PROJECTIONS` entry for `visit_command`, dropping the duration keys from the payload |
| `docs/legal/README.md` | the visit-records category gains a sentence saying the member archive carries visits without durations |
| both privacy-notice copies | the same sentence, same PR (the standing rule) |

**The engineering consequence, stated because it is the whole risk of this
shape:** `ARCHIVE_PROJECTIONS` today drops a whole COLUMN (`visit_photo.data`)
and replaces it with a hash, and the module's own header explains why an
inverted list was chosen: a keep-list drifts silently when a column is added.
**A jsonb key list cannot be inverted the same way.** The payload's keys are
written by the close flow at runtime, so a key added tomorrow is admitted by
default and no guard can see it. That is the client-payload-shape guard's
known limit met a second time, and under this shape it would be load-bearing:
the key list is a written, reviewed list of the same kind as the table list,
and it needs an assertion against the close flow's own payload writer or it
will be wrong within a release.

**What does not change:** D7's text, the guard's vocabulary, the client
surfaces, `time_entry`, `time_segment`, `estimate_snapshot`, `task_occurrence`
(all stay held, on their own reasons).

---

## Shape (c). Visits travel whole, hours included.

**What the member receives:** the visit record as the company holds it,
including the hours.

**Amendments needed: D7 IS AMENDED BY NAME**, and the exact edits follow. The
reason to amend rather than interpret is in the packet already: D7's text is
about client surfaces, and a session reading it later should not have to
reconstruct whether an export counted.

**D7 is a TWO-KEY adoption (register A567), so this is a two-key act.** The
edits are written out here in the G-105 form, FROM and TO with file and line,
so the second key turns on a reading rather than a discussion.

### Edit 1, the canonical text

**File:** `docs/WK-DEV-006_Execution_Directive.md:19` (the D7 row's third cell)

**FROM, verbatim:**

> The client product never displays visit durations, service-hour totals,
> staffing ratios, or households-per-HOM, anywhere, including receipts,
> reports, and notification copy. Internal surfaces keep full duration data
> for payroll and REQ-083 utilization. Add a component-library lint/check:
> any client-route component rendering a duration-typed field fails review.

**TO, proposed** (the addition is one sentence; the existing text is
untouched, which is what keeps every other reading of D7 intact):

> The client product never displays visit durations, service-hour totals,
> staffing ratios, or households-per-HOM, anywhere, including receipts,
> reports, and notification copy. **A member's own service record, exported
> to that member on request, is not a client surface for this purpose and may
> carry the hours of that member's own visits; service-hour totals, staffing
> ratios and households-per-HOM stay barred there as everywhere.** Internal
> surfaces keep full duration data for payroll and REQ-083 utilization. Add a
> component-library lint/check: any client-route component rendering a
> duration-typed field fails review.

**Why the added sentence re-bars three of the four quantities:** D7 names four
things and only one of them is the member's own fact. A totals figure, a
ratio and a households-per-HOM number are the staffing wall itself, and an
amendment that let them out through the export would widen D7 far past the
question being ruled.

### Edit 2, the restatement in the consolidated brief

**File:** `docs/WK-DEV-011_Consolidated_Build_Brief_2026-08-25.md:18`

**FROM, verbatim:**

> - D7: no time quantities on any client route; lint enforced; internal surfaces keep full durations. (WK-DEV-006 D7.)

**TO, proposed:**

> - D7: no time quantities on any client route; lint enforced; internal surfaces keep full durations; a member's own exported service record may carry that member's own visit hours (amended <date>). (WK-DEV-006 D7.)

### Edit 3, the guard's header

**File:** `apps/web/src/lib/client-duration.test.ts:8-13`

The header restates D7 in the guard's own words and would otherwise describe a
rule that no longer exists. The guard's BEHAVIOUR needs no change under this
shape, because it does not walk the export at all, which is the finding above:
the header changes, the code does not, and the gap between those two is
exactly what the guard session would close.

### Edit 4, the archive's held reasons

**File:** `packages/schema/src/household-archive.ts:197-198`

`visit` and `visit_command` move out of `CORPORATE_ONLY` and into
`MEMBER_SCOPE` under `work history`, with a `why` citing the amendment by date rather than
citing D7 as the reason they are in.

### Edit 5, the legal copy

**File:** `docs/legal/README.md`, the visit-records category, plus both
privacy-notice copies in the same PR.

**Not to be touched by this shape:** README lines 194, 202 and 214 read
"durations never reach any client surface (the D7 wall, guard-enforced)" about
`estimate_snapshot`, `task_occurrence` and `time_segment`. Those three stay
held under every shape on this page, so their sentences stay true and stay as
written. **An amendment sweep that changed all six D7 sentences because they
match a grep would silently widen the ruling to three tables nobody asked
about**, which is the reason they are named here as out of scope rather than
left to be noticed.

---

## What no shape decides

- **`time_entry` stays out under all three.** It is a wage record with a
  four-year retention obligation under WK-SOP-017, and its exclusion has never
  rested on D7 alone.
- **`estimate_snapshot`, `task_occurrence`, `time_segment` and
  `work_requirement` stay out under all three.** Each has its own written
  reason beyond D7: estimates are the company's planning, occurrences carry
  actual minutes, segments derive from the entries, and the requirement is the
  parent of rows that are themselves held.
- **Nothing on a member SCREEN changes under any shape.** The client side is
  frozen at the digest, and the export is not a screen. If the freeze lifts
  for a member-facing export control (Q-8b), that is a separate ruling in the
  same session.
- **Vendor history stays empty** under all three (Q-8v).

## One sentence is enough

The ruling that closes this is one of:

- **(a)** D7 holds as written; visits stay out; the artifact says so.
- **(b)** Visits travel with the hours removed; D7 is satisfied, not amended;
  the dropped-key list is written and reviewed.
- **(c)** Visits travel whole; D7 is amended by name in the five places above.
