---
status: living
---
# What gets harder once a real household record exists, and the deploy state

28 August 2026. Two questions answered against the repository. Report only.

**Section 2 is a photograph.** It describes what a deploy would do from the
current `main`, and it goes stale on the next merge. Section 1 does not go
stale the same way, because it is about ordering rather than state.

---

## 1. What becomes materially harder, or impossible, after the first household record

Sorted by the MECHANISM that makes it hard, because the mechanism is what
tells you whether an item can be recovered later or not. Three of the five
classes cannot be recovered.

### 1.1 Impossible afterwards: facts that can only be captured at their moment

**This is the sharpest class and the repository already has its precedent.**
G-66 refused to backfill role-assignment history because doing so would have
required inventing an actor and a reason. The same refusal applies to every
item below, which means that after the first real household these are not
"unbuilt features". They are **permanent holes with a date on them**.

| Item | Why it cannot be recovered |
|---|---|
| **Photo consent scope and restrictions** (row 4 item 5; WK-SEC-001 test area 4) | Captured at onboarding. If the field does not exist when the member signs, the record cannot say what was consented without asking again, and asking again is a different consent on a different date |
| **WK-LEG-005 access authorization**: which access methods were granted, and the restrictions on each (row 3 item 5) | Same shape. Signed at onboarding, and the restrictions are the part that matters |
| **Per-room photo scope** (row 8 item 2) | `visit_photo` carries no room and no scope. Every photo taken before the column exists is unlabelled forever; labelling them later is a guess about a picture |
| **Knowing state and confidence on rows written before RFC-ATTR-01 lands** | The RFC already concedes this: the 22 unassessed `registry_entry` rows stay NULL, because inventing a confidence for a row nobody looked at is the claim G-66 forbids. Every real household row created before the attributes exist joins that set |
| **Registry install dates and derivation** for the household's own objects | 0058's columns exist; a household intaked before they are written to carries NULLs that only a re-survey of the house can fill |

**The general form:** a fact about a moment can only be recorded at that
moment or by asking the person again. Everything else is reconstruction, and
reconstruction that carries no marker is indistinguishable from a record.

### 1.2 Barred afterwards: doing it later means the rule was broken

Not harder. **Out of order.**

- **The WK-SEC-001 white-box audit.** ADR-007 makes staging its venue and
  synthetic data its subject, and its pass criterion is literally "is this
  system safe to hold real household data". Running it after real data has
  landed answers a different question, and its own gating sentence ("no member
  data enters the system before clearance") would already have been broken.
- **The restricted-access class** (do-not-admit, child-pickup, welfare notes,
  WK-SEC-001 test area 3). Enforcement has to precede the data. A household
  with a do-not-admit fact recorded before server-side enforcement exists is a
  household whose most sensitive fact sat unprotected, and no later build
  undoes the window.
- **REQ-077 / W-15.** No record about a person who is not a client may be
  created before the member_circle register exists. That gate is already
  standing and the first household is exactly when it gets tested.
- **Privacy notice and legal README accuracy.** Both must be true at the
  moment collection begins. A category added after collection means the notice
  the member read was wrong when they read it, which no same-PR update repairs
  retroactively.
- **The G-13 staff disclosure**, before any new staff-attributed capture
  surface. Same reasoning, pointed at the HOM rather than the member.

### 1.3 Materially harder: every schema change becomes a data migration

Today a migration runs against fixtures that can be truncated and re-seeded,
and a mistake costs a re-run. Afterwards each one carries a rollback question
and, for two of them, a retention question.

- **G-111's `time_entry` change.** Making `household_id` nullable on a table
  holding real wage records under a four-year retention rule is a different
  operation from doing it on fixtures. **It also has a clock independent of
  this list**: the founder's own reading is that it is the difference between
  compliant and non-compliant wage records, and the first payroll run is
  February 2027.
- **The access-custody split** (person-scoped grant, household-scoped events).
  WK-SOP-012 calls the access log the company's audit trail and requires it be
  producible to police under the intrusion protocol. Migrating a custody chain
  that is already evidence is a materially different risk from migrating an
  empty table.
- **RFC-ATTR-01's migration steps 2 to 5.** Each is a value mapping. With real
  rows, a wrong mapping is a wrong claim about a household rather than a wrong
  claim about a fixture.
- **Row 8's per-room photo column**, which is 1.1 and 1.3 at once: harder to
  add, and unable to describe anything already taken.

**Two standing rules bite harder here than they read.** One migration per
session becomes a real constraint rather than a discipline, and "generated
migration SQL is READ before it is applied" stops being about a broken file
and starts being about a data loss.

### 1.4 Materially harder: anything that needs a clean baseline

A calibration input taken from polluted data is not merely wrong; it is wrong
permanently, because nothing re-derives it.

- **`flag_promotion.rateThreshold` and the `informativeRateFloor`** (W-2, W-9).
  The displayed firing rate IS the calibration input. At one-to-three household
  scale a single delinquent object re-firing monthly depresses it, and a floor
  set from that under-retires **forever**. This is already in the queue; a real
  household mixed into the reading makes it harder to separate, not easier.
- **WL Gate 2's estimator calibration**, which is deliberately gated on HG
  actuals and is the well-handled version of the same problem.

### 1.5 Materially harder in practice, not in code

- **Erasure becomes one-way.** Today the dry run enumerates fixture rows and a
  mistake costs nothing. The first real erasure is a live event, and
  `--erase-time-and-costs` can reach inside a wage-retention window.
- **The trace's four noticeable clauses** (no substitution notice, no scheduled
  resume, the report's contents, the emergency affordance) are cheap to build
  now and become interruptions to live service later. Same code, different
  cost.

### 1.6 What is NOT harder afterwards, said so the list is not padded

The WK-SOP-016 amendment, A213 on paper, PAPER-PARITY's text,
`WK-DEV-006:30`, the WK-TRN-009 checklist, the CAND promotion column, row 13's
billing view, and the G-108 pointer. All are documents or decisions, and none
degrades because a household exists.

**One caveat on WK-TRN-009**, since the R22 correction changed its urgency for
a different reason: the interim control is running at half strength today, and
that is true whether or not a household exists. It is not on this list; it is
ahead of it.

### 1.7 The order this implies

If the question is what to do before the first household record, and nothing
else changed:

1. **The six staging clicks**, because ADR-007 makes staging the audit's only
   venue and the audit is 1.2's first item. Everything in Phase 1 is behind
   them.
2. **The WK-SEC-001 audit**, and the restricted-access enforcement it names.
3. **Photo consent scope and WK-LEG-005 capture**, because they are 1.1 and
   they are cheap: fields and a form, not a subsystem.
4. **RFC-ATTR-01 step 1** (the vocabulary module and its guard, no migration).
   Cheap now, and it is what stops an eleventh provenance mechanism appearing
   while the rest is decided.
5. **G-111's paid-time answer**, which has its own February clock anyway.
6. **The calibration floors**, which need a clean read and cannot get one
   later.

---

## 2. What is needed to deploy, as of 28 August 2026

**A photograph. Re-derive it before acting on it.**

### 2.1 The delta

- **Production serves `7bcbb16`** (the fourteenth clean run, 27 August).
- **`main` is at `b5282db`**, which is **110 commits ahead**, counted with
  `git rev-list --count`.
- **No migration is pending.** 59 files in `packages/schema/drizzle`, and
  production read 59 at the fourteenth run. **The three-way count should read
  59/59/59 and the preflight should report nothing pending**, which is the
  second zero-migration deploy since the batch era.

### 2.2 It is NOT docs-only

The delta carries real application code. The material items:

| Change | Surface |
|---|---|
| The prompt-timing module and panel rules (computed label, answering retires, dismiss requires a reason, `firedAt` now written) | `/visit`, the corporate prompt surfaces |
| `getHousehold` replaced by `anyHouseholdExists`, and the `seeded` distinction | `(client)/playbook`, `(hm)/visit`, `(hm)/intake`, the role previews |
| The corporate board relabel (R26/G-109) | `/oversight/board` |
| The visit hours copy (G-104) | `/visit` |
| The registry sweep and field-brief changes | briefing surfaces |
| The native hours capture fix | **not deployed**: no Apple Developer enrollment, so the app is not on a phone |

### 2.3 The gates, and what each will do

- **CI gate**: `b5282db` carries a **green `ci` push run**, read from the runs
  API today. It would pass.
- **Currency gate (G-82)**: passes if the named sha is the `origin/main` tip at
  the moment of the run. It will refuse a stale sha, which is the point.
- **Dirty-tree guard**: the deploy ships the working tree, so the tree must be
  clean.
- **Env-presence gate**: the five variables must be present on the project.
- **Preflight (G-63)**: read-only. It will report nothing pending and apply
  nothing.

### 2.4 The sequence

From the **repo root**, against the named sha:

    bash tooling/deploy.sh <sha>

Migrations run before the web deploy. Vercel does not auto-deploy on push. **Do
not run anything from `apps/web` with `--yes`**: it suppresses the only
confirmation and silently creates a third project.

Then DEPLOY.md section 4 against the **Smoke Test Fixture**, set up with the
idempotent `ensure-smoke-fixture.mjs`. If that script refuses with a pinned-id
mismatch **on production, stop and re-pin**; do not let a second fixture be
created.

### 2.5 Which section 4 checks this delta owes

Computed from the changed files rather than from what the checks are about,
per the carried-forward rule. **Proposed, for confirmation:**

| Check | Why this delta touches it |
|---|---|
| **8**, CEO previews (client and HM projections) | `(client)/playbook/page.tsx` and `preview/[role]/page.tsx` both changed |
| **10**, both briefing surfaces | `field-brief.ts` and `(hm)/visit/page.tsx` changed |
| **14**, `/oversight/triggers` health line | `prompt-timing.ts` is new and `registry-sweep.ts` changed; the prompt panel's rules changed materially |
| The visit close, not numbered | `VisitWizard.tsx` and `actions.ts` changed, including what `recordPromptOutcome` writes |
| The corporate board, not numbered | the R26 relabel; it should be read once with eyes, since its whole point is what it says |

The mechanical checks (1, 4a, 4b, 12, 15) run every time regardless.

**Checks 2, 6 and 14 were already owed** before this delta, from the ledger
opened on 27 August. Check 14 appears in both lists for two different reasons,
which is two debts on one check and stays two rows rather than being merged.
