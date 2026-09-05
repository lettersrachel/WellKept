---
status: living
---
# Decision requested: a tenth `work_requirement` status

**For the founder.** She declined to rule this from a summary, which is right:
it is a semantics change to a shipped primitive. Everything below is read from
the code and the database rather than recalled, and the reads are named so she
can check any of them.

## RULED 5 September 2026 (founder), on the split above

**A tenth value is added, and it is named `superseded` rather than `retired`.**
Her reason for the name, which is the part that generalises: **`superseded`
states WHY rather than only THAT.** The requirement was replaced by a source
change; it was not stale, and it was not abandoned. `retired` would have been
true and empty, and a status is read by people reconstructing what happened.

**ON THE OTHER FORK, which the decision document named and she answered: an
operator may NOT set it by hand. Only the changeset path writes it.** Her
reason: **the value is a claim about CAUSATION, and a hand-set one would assert
a cause nobody can trace.** A row reading `superseded` therefore always has a
changeset behind it, and that is a property of the data rather than a
convention. If an operator needs to end a requirement for a human reason, that
is an existing status or a separate ruling, and it is not this one.

**And the event family goes to the 25 September agenda as its own item**
(`docs/AGENDA_2026-09-25_TWO_KEY.md`), with the divergence stated rather than
left to be discovered: nine two-key-adopted event words against ten status
values, deliberate and dated.

## ANSWERING THE FOUNDER'S QUESTION FIRST: two keys or one, and it is BOTH

She asked, before ruling: was the nine-value lifecycle adopted under two keys,
or is 0051 a single-founder record. **Read from the tree rather than answered
from memory, and the answer splits.**

**The nine WORDS are two-key adopted.** They appear in
`WK-DEV-009_v1_1_Unified_Ambient_Brief_2026-08-24.md` line 74, and that
document's own line 5 reads "Adopted under the standing two-key software
authorization; register A573".

**But they are adopted as an EVENT FAMILY, not as a status column.** The exact
sentence, in section 10 "Data and event architecture [D]", is: "Event families
to emit: requirement lifecycle (generated, activated, ready, scheduled,
started, completed, verified, reopened, deferred); visit lifecycle (...);
decision lifecycle (...)". It is a list of events the system emits, sitting
beside five other event families. **It says nothing about a `status` column.**

**Making those nine words the permitted values of `work_requirement.status` was
0051's own translation**, and 0051 carries NO HEADER AT ALL: it predates the
per-column producer rule and is a bare generated file, so nothing records that
the translation was ruled, or noticed. That is a single-founder-era build
decision, not a two-key adoption.

**What that means for the ruling, stated as a fork rather than a
recommendation:**

- **A tenth STATUS value alone is hers**, because the status column was never
  two-key. Nothing at the 25 September session has authority over a column that
  session never adopted.
- **A tenth LIFECYCLE EVENT is the two-key list**, and belongs at the 25
  September session, because that list is what A573 adopted.
- **And the two are currently the same nine words**, which is why the question
  felt like one question. Adding a status without its event would put the
  column and the adopted event family out of step for the first time, and that
  divergence is itself a thing to decide rather than a side effect. **The
  cheapest honest option may be to rule the status now and note the event
  family for the September agenda**, so the divergence is deliberate and dated
  rather than discovered later by whoever emits the event.

## The nine statuses that exist, read from `pg_constraint` rather than from the source

```
CHECK (status = ANY (ARRAY[
  'generated', 'activated', 'ready', 'scheduled',
  'started', 'completed', 'verified', 'reopened', 'deferred']))
```

**0051 recorded these as the full WK-DEV-009 section 10 requirement lifecycle**,
adopted so that Gate 3's generator arrives without a migration. They are not a
convenience list somebody grew; they were adopted as a set. **Corrected by the
provenance check above: adopted as an EVENT set, and turned into status values
by 0051 without a record.**

**What each means today, and which are actually reachable.** The service
exercises a subset deliberately (0051's own note: "the v1 service exercises the
manual subset"):

| Status | Meaning | Reachable today |
|---|---|---|
| `generated` | the row exists; the default a new requirement carries | yes, on creation |
| `activated` | adopted vocabulary, no transition writes it | no |
| `ready` | adopted vocabulary, no transition writes it | no |
| `scheduled` | a date is committed to | yes, `progressWorkRequirement` |
| `started` | work has begun | yes |
| `completed` | done, with `completed_at` and `completed_by` whole | yes |
| `verified` | checked after completion; verify only ever checks completed work | yes |
| `reopened` | completion withdrawn; the completion pair is cleared | yes |
| `deferred` | put off deliberately | yes |

**Two of the nine have no producer.** That is the same G-85 shape the newer
migrations state explicitly, and it matters here because it shows the set was
adopted whole rather than grown one state at a time.

## What the tenth status would mean

**The name is not proposed here**; `retired` and `superseded` both read
plausibly and choosing between them is part of the ruling. What is proposed is
the MEANING, because that is what the decision turns on:

> **The requirement is no longer to be done, and not because it was done,
> deferred or withdrawn. The world changed underneath it.**

It is distinct from every existing state, and the distinctions are the argument
for it rather than against:

- **Not `completed`**: nothing was done, and recording it as done would put a
  false fact in the record and in every count derived from it.
- **Not `deferred`**: deferral means later, and this is not later.
- **Not `reopened`**: reopening is a withdrawal of completion by a person who
  changed their mind about the work, not a statement about the world.
- **Not deletion**: the row is evidence that the company planned this and why
  it stopped being right, which is exactly what reconciliation exists to
  record.

Its producer would be the changeset path: an `invalidated` effect, once a
person has classified the change, could retire the dependent it names.

## What breaks by adding to a shipped vocabulary, enumerated rather than estimated

Every site was found by search, and the list is short because the vocabulary is
already centralised:

1. **The CHECK itself** (`work_requirement_status_known`), which needs a
   migration. Adding a value to a text CHECK is a `DROP CONSTRAINT` plus `ADD
   CONSTRAINT`, and the ADD validates against every existing row, so it is
   additive in effect but not in form.
2. **`actions.ts:2187`, the `LIVE` array** used by `progressWorkRequirement` to
   decide which rows may still be progressed. A retired row must NOT be live,
   so this needs an explicit answer rather than inheriting one.
3. **`actions.ts:2223`, the decision-to-status map**, which would gain a
   `retire` verb, or would not: retiring might belong only to the changeset
   path and never to the manual progress control. **That is a real fork and it
   is the founder's**, because it decides whether an operator can retire work
   by hand at all.
4. **`changeset-propagation.ts`, the `OPEN_STATUSES` list** that decides what
   counts as a dependent. A retired requirement must not be re-invalidated by
   the next changeset.
5. **`estimate-calibration.ts`**, which computes estimate-versus-actual on a
   requirement. A retired requirement has no actual and must not read as a
   variance of zero, which is the `NULL`-is-the-honest-unknown rule already
   holding elsewhere in that module.
6. **The drill-in's requirement card**, which renders the status string.

**What does NOT break**, checked rather than assumed: the completion and
verification whole-or-absent CHECKs both key on `status IN ('completed',
'verified')` and `status = 'verified'`, so a tenth value outside those sets
passes them unchanged and carries no completion or verification columns, which
is the correct shape for it.

## The one thing that makes this more than housekeeping

**A status is a claim about a household's record that outlives whoever set
it.** Nine values were adopted as a set from a specification; a tenth added by
engineering because a new feature wanted somewhere to put a row is the drift
this repository's provision-numbering rule exists to prevent. If the tenth is
right, it is right as an amendment to the adopted lifecycle, with the same
standing as the nine, rather than as an implementation detail of the changeset
path.

## What happens if it is declined

The changeset records `invalidated` effects and nothing acts on them. That is
today's shipped behaviour and it is honest: a person reads the effect rows and
decides what to do about each, and the reconciliation layer's value is the
noticing rather than the acting.
