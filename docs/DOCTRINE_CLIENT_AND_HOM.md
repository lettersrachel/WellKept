---
status: living
---
# Client-side and HOM-side doctrine

**Founder rulings, comprehensive instruction Parts One and Two, 4
September 2026.** Recorded as doctrine before any member surface is
built, with the contradictions in the current code reported rather than
quietly reconciled.

**Where this sits.** The rulings are law; this document is where they
are written down with what the tree actually does beside each one. When
one of these binds a future queue row, the row cites this file.

---

# Part One: client-side doctrine

## 1. What the member is never asked

Never to categorize their own tasks. Never to check whether something
happened. Never to rate a visit. Never to confirm what the record
already knows. Never nudged to engage.

**The refusal is the differentiator; every competitor's product is built
on the opposite.**

**Against the tree: NO CONTRADICTION, and one distinction worth keeping
so a later reader does not report a false one.** The client side is
frozen at the digest and asks a member for nothing. Two things look
close and are not:

- `client_edit` is the member CORRECTING a fact about themselves, which
  item 4 below expressly permits. It is offered, never solicited.
- `decision_right.status` moving from `recommended` to `confirmed` is a
  member confirming an AUTHORITY GRANT, not a fact the record already
  knows. Those are different acts: one says "you may decide this without
  asking me", the other says "yes, that is my dog's name". The first is
  the member exercising authority; the second is the product asking a
  member to do its work.

## 2. A weekly contact ceiling of three

The weekly digest plus up to two decisions, **across every channel**.
Anything urgent under the materiality rules is exempt. The decision
inbox is the only member push surface and quiet hours bind it.

**If a household is hearing from us more than three times in a week,
something upstream is wrong and the system should say so rather than
send.**

**CONTRADICTION, live, and it is the largest in this document.** There
are TWO member-reaching channels today and neither is counted:

1. The weekly client digest (`services/worker/src/client-digest.ts:76`).
2. **The client report email, sent on EVERY applied visit**
   (`apps/web/src/app/api/visit-commands/route.ts:138`, calling
   `deliverClientReport`).

**So a household with two visits in a week already receives three
messages before any decision exists**, and the third is not a decision.
Nothing counts sends, nothing knows the ceiling, and no mechanism could
say "something upstream is wrong" because nothing is watching.

**Not fixed here.** Both channels are member-facing, which is never
pre-authorized, and the ceiling needs a decision this session cannot
make: whether a per-visit report counts against the ceiling at all, or
is exempt as the record of a thing that happened rather than a demand
on attention. Those give different systems. **Queue row Q-11c opens it**
and the ruling is named as its prerequisite.

## 3. The member never sees the machinery

No stages, modes, confidence scores, inference labels, capture
artifacts or knowing-states. A member sees a decision or a completed
thing, never the reasoning that produced it.

**CONTRADICTION, live, small, and specific.** The member's own playbook
renders the internal field flag as a tag, in the enum's own words:

```
apps/web/src/app/(client)/playbook/page.tsx:105
{f.flag && f.flag !== "none" ? <span className={`tag ${f.flag}`}>{f.flag}</span> : null}
```

`fieldFlagEnum` is `none | CRITICAL | CAUTION | DELIGHT`
(`tables.ts:15`), the briefing's own "flags first" vocabulary. **A
member currently sees `CRITICAL`, `CAUTION` or `DELIGHT` stamped in
capitals on their own record.** That is the schema on a member surface,
which is what this ruling forbids by name, and `DELIGHT` is also the
company's word for how it categorises pleasing them.

**What HOLDS, checked rather than assumed:** the confidence and
derivation columns are nulled for a client before the payload is built
(`apps/web/src/lib/data.ts:366-370`, five keys set to null), so no
confidence score reaches a member. `stage` is forbidden positively in
both client-payload mechanisms. Capture artifacts and knowing-states
have no client projection at all.

**Not fixed here**, member-facing. It is one line to remove the tag and
a different question to decide whether the member should see anything
in its place, which is a copy decision.

## 4. A member may always correct a fact about themselves, and always change a standing instruction

Everything else goes through their HOM, **because the relationship is
the product rather than the interface**.

**Half built, half absent, and the absent half is not a contradiction
because the freeze covers it.** Correcting a fact exists: `proposeEdit`
lands in review and merges on HOM approval, with the full diff kept.
Changing a standing instruction does not: `preference_rule` is written
only by a corporate action, which takes no provenance input at all, and
there is no member path to it.

**Named as a gap rather than a defect**, because the client side is
frozen and building a member write path would cross it. **The doctrine
is now the reason that path must exist when the freeze lifts**, which is
what recording it ahead of the build is for.

## 5. The voice rule, stated substantively

Plain, brief, never cheerful, never apologetic, never "we noticed",
never a phrase that implies the household is being watched.

**This is now recorded beside the copy guard so the guard has a stated
intent** (`packages/schema/src/client-copy.test.ts` header). The guard
enforces a subset (em dashes, computed scope); the rule is wider and
always was, and a guard without its intent written down invites the
reading that passing it is the whole obligation.

**Against the tree: the flag tag in item 3 fails this too.** `DELIGHT`
in capitals on a member's own record is not plain, not brief, and is
cheerful in the exact way this rule names.

## Deferred to 25 September with the COO, and not decided here

Who in a household counts as a member; whose confirmation counts for
Decision Rights; what happens when two members of the same household
disagree.

---

# Part Two: HOM-side doctrine

## 1. What the software never asks a HOM to do

Never to justify her time in the app. Never to rate her own
performance. Never to explain a gap. Never to compete with another HOM.

**The judgment-free guard bars the schema fields; this bars the
interactions.**

**Against the tree: NO CONTRADICTION, and one near-miss worth naming.**
`task_occurrence` requires a variance reason when an outcome is an
exception, whole-or-refused by CHECK. **That asks about the TASK, not
the person**: the row carries no performer at all, and the schema
enforces that by storing none. The distinction is thin enough that a
later feature could cross it without noticing, which is why it is
written here: a reason attached to work is a record; the same field
attached to a person is a justification.

## 2. What is never measured about her, including corporate-only

Speed per task, idle time, app dwell, location outside a visit. **None
of it is collected, on the principle that a measure which exists is
eventually used.**

**Against the tree: NO CONTRADICTION, and the schema already holds the
hardest part structurally.** `task_occurrence` stores actual minutes and
**no performer**, so speed per task is unrepresentable rather than
merely unbuilt. `time_segment` rows are personless by CHECK. The
geofence chip that would have written a fabricated three-hour window was
removed (G-104), and its replacement is two typed fields.

**One correction to my own earlier work, made while checking this.** The
household-archive decision list described `gesture` as "interaction
telemetry about the software". **It is not.** REQ-042: a thoughtful act
toward the household, with the idea in words, two approval gates, an
execution time and a cost. The reason is corrected in place. Had it been
telemetry it would have been a contradiction of this ruling, which is
how the error surfaced.

## 3. Dissent is a first-class action, not a note field

When the software proposes something she believes wrong for that
household she can say so, it persists, it reaches corporate, and it
feeds the ranked error list.

**A system that records only compliance trains its operators to stop
noticing, and we are staking the company on operators who notice.**

**PARTLY BUILT, and the part that exists is real.** `prompt_outcome`
records a HOM setting a prompt aside with WHY, in the outcome vocabulary
itself (the rule was wrong for this home, or the moment was wrong), plus
an optional note, and it is append-only with no update or delete path
anywhere. **It reaches corporate**: `/oversight/triggers` reads it.

**What is missing, precisely:** dissent exists for PROMPTS and for
nothing else. There is no way to say "this proposal is wrong for this
household" about a decision, a standard, or a work item. And **the
ranked error list does not exist**. So the mechanism is proven at one
surface and the doctrine covers all of them.

**Queue row Q-11f** opens the general shape, citing this ruling.

## 4. She sees the full permitted record for her assigned households, standing

Not need-to-know per visit. **Judgment requires context.**

**Against the tree: NO CONTRADICTION, this is how it already works.**
`getPrincipal` resolves a standing role on a household and the
permission core filters by sensitivity, not by visit. There is no
per-visit narrowing anywhere.

## 5. A mode demotion is developmental

It feeds training and the scorecard conversation. **The software never
initiates a performance action.**

**Nothing to contradict: mode logic does not exist in the tree** and
enters at Q-15. Recorded here so the session that builds it meets the
rule rather than deriving one. Read beside the adopted mode-logic law in
CLAUDE.md, which already says demotion to Guided is automatic on a
high_consequence error: **automatic DEMOTION is permitted, automatic
PERFORMANCE ACTION is not, and this ruling is what keeps those two
apart** when the same event could be read either way.

## 6. Her own data is hers

She can see everything the system holds about her work, can export it
when she leaves, and what is retained afterwards is only what the
household's continuity requires.

**One third built.** `/my-time` is the self-access half for TIME: every
`time_entry` where the user is the reader, with the WHERE clause as the
wall (the page takes no person parameter, so it can only ever show its
reader themselves).

**The other two thirds do not exist.** There is no export-on-leaving,
and no retention rule for what stays after. Both are named in the
ruling, so **queue row Q-11h** opens them, and the retention half
carries a decision the founder must make rather than a build: what
"only what the household's continuity requires" means row by row.
