---
status: living
---
# Decision requested: a tenth `work_requirement` status

**For the founder.** She declined to rule this from a summary, which is right:
it is a semantics change to a shipped primitive. Everything below is read from
the code and the database rather than recalled, and the reads are named so she
can check any of them.

## The nine statuses that exist, read from `pg_constraint` rather than from the source

```
CHECK (status = ANY (ARRAY[
  'generated', 'activated', 'ready', 'scheduled',
  'started', 'completed', 'verified', 'reopened', 'deferred']))
```

**0051 recorded these as the full WK-DEV-009 section 10 requirement lifecycle**,
adopted so that Gate 3's generator arrives without a migration. They are not a
convenience list somebody grew; they were adopted as a set.

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
