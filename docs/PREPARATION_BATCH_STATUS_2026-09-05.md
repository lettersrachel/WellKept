---
status: living
---
# Preparation batch: what has landed, and what is blocked

**The batch's own rule is to report each item as it lands rather than batching
the reports**, so this page is the index of where things stand, not a substitute
for the reports themselves. Each row points at its deliverable.

| # | Item | State | Deliverable |
|---|---|---|---|
| 1 | E1 readiness as one live page | **LANDED**, now carrying the unverified-against-source mark | `E1_READINESS.md` |
| 2 | Dependency map to E1, with the critical path | **LANDED** | `DEPENDENCY_MAP_TO_E1_2026-09-05.md` |
| 3 | Seed-evidence instrumentation check | **LANDED** | `SEED_EVIDENCE_INSTRUMENTATION_2026-09-05.md` |
| 4 | Security-test handoff package | **LANDED**, and it produced the WK-SEC-001 amendment | `SECURITY_HANDOFF_PACKAGE_2026-09-05.md`, `WK-SEC-001_v1_1_AMENDED_SCOPE.md`, G-130 |
| 5 | WK-APP-002 extraction into the loader's YAML shape | **BLOCKED, and the founder confirms the block was correct and the instruction was hers in error.** The SHAPE is authorized separately and DELIVERED | `docs/triggers/SHAPE.md`, the validator, the worked example, Q-11z |
| 6 | Three fixture household workbooks | **LANDED**, and it found a defect by loading its own deliverable | `tooling/seed/fixtures/` (three workbooks plus README), Q-11y |
| 7 | Empty Household Green workbook | **LANDED**, with the estimated pre-fill clause deliberately NOT done | `tooling/seed/household_green_workbook.json`, `docs/HOUSEHOLD_GREEN_WORKBOOK_2026-09-05.md` |
| 8 | Decision Rights confirm-or-amend sheet | **LANDED**, generated rather than transcribed | `docs/DECISION_RIGHTS_REVIEW_SHEET.md`, `tooling/review/decision-rights-sheet.mjs` |
| 9 | Evaluation forms and scenario stubs | next | |
| 10 | Freeze packet item A, laid out | | |
| 11 | G-register triage | | |
| 12 | Two queue rows to open | **LANDED** | Q-11t (Foundation Reset, blocked on WK-SVC-004), Q-11v (staff-side member view, since CLOSED) |

---

## Item 5 is BLOCKED, and the batch itself disagrees with the spec register

**WK-APP-002 is not in this repository.** Confirmed three ways rather than by a
single search, since a search that cannot see is this week's recurring failure
(G-129):

1. **No file.** `find` across the tree for any name containing `WK-APP-002`
   returns nothing, and `docs/library/` holds eleven files, none of them it.
2. **The spec register says so, and says more.** `SPEC_REGISTER.md:34` stamps it
   **`not-in-repository (prose)`** with the note: *"Trigger rules exist in-app
   today; the yaml conversion (pre-Q-19) is founder-side and new."*
3. **The queue row that consumes it says so.** Q-19's dependency column reads
   **"WK-APP-002 (converted; founder task)"**.

**So this is not merely a missing document, it is a DISAGREEMENT between two
instructions, and the standing rule is to report both and stop.** The
preparation batch asks this session to perform the extraction. The spec register
and the queue both record the conversion as a founder task that has not
happened. Under the intake rule a document outside the repository is not a build
authority, and a spec is a session input only when stamped verified or
plan-of-record; `not-in-repository (prose)` is neither.

**What I did not do, and why it would have been the wrong kind of helpful.** The
YAML target shape is derivable from `trigger_rule`'s existing columns, so I
could have defined the container and left the founder to fill it. That is
building around a missing prerequisite rather than reporting it, and it would
have produced a schema for seven life-domain sections whose actual structure
nobody here has read. **If the shape is wanted ahead of the document, that is a
separate instruction and a good one**; it is not this item.

**Also unresolvable from here, and worth knowing before the document arrives:**
item 5 asks whether section 3.7 is rows or doctrine that belongs in the loader's
header. That is a question about the document's own contents and cannot be
answered without it.

**What unblocks it:** the founder supplies WK-APP-002, or the converted YAML if
the conversion is already done founder-side. **Then the extraction is
mechanical**, and the two clauses that need a schema rather than a document are
ready: resolving an IF that names a human description against real fields, and
reporting the row count per section.

**One thing it unblocks downstream, so the cost is visible:**
`trigger_rule.stage` shipped inert with no producer, and this conversion is its
only named route out (founder ruling Part One item 4, 4 September). It stays
inert until Q-19 runs, and Q-19 waits on this.

**Proceeding to item 6**, per the standing authority that missing specs do not
stop the run.
