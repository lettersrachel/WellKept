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

**RULED 5 September 2026 (founder), and the shape of the answer matters
more than the answer.** A per-visit report is EXEMPT from the ceiling as
the record of a thing that happened. **The exemption is conditional: a
report containing any request, question, decision or call to action
counts.** And the counter is built over every member-reaching channel
REGARDLESS, so the exemption is a classification of a send rather than
an absence of measurement.

**That ordering is the whole ruling.** The cheap reading of "reports are
exempt" is that reports need not be counted, which is how a channel
disappears from a ledger: nothing measures it, so nothing can later
re-classify it, and the remedy clause above ("the system should say so
rather than send") again has nothing to run on. Measuring first and
classifying second means a report that grows a question one day is
caught by a rule rather than by somebody remembering this paragraph.

**Still not fixed here.** Both channels are member-facing, which is
never pre-authorized. **Queue row Q-11c** carries the ruling and its
both-directions acceptance criteria.

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

**RULED 5 September 2026 (founder): Q-11f GENERALISES `prompt_outcome`
to every proposal, with the ranked error list as its consumer**, rather
than adding a second dissent mechanism beside the one that works. The
append-only, no-update-path property carries forward as a REQUIREMENT of
the general shape and not as an inherited detail of the table it grew
from: **a dissent that can be edited afterwards is a dissent the system
can be talked out of**, which is the failure this doctrine exists to
prevent, arriving through the back door.

**Queue row Q-11f** carries the ruling.

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
ruling, so **queue row Q-11h** opens them.

**THE RETENTION CONFLICT ON `time_entry`, RULED 5 September 2026
(founder): WK-SOP-017's four-year wage retention WINS.** The clause
above and WK-SOP-017 pointed in opposite directions on one table: "only
what the household's continuity requires" would release a wage record
the moment continuity stopped needing it, and WK-SOP-017 requires four
years of it. **The reason the obligation wins is not seniority or
recency: it is that one rule is a legal obligation and the other is a
promise the company made itself.** A self-imposed promise, however
good, does not override a statute-backed one, and a company that let it
would be discharging its own commitment by breaking somebody else's.

So the sentence at the top of this section reads, in full: what is
retained afterwards is only what the household's continuity requires,
**except where a retention obligation says otherwise, and on
`time_entry` it does**. Recorded here rather than only in the queue row
because this document is where the two rules met, and a reader
arriving at the continuity clause needs the exception in front of them
rather than one file away.

**Still the founder's, and Q-11h reports and stops on it:** every table
OTHER than `time_entry`, where no retention obligation speaks and the
continuity reading governs alone. The ruling settles the collision, not
the whole question.
