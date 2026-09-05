---
status: living
---
# Agenda: the 25 September 2026 two-key session

Items requiring both keys, collected as they arise rather than assembled the
night before. Each states what is being asked, what is already decided, and
what happens if the item is not reached.

---

## Item 1: the requirement lifecycle event family, against the status column

**Opened 5 September 2026, written while the reasoning was fresh** (founder
instruction), from the G-136 finding.

### What is being asked

Whether the two-key adopted `requirement lifecycle` EVENT FAMILY gains a tenth
word, `superseded`, to match the status column that now carries ten values.

### What is already decided and is NOT in scope here

The founder ruled the STATUS COLUMN on 5 September 2026, on the ground that it
was never two-key: 0051 translated the event family into a CHECK constraint in
a headerless generated file, so nothing at this session ever adopted it.
`work_requirement.status` gains `superseded`, written only by the changeset
path. **That ruling stands whatever this session decides**, and re-opening it
is not what this item asks.

### The divergence, stated plainly so it is dated rather than discovered

- **The event family, two-key adopted** (WK-DEV-009 v1.1 line 74, register
  A573), carries NINE words: generated, activated, ready, scheduled, started,
  completed, verified, reopened, deferred.
- **The status column** now carries TEN: those nine plus `superseded`.

Until this item is ruled, a requirement can be in a state the adopted event
vocabulary has no word for. Nothing breaks today, because **nothing emits the
requirement lifecycle family at all yet**: the event families in section 10
are a forward specification, and this tree emits `work_requirement.*` kinds of
its own naming. The divergence becomes live the moment somebody builds the
family emitter.

### The three shapes, and what each costs

1. **Add `superseded` to the family.** The vocabularies stay identical, which
   is the state they have been in since 0051 and the state every later reader
   has assumed. Cost: one two-key amendment.
2. **Leave the family at nine and record the divergence as intended.** The
   status column is a storage concern and the event family is a publishing
   concern, and they are permitted to differ. Cost: whoever builds the emitter
   must be told, in writing, what to emit when a requirement is superseded, or
   they will invent something.
3. **Rule that the two must never diverge**, making any future status value a
   two-key change. Cost: the highest, and it would retroactively make the
   5 September status ruling a two-key matter.

### If this item is not reached

Shape 2 is the de facto state, undocumented. That is the outcome this item
exists to prevent: the divergence would then be discovered by whoever writes
the emitter, under time pressure, and settled by whatever they chose.

### Reading for the session

- `docs/DECISION_WORK_REQUIREMENT_TENTH_STATUS_2026-09-05.md`, which carries
  the nine current values read from `pg_constraint`, what each means, and
  which two have no producer.
- `GAP_REGISTER.md` G-136, the finding.
- `WK-DEV-009_v1_1_Unified_Ambient_Brief_2026-08-24.md` line 74, the sentence
  itself.
