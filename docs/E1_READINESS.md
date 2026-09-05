---
status: living
---
# E1 readiness, one page

**Purpose (preparation batch item 1, 4 September 2026).** One page that
answers "how close is E1" without reading four documents. **Kept
current as items land**, which is the point of it; a snapshot would go
stale in a week and read as authoritative, which is the failure this
repository names most often.

**Last refreshed: 5 September 2026.** Every state below is a claim about
the tree or about a founder-side fact on that date. Re-read it, do not
trust it: a dated line is where a claim came from and says nothing about
whether it is still true.

---

## Read this first: two of the four named sources are NOT in this repository

The item names the conditions as scattered across "the v7.0 model,
WK-SEC-001, WK-FIN-012 and the queue". Checked:

| Source | In the repository? |
|---|---|
| WK-SEC-001 | **YES**, `docs/library/WK-SEC-001_Application_Security_Audit_Scope.docx`. Its pass criteria are quoted below verbatim. |
| The build queue | **YES**, `docs/BUILD_QUEUE.md`. |
| The v7.0 model | **NO.** Zero occurrences outside the two ruling documents, which name it only as a pending adoption. |
| WK-FIN-012 | **NO.** Its only occurrence in the whole tree is the preparation batch itself. |

**So this page cannot be the complete E1 condition list, and says so
rather than looking like one.** The rows below are in two blocks: those
DERIVED from a source this repository holds, and those CARRIED from the
founder's own list in the batch, which she wrote from memory and asked
to have checked. A carried row is not evidence that the condition
exists; it is a placeholder until the source lands. **The fix is one
intake of the v7.0 model and WK-FIN-012**, after which this page is
rewritten from them and the carried block should be empty.

---

## Block 1: conditions DERIVED from sources in the repository

| # | Condition | Source | State on 5 Sep 2026 | Owner |
|---|---|---|---|---|
| 1 | **Zero unresolved critical or high findings** touching tenant isolation, authentication and authorization, the photo layer, or the restricted-access class | WK-SEC-001 pass criteria, verbatim | **NOT STARTED.** No assessor engaged; the audit has never run. | Founder (engagement), then engineering (remediation) |
| 2 | **The four named debt items fixed or formally risk-accepted with rationale**: the `visit_photo` schema inconsistency; the Fernbrook field-mapping bug, treated as a potential isolation failure until proven cosmetic; the undocumented PWA layer's on-device caching on shared devices; dependency version drift with a full CVE audit and lockfile discipline | WK-SEC-001 test area 5 | **UNASSESSED as a set.** Each needs its own current-state line, and writing four guesses here would be worse than the blank. **Needs a session** to trace each against the tree. | Engineering |
| 3 | **Retest confirming closure** | WK-SEC-001 deliverables and pass criteria | **NOT STARTED**, follows 1. Note it is included in the engagement rather than a second procurement. | Assessor |
| 4 | **Staging stood up**, seeded with synthetic households only | ADR-007 (its ruled venue); `docs/STAGING_STATUS_2026-08-28.md`; the staging ruling at the head of `STAGING_RUNBOOK.md` | **NOT STOOD UP.** Six dashboard operations, founder-side, under contractor-held accounts by the 28 August ruling. **This gates the whole audit**, because ADR-007 makes staging its only venue. | Founder |
| 5 | **The launch-critical tier complete** (E1 is gated on it ONLY) | `BUILD_RULING_2026-09-03.md` item 2, adopted in CLAUDE.md | **IN PROGRESS.** The queue is the tracker; see block 3. | Engineering |
| 6 | **A real member account on the digest for a month** | `BUILD_RULING_2026-09-03.md` item 2, naming it as part of keeping the gate honest | **NOT STARTED, and structurally blocked upstream:** no real household data enters before the E1 security test passes (Household Zero), so this condition and condition 1 are ordered, not parallel. | Founder |
| 7 | **Thirty stable days** | Q-20 acceptance criterion, which words it as "thirty stable worker days are logged" | **NOT STARTED.** Worth flagging that the queue's wording is WORKER days; whether the founder's "thirty stable days" means the same thing is one sentence from her. | Engineering, measurement founder-side |
| 8 | **Code and accounts in the company's name** | `docs/CUSTODY_TRANSFER_CHECKLIST_2026-08-28.md`; handoff 24.8 | **SEQUENCED, NOT OUTSTANDING.** Blocked on LLC formation, which follows the founder agreements. Trigger: transfer when the entity exists and its accounts are open. The repository is currently under a User account, not an organization (established during the G-73 diagnosis), so 24.8's "GitHub organization" is not yet true. | Founder |
| 9 | **The security-test handoff package assembled** | Q-11 acceptance | **NOT STARTED**; it is preparation batch item 4 and lands as a document. | Engineering |

## Block 2: conditions CARRIED from the founder's list, source not yet in the repository

Each of these is in the batch's own sentence and **cannot be checked
against a source here**. They are listed so they are not lost, and
marked so they are not mistaken for derived conditions.

| # | Condition as stated | What is missing | Owner |
|---|---|---|---|
| C1 | **Insurance bound** | Named in `WORK_QUEUE.md`'s not-software list (workers' compensation, which attaches from the point of employment in Virginia, plus the G-48 hired and non-owned auto question), so the OBLIGATION is in the tree; whether it is an E1 GATE is what WK-FIN-012 would say. | **Founder** |
| C2 | **Payroll live** | Nothing in the tree makes payroll an E1 condition. ADR-004 puts payroll in QuickBooks and bars the app from computing one, so this is entirely a company-side condition. | **Founder** |
| C3 | **"and whatever else the sources actually name"** | This is the honest one: **the answer is unknown until the v7.0 model and WK-FIN-012 are intaken.** Until then, no reader should treat this page as complete. | **Founder**, to supply the two documents |

## Block 3: the launch-critical tier, from the queue

E1 is gated on this tier only. The queue is the live list; this block
names the shape rather than restating rows, so it does not drift.

- **Built and merged:** Q-0 through Q-5, Q-6-1, Q-8b.
- **In flight:** Q-6-2.
- **Open and unblocked:** Q-6g, Q-10, and the unscheduled rows (Q-8c,
  Q-8v, Q-11p).
- **Blocked, each with its condition named on the row:** Q-7 (the
  Pre-Populated Intake Spec, A129, reaching this repository through
  intake), Q-8 (founder fixture content), Q-9 (A2P/10DLC registration),
  Q-11 (staging, hence the assessor), Q-19 (the WK-APP-002 conversion),
  Q-20 (the assessor engagement and staging).
- **The February 2027 fallback** stands: if the queue is not through
  Q-11 by then, the year-two items move behind E1. **E1 does not move.**

---

## What this page says when read as a whole

**The critical path runs through staging.** Conditions 1, 3, 9 and
queue rows Q-11 and Q-20 all sit behind it, and condition 6 sits behind
condition 1 because no real household data may precede the security
test. Staging is six dashboard operations, founder-side, ruled on 28
August to proceed under contractor-held accounts precisely so it would
not wait for LLC formation.

**Two conditions are ordered, not parallel, and it is easy to read them
as parallel:** the security test (1) and a real member account on the
digest for a month (6). The month cannot start until the test passes.
That ordering is the single largest fact on this page for anyone
estimating a date, and nothing else in the tree states it in one place.

**Nothing here is a date.** Lead times belong to the dependency map
(preparation batch item 2) and are deliberately not duplicated.
