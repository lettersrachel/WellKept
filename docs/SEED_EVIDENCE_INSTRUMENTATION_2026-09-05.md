---
status: living
---
# Seed-evidence instrumentation: does a producer exist for what E2 and E4 measure?

**Preparation batch item 3, 4 September 2026.** For each measurement the
milestones name, whether a producer exists today, is queued, or is assumed.

**The instruction's own reason for asking, kept because it is the standard the
answers are held to:** discovering in 2028 that referral share was never
recorded would be expensive; discovering it this week is free.

**Method.** Every verdict is a search or a query against the tree, named so it
can be re-run. **The producer question is asked per MEASUREMENT rather than per
table**, because a table can exist with nothing writing it, which is the exact
failure the producer-per-column rule exists for and which 0058 shipped ten
columns of.

**One limit stated at the top rather than discovered at the bottom: the
documents that DEFINE E2 and E4 are not in this repository.** The v7.0 model and
WK-FIN-012 appear nowhere in the tree. So this page answers "is there a producer
for each measurement the batch names", from the batch's own list, and **it
cannot confirm that list is the whole list.** Where a measurement is inferred
rather than quoted, it says so.

---

## The four the instruction names

| # | Measurement | Producer today | Verdict |
|---|---|---|---|
| 1 | **Time records** | `time_entry`, written by the visit close (`captureHours`), by `createCompanyTimeEntry`, and by the corporate log-time form; `time_segment` derives from an applied visit's own interval | **EXISTS, and is the strongest of the four** |
| 2 | **Retention with reason codes** | `membership_event.cause_code`, required on a cancel (`recordMembershipEvent` refuses a cancel without reason, initiatedBy AND causeCode), plus the `household.departure` covenant event | **EXISTS, and is structurally enforced rather than merely available** |
| 3 | **Referral events** | `household.referral_source` (a six-value enum) and `referral_note`, written by `recordReferral` with a `referral_recorded` audit row | **EXISTS as a household ATTRIBUTE, not as an event. See the caveat below, which is the finding of this page.** |
| 4 | **Process minutes** | **NOTHING.** The denominator does not exist | **ASSUMED** |

---

## 1. Time records: EXISTS

Three producers, all live, all writing today:

- The visit close converts two typed `datetime-local` fields in the operator's
  browser and writes a `delivery` row carrying `visit_command_id`.
- `createCompanyTimeEntry` writes a staff member's own non-delivery time with a
  NULL household (0059), attribution structural since `user_id` is never an
  input.
- `time_segment` derives one segment per applied visit, personless by
  construction.

**Since 0060 and 0061 every new row carries its zone**, and the pre-0060 manual
rows were converted DST-aware with the counts recorded row by row (G-119). So
the time series is trustworthy from its own beginning rather than from the fix.

**The honest limit, and it matters for measurement 4:** the visit interval is
ONE interval that a person types. There is no segmentation of it, by decision
(section 29 bars a universal HOM stopwatch), and `time_segment`'s nine-kind
taxonomy currently resolves to one derived row.

## 2. Retention with reason codes: EXISTS, and better than "available"

`recordMembershipEvent` **refuses** a cancel that lacks a reason, an initiator
or a cause code. So retention-with-cause cannot be recorded without its cause;
the data cannot arrive half-formed and be discovered incomplete later. Cause
codes are household-level and unaffected by the per-person analytics boundary,
which the boundary itself says in as many words.

**Queued rather than missing:** the monthly covenant report that consumes this
does not exist (G-103), and Phase 2's acceptance criterion for it is **not
currently satisfiable as written**, because per-HOM utilization cannot be a pure
function of the outbox while the covenant events deliberately carry no person.
That is a reported specification question, not an instrumentation gap: the
retention data will be there when the report is written.

## 3. Referral events: THE FINDING

A producer exists and **it does not produce what the word "events" implies**.

`household.referral_source` is a COLUMN ON THE HOUSEHOLD. One value, overwritten
in place by `recordReferral`. So:

- **A household has one referral source, forever, as last set.** Changing it
  overwrites; the prior value survives only in the `referral_recorded` audit
  row's `detail.from`, which is a log rather than a queryable series.
- **There is no referral EVENT and no referrer.** Nothing records WHO referred,
  WHEN, or whether a referral converted. A household referred by an existing
  member is indistinguishable from one referred by a professional, beyond the
  six-value channel.
- **A lead who never signs has no record at all**, which is not an oversight: no
  record about a non-client may exist before REQ-077 is built (W-15, G-56), and
  that is standing policy.

**Why this is the item worth acting on.** "Referral share" is computable today
as a share of households by channel, which is probably enough for E2 and is
**not** enough for the thing companies usually mean by referral measurement: a
referral rate per member, or a conversion rate, or a cohort. **The distinction
is invisible until somebody asks the second question**, and by then the history
is a column that was overwritten.

**One decision would settle it, and it is the founder's:** whether referral is
a household attribute (today's shape, fine, say so) or an event with an actor
and a date. If the second, it needs its own row and it collides with the
non-client record rule, since a referrer who is not a member is exactly the
class REQ-077 governs. **Not opened as a queue row here**, because choosing
between those is choosing a data model on her behalf.

## 4. Process minutes: ASSUMED, and the denominator is the problem

**Nothing computes this and it is the one genuine gap.**

"Process minutes per verified outcome" needs a numerator and a denominator:

- **The numerator** is minutes attributable to a process step. The system holds
  one typed interval per visit. Splitting it needs either segmentation the HOM
  performs, which section 29 bars, or derivation from events the system does not
  emit at that granularity. **This is the unresolved ExecutionActual conflict**,
  reported and not resolved: ExecutionActual specifies seven segments and
  section 29 forbids a universal stopwatch, and both cannot hold.
- **The denominator** is "verified outcomes". `work_requirement` has a
  verification pair that only ever verifies completed work, and `task_occurrence`
  records what happened. **Both exist and neither is populated by a live field
  path**: v1 recording is corporate-side by decision, not a field capture
  obligation.

**So the measurement is assumed twice over**, and neither half is an
oversight: the numerator is blocked on a founder ruling about the field day, and
the denominator is blocked on the same recording surfaces WL Gate 2 waits for.

**What this means concretely: if E2 is measured in 2027 from time records, the
answer will be visit minutes per household, not process minutes per verified
outcome.** Those are different numbers with a hidden conversion between them,
which is the G-77 shape. Saying so now is free; discovering it at the
measurement is not.

---

## What is measured today and was not on the list

Recorded because a completeness question deserves both directions, and because
the list this page was given is the founder's from memory rather than from the
two absent documents.

- **Households per HOM** renders on the corporate board under the A581 rails.
- **Outbox drain health**, a `rows_waiting_after_run` metric per run, live since
  the worker redeploy.
- **Mail deliverability** by kind over 30 days, with a heartbeat, live since Q-1
  was activated.
- **Visit reconciliation**: days since the last applied visit against a
  founder-set knob.
- **Every state-changing action**, in the audit trail, with hashes rather than
  values.

---

## The three things to do about this, in order

1. **Nothing, for time records and retention.** Both are instrumented and one is
   structurally enforced. This is the good news and it is most of the list.
2. **One founder sentence on referral**: attribute or event. Today's shape
   answers "what share came from referrals" and cannot answer "which member
   referred whom, and when". If the second is ever wanted, the column will have
   been overwritten by then.
3. **Accept that process minutes is not instrumented and will not be by E2**
   unless the ExecutionActual conflict is ruled. **The alternative to ruling it
   is measuring something else and calling it this**, which is the outcome worth
   naming in advance.
