---
status: living
---
# The three leverage metrics: what renders today, and what each would take

**Asked 5 September 2026, ahead of an October raise.** Do M-25,
process minutes per verified outcome, and households per HOM render
anywhere today?

**The short answer: one of the three renders. The other two do not
exist in code at all.** Every claim below is a search or a query, named
so it can be re-run rather than believed.

---

## 1. Households per HOM: **RENDERS TODAY**

`apps/web/src/lib/capacity-utilization.ts`, function `perHomUtilization`,
rendered at `apps/web/src/app/(corporate)/oversight/board/page.tsx:269`.
Each row carries the HOM's household count, delivery hours in the last
30 days, and hours per household.

**The rails it runs under, because they constrain how it can be used in
a raise conversation.** Ruling 1 as amended by A581: this is the display
surface of the capacity-gate evaluation, and the only other sanctioned
purpose is the monthly lender covenant report (REQ-083). Visibility is
`corporate_admin` and `cfo_readonly` only, refused in the permission
matrix rather than hidden in the UI (`UTILIZATION_ROLES`). Rows sort by
household count then name, **never by rate**, and no field of a row is a
rank. Testers are excluded; fixtures are excluded.

**What it is not:** a per-person performance number, and it must not
become one in a deck. The covenant report itself does not exist yet
(G-103), so the lender-facing half of this metric is unbuilt.

## 2. M-25, decisions surfaced per household per week: **DOES NOT RENDER**

Zero occurrences of `M-25`, `M25` or `m25` across `apps`, `packages` and
`services`. There is no computation and no surface.

**What it would take, and most of it is in flight.** M-25 is Q-6-2's
own acceptance criterion, and Q-6-2 is being built now. The metric is a
count over the Commitment Ledger, computed and never stored. So:

- **The computation** arrives with Q-6-2, corporate-side.
- **The DATA does not arrive with it.** M-25 counts decisions actually
  surfaced, and decisions are surfaced by the routing that Q-6-2 builds,
  which in turn reads the Decision Rights block. The 17 tier rows now
  stand as recommended defaults, so the routing table exists; what does
  not exist is a stream of real household needs flowing through it.
- **So the honest state after Q-6-2 ships is: the metric computes and
  reads zero or near-zero**, and a zero it cannot distinguish from
  "nothing happened" is worth nothing in a diligence conversation. The
  spec expects M-25 to be LOW AND FALLING, which means the number only
  becomes evidence once there is a baseline to fall from.

**What would make it evidence by October:** running the pipeline over a
fixture household with scripted events, which is exactly the
demonstration path in the new queue row, and turning shadow features on
for the test households so the accumulation starts now.

## 3. Process minutes per verified outcome: **DOES NOT RENDER, and the deeper problem is upstream**

Zero occurrences of `processMinutes`, `process minutes` or
`verified outcome` anywhere in code. Nothing computes it.

**The pieces exist in the schema and are ALL EMPTY.** Queried against
the local database, which carries the demo seeds:

| Table | Rows | Of those |
|---|---|---|
| `work_requirement` | **0** | 0 verified |
| `task_occurrence` | **0** | 0 with actual minutes |
| `time_segment` | **0** | n/a |

**That is the finding, and it is larger than the metric.** All six WL
Gate 1 objects are built, migrated and guarded, and **not one of them
has ever held a row outside a test.** The producers exist in the
application: `time_segment` derives inside the visit-close transaction
(`apps/web/src/lib/visit-command-store.ts:256`), and `work_requirement`
and `task_occurrence` are written by corporate actions
(`apps/web/src/lib/actions.ts:2155` and the drill-in's recording path).
The seeds bypass all three, which is why the demo household shows
visits and hours with no requirements, occurrences or segments behind
them.

**So the metric is not blocked by a missing computation. It is blocked
by having no measured work to compute over**, and writing the query
first would produce a surface that renders a confident zero. That is the
0058 shape: correct, inert, and indistinguishable from a working feature.

**What it would take, in order:**

1. **A producer exercised on purpose**, which the demonstration path row
   provides: a fixture household walked from fact to cascade to decision
   to reconciliation finding, writing real requirements, occurrences and
   segments.
2. **A decision on the denominator.** "Verified outcome" maps most
   naturally to a `work_requirement` with `verified_at` set, since
   verification only ever checks completed work by CHECK. **That mapping
   is not written down anywhere and I am not choosing it here**, because
   a metric's denominator is exactly the sort of definition that looks
   like a decision somebody made once it ships.
3. **A decision on what counts as process minutes.** `task_occurrence`
   carries actual minutes against a requirement; `time_segment` carries
   derived visit time with no requirement link; `time_entry` carries wage
   time. Three sources, and D7 governs where any of them may be shown.
   Which one is the numerator is founder-side.

---

## What this means for an October raise, stated plainly

**One metric is real and constrained; two are not yet measurements.**
The two that are not have different causes and the difference matters:
M-25 is waiting on a build that is in flight, and process minutes per
verified outcome is waiting on the system being USED, which no build
alone provides.

**The cheapest thing that moves both** is the same thing: exercise the
pipeline over a fixture household end to end, and let shadow features
accumulate from ship day rather than from E2. Both are now queue rows.
