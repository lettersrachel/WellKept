---
status: living
---
# ADR-006: Audit rows hold tokens for non-client subjects, not names

Date: 2026-08-01 | Status: Accepted (engineering decision, shape only - see
Open questions) | Decider: this session, per Direction 1b (`PLACEHOLDER_DIRECTIONS.md`)

**Update, 2026-08-01, same day:** the promise question this ADR deliberately
left open is now resolved. Counsel confirmed no statute obliges deletion of
non-client records; the founder's instruction was "there should be no
constraints." Full resolution in `docs/GAP_REGISTER.md` G-56. This ADR's
shape is unaffected and is now confirmed as sufficient rather than merely
survivable: tombstone was always going to be enough, and this ADR's
tokenized shape remains the recommendation on its own engineering merits
(an unlinkable-on-request audit trail costs nothing to build and is good
practice independent of any legal floor), not because a stricter ruling
might have required it.

## Context

`WK-STD-026` requires deletion on request for records about people who are
not clients. `docs/GAP_REGISTER.md` G-56 blocks every such record (Member
Circle entries, recipients, a lead who never signs) until deletion exists.
The counsel question behind that block - whether the company legally owes
deletion, and to what extent - is a promise, not a shape, and stays
genuinely open (`OPEN_ITEMS_INSTRUCTIONS.md` Item 1.1). This ADR does not
answer it and is not a substitute for that answer.

But one piece of the design does not depend on the answer: **how an audit
row is constructed when it references a non-client subject.** `audit_event`
is append-only (CLAUDE.md's audit invariant) and the counsel packet
describes it as load-bearing evidence. A subject's record being erased
while the audit trail keeps their name creates a specific, checkable
tension: is the audit row retained in full (erasure is partial, and the
promise should say so), redacted in place (breaks append-only, needs its
own written exception), or constructed so it never held the name to begin
with?

The third option is the only one that satisfies both properties
simultaneously, and - this is what makes it decidable now rather than after
counsel rules - **it is correct under every ruling counsel could give.**
Tombstone suffices: tokenizing cost nothing, since the audit row was never
going to be redacted anyway. Full erasure is required: already possible,
since deleting the mapping row makes the audit trail unlinkable without
touching the row itself. A statute constrains the mechanism specifically:
compliant by construction, since no value ever left the audit table.

`docs/AUDIT_IDENTITY_SURVEY.md` (Direction 1a, same date) found this is not
only a forward-looking question. Two live sites already write a name or an
email directly into `audit_event.detail` for existing client-household
data: `role_assigned` (an email address) and `exclusion_created`/
`exclusion_ended` (a person's name, when `scope: "person"`). That finding
is filed separately as G-59, since it is a defect in what ships today, not
a design question for what doesn't exist yet. This ADR's shape is written
broadly enough to be the fix for both, though implementing it against G-59
is its own session, not this one.

## Decision

Audit rows never hold a name, an email, or any other value that identifies
a subject who is not the acting user, when that subject is not a client of
the household the row belongs to (a recipient, a Member Circle entry, or -
per G-59 - anyone named in an exclusion's `person`-scoped target).

Instead:

1. **A mapping table** (`audit_subject_token`, or similar; not created by
   this ADR) holds `token -> identifying value`, keyed per household,
   written at the same time as the identifying value is first captured
   anywhere in the system (a Member Circle entry, an exclusion naming a
   person, a role assignment's target).
2. **The audit row holds the token**, never the value. `audit_event.detail`
   references `{ subjectToken: "..." }` instead of `{ email: "..." }` or
   `{ target: "grandma ruth" }`.
3. **Erasure of the subject deletes the mapping row.** The audit row is
   untouched - append-only holds - but is now unlinkable: the token exists,
   resolves to nothing, and the trail still proves the event sequence
   happened without being able to say to whom.
4. **Resolution is a live join, not a stored denormalization.** Anything
   displaying an audit row to an authorized viewer (corporate, in the
   revealed-history sense G-53/G-59 already established) resolves the
   token through the mapping table at read time. Once the mapping is gone,
   the display shows the token is retired, not a blank or an error.

This is scoped to the identity of the *subject* of a record. It does not
change `actorUser`/`actorRole` (the person who acted is a client-side
staff or corporate user, always resolvable, and deliberately never
anonymized - the audit trail's whole purpose is knowing who did what).

## What this does not decide

- **Whether the company owes deletion at all**, and to what non-client
  population, under what retention window. Counsel's answer
  (`OPEN_ITEMS_INSTRUCTIONS.md` 1.1) is unaffected by this ADR and this
  ADR does not anticipate it. **Answered same day, see the update note
  above: no statutory obligation. The retention window and field scope
  remain the founder's to set**, unconstrained rather than undecided.
- **The mapping table's exact schema, or whether it is one table shared
  across subject classes or one per class.** That is implementation,
  decided when G-56 unblocks or when G-59 is worked, whichever comes
  first.
- **Whether `--scrub-audit-detail` in `erase-household.mjs` becomes the
  default**, or the dry-run's status line is corrected (both raised in
  G-59). This ADR makes the tokenized shape the target for *new* writes;
  it does not retroactively fix the two existing leak sites.

## Consequences

- `member_circle_entry` and recipient records, when G-56 unblocks, are
  built against this shape from the start - the schema question is no
  longer on the critical path, only the wording of `WK-STD-026`'s answer.
- G-59's fix, when scoped, has a settled target shape to build toward
  rather than inventing one under time pressure.
- Any future audit-writing code that is tempted to log a name "just this
  once, it's convenient" has a named ADR to be reviewed against, the same
  role ADR-004 plays for billing and payroll boundary questions.

## Open questions

Whether this ADR should also require `oldValueHash`/`newValueHash` at every
non-client-subject write, or whether the mapping table itself is enough
protection - not decided here, since no such write exists in the codebase
yet to test the question against.
