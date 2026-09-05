---
status: living
---
# Decision requested: what makes a changeset safe to apply without asking

**For the founder. This is a decision, not a build** (her instruction, 5
September 2026: bring it as a decision with the candidate classes and what each
would permit). Nothing here is implemented, and the shipped code deliberately
has no automatic classifier: `changeset.classification` is nullable with no
default and only a person sets it.

## RULED 5 September 2026 (founder): CANDIDATE 1

**Nothing is automatic. A person classifies each change. Revisit when there is
traffic.** The shipped behaviour is the ruled behaviour, so no code changes.

**Her reasoning, recorded because it is the part that generalises, and because
the obvious future argument runs the other way.** The two costs are not
symmetric and **the asymmetry does not improve with volume**:

- The cost of candidate 1 is **a few minutes a week** of somebody classifying.
- The cost of a wrong automatic class is **a change applied to a household
  nobody chose**.
- And **at volume nobody reviews what the machine did.** The argument that
  automation becomes necessary as changes multiply is exactly the argument
  under which the second cost stops being caught, because the review that would
  catch it is the thing volume removes.

So "we will automate this once there is enough of it" is not a plan that gets
safer with scale; it is the same trade with the safeguard removed. Revisiting
is permitted when there is traffic to look at, and the revisit is about
evidence rather than about volume.

**Candidate 3 is not merely rejected here; its rejection is now a standing
rule** in `CLAUDE.md`: a grant made in one domain never governs another,
whatever the mechanism. That covers ceilings, consents, standing approvals and
mode promotions alike, so the next mechanism that looks like a convenient
source of permission meets it before it is built.

## What is already decided by the code, so the decision is narrower than it looks

Three things are settled and are not what is being asked:

1. **The two-set vocabulary is the spec's own** and is not up for revision:
   `safe_automatic` and `review_required` (intake BENCHMARK_ADOPTION section 2).
2. **NULL is not permissive.** The database refuses an application on any row
   that is not classified `safe_automatic`
   (`changeset_applies_only_when_safe`). An unclassified change cannot slip
   through as safe; it simply does not apply.
3. **Applying is a separate act from classifying**, each with its own author
   and time, so a class can be set without anything happening.

**What is being asked is only this: which kinds of change may a machine put in
the `safe_automatic` box.** Until that is ruled, every changeset is classified
by a person or not at all.

## Why this is yours rather than an engineering default

The same reason the capture router ships with no severity rules and the
notification firewall shipped five destinations while its policy produced two:
**a rule that decides what happens without asking is a safety rule.** A
plausible default here would look exactly like a decision somebody made, and
would be discovered later as a rule nobody chose. The cost of leaving it blank
is that a person classifies each change, which at current volume is a few
minutes a week.

## The candidate classes, and what each would permit

Five candidates, ordered from the narrowest. **Each row states what a machine
would be allowed to do without a person**, which is the only question that
matters; the label is secondary.

| # | Candidate class | What it would permit without asking | What it risks |
|---|---|---|---|
| 1 | **Nothing is automatic** | No changeset is ever machine-classified. A person classifies each one. | Nothing. This is today's shipped behaviour and the honest floor. |
| 2 | **Timing-only moves, same commitment** | A source change that moves WHEN something happens without changing WHAT was committed (soccer Saturday to Sunday) marks its dependents invalidated and, later, lets a regenerated instance replace the stale one. | A move can change what is possible: a Sunday slot may collide with something the record does not hold. The machine cannot see a collision it has no data for. |
| 3 | **Same-materiality, below the ceiling** | A change whose consequence stays within a Decision Right the household already granted, at or below its ceiling, applies. Reuses the routing already built for `expected_event`. | Ceilings were granted for spending, not for schedule or scope changes. Reusing them here would extend a grant into a domain nobody granted it for, which is the reasoning that settled the every-ceiling-permits call. |
| 4 | **Reversible changes only** | Any change a person can undo in one act applies; anything irreversible routes. Maps to the adopted reversibility classes in the mode-logic spec (section 4a). | Reversibility is a property nothing in this tree computes today. It would need its own column and its own producer before this class means anything. |
| 5 | **Everything except a named list** | The machine applies by default and routes only what a founder list names. | Wrong direction for this system, and named here only so it is visibly rejected rather than never considered: it makes silence permissive, which is the shape every guard in this tree is built to avoid. |

## What each candidate needs before it could be built

- **1** needs nothing. It is what ships.
- **2** needs a way to tell a timing move from a substance change, which today
  is a sentence an operator typed. It would need the source change to carry
  structure rather than words, and that is a schema decision.
- **3** needs your word that a spending ceiling may govern a non-spending
  change. **The engineering read is that it may not**, for the reason recorded
  on Q-12b-1: a right granted in one area should not silently widen another.
- **4** needs a reversibility column with a producer, which is Q-17b's AI
  release-governance work and not this row's.
- **5** needs nothing technically and is not recommended.

## What is NOT part of this decision

**Retiring stale work.** The propagation records that a dependent is
`invalidated`; ACTING on that record would need a tenth `work_requirement`
status, and that CHECK carries nine which 0051 recorded as the full adopted
lifecycle. Adding one is a semantics change to a shipped primitive and is a
separate ruling, whichever classifier you choose.

**The lock horizon.** `changeset_lock_horizon` ships null and nothing locks
while it is null. Per your instruction it **stays null until observed data sets
it**, the same posture as `mail_webhook_silence`: a number chosen before there
is anything to look at is a threshold nobody measured.

## The engineering recommendation, stated so you can disagree with it cheaply

**Candidate 1 until there is traffic to look at**, then candidate 2 if timing
moves turn out to be most of what happens. The reason is not caution for its
own sake: candidates 2 through 4 each need something the tree does not hold
(structure on the change, a grant that covers the domain, a reversibility
class), so choosing one now would mean building the missing half to a shape
nobody has tested against real changes.
