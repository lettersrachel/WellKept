---
status: living
---
# The UNCERTAIN rows, for the founder's verdicts

**Preparation batch, decision 4 of the 5 September blocker rulings.** One list,
each row with what the verdict turns on in one line, the two candidate verdicts,
and the tree's precedent where there is one. Answer straight down the page.

**CORRECTION FIRST, because it changes the size of the job.** I told you there
were **15** UNCERTAIN rows. **There are 8.** I counted lines containing the word
`UNCERTAIN` in the draft, which included seven lines of the document's own prose
explaining what UNCERTAIN means. The document itself says "the eight UNCERTAIN
rows in the catalog below", two screens above the number I reported. **That is
the counted-the-wrong-unit failure this repository names**, committed while
handing you a list of blockers. So this is closer to twenty minutes than forty.

**The vocabulary is the draft's own**, so a verdict pastes straight in:

- **`T-###`** (or several): the T-ids whose work this row executes.
- **`NO-MAP: <one line>`**: no defensible counterpart, WITH the reason. Under
  R18 this is a DECISION and not an unresolved row, and it carries the same
  weight as any mapping. **The reason is required and is the point:** "no
  defensible counterpart" recorded against a row that named a candidate says
  the near miss was considered and rejected, which a row that never had a
  candidate cannot say.

**A note on which way to lean, since it applies to six of the eight.** Every one
of these is "is the small recurring thing INSIDE the bigger commercial task, or
beside it". Mapping it inside makes the commercial catalog tidier; mapping it
beside makes the operational catalog honest about what a HOM actually does.
**The mapping is one-to-many throughout, so `T-x` and a second row both pointing
at `T-x` is a legal and common answer**, and "inside" does not require the
smaller row to disappear.

---

## 1. WKT-010, Leftovers portioning and labeling
Sources: STD-001.1.4, STD-002.4. Candidate: **T-011**.

- **Turns on:** whether the fridge audit is a single task that includes handling
  what it finds, or an inspection whose findings are executed separately.
- **Candidates:** `T-011` (inside the fridge audit) · `NO-MAP: portioning is
  execution, the audit is inspection`.
- **Precedent:** none directly. The nearest analogue in the tree is
  `work_requirement` versus `task_occurrence`, which keeps the planned instance
  and what actually happened as separate objects, and that pattern leans toward
  **inside**: the audit is the recurring unit and portioning is what it produces.

## 2. WKT-017, Bathroom hazard-storage check
Sources: STD-004.8. Candidate: **T-052**.

- **Turns on:** whether child-safeguarding compliance is defined broadly enough
  to cover hazard storage, or is specifically about child presence.
- **Candidates:** `T-052` (inside child safeguarding) · `NO-MAP: hazard storage
  applies to every household, not only those with children`.
- **Precedent, and it points at NO-MAP.** This is the only row of the eight with
  a live doctrine attached: the standing invariant that **no behaviour may
  require a disability, age, diagnosis or vulnerability flag**. Mapping a
  universal safety check under a child-specific task makes the check's existence
  contingent on a household characteristic. **This one I would flag even if the
  mapping were tidier**, and it is the row worth spending the most of your
  twenty minutes on.

**RULED 5 September 2026 (founder): `NO-MAP`. WKT-017 stands alone as a
universal check and does not sit under T-052.** Her reasoning, recorded with the
verdict because under R18 the reason is the point and not a formality: **a
universal safety check mapped under a child-specific task makes the check
contingent on a household characteristic, which runs at the standing
invariant.** So the near miss was considered and rejected on doctrine rather
than on fit, which is a different and stronger reason than "the work does not
match", and a later reader reopening this row needs to meet the invariant rather
than re-argue the taxonomy. **One verdict in, seven to go.**

## 3. WKT-024, Delicates and specialty garment care
Sources: STD-006.6. Candidate: **T-085**.

- **Turns on:** whether T-085's dry-clean circuit is defined by the GARMENT
  class or by the out-of-house logistics.
- **Candidates:** `T-085` (one garment-care task, in or out of house) ·
  `NO-MAP: T-085 is a courier circuit; in-home delicates care shares the
  garments and not the work`.
- **Precedent:** the operational catalog's own grain is the EXECUTION unit, and
  in-home hand-washing and a drop-off run are different executions. That leans
  **NO-MAP**, and it is the clearest of the six "inside or beside" rows.

## 4. WKT-025, Laundry machine upkeep
Sources: STD-006.5, STD-006.7. Candidate: **T-025**.

- **Turns on:** whether T-025's filter changes are appliance-general or named to
  a specific appliance set that excludes laundry machines.
- **Candidates:** `T-025` (one filter-and-upkeep task across appliances) ·
  `NO-MAP: laundry machine upkeep is its own cadence`.
- **Precedent:** the registry treats appliances as individual entries with their
  own maintenance clocks rather than as one class, which leans **NO-MAP**. Worth
  checking against T-025's actual wording, which I cannot read: the commercial
  extract in the repository is figure-free and I have its id and label, not its
  full definition.

## 5. WKT-036, Unhomed-item landing and pattern watch
Sources: STD-003.7. Candidate: **T-281**.

- **Turns on:** whether the weekly landing habit is part of staging decluttering
  for a member decision, or the ongoing observation that eventually produces one.
- **Candidates:** `T-281` (inside decluttering) · `NO-MAP: T-281 is an event,
  the landing is a standing habit`.
- **Precedent, and it is the strongest in the sheet.** The tree keeps NOTICING
  and RESOLVING structurally apart: `attention_record` is the noticing,
  `decision_record` is the choice, and resolving a situation closes the grouping
  and never the noticing inside it. WKT-036 is described as a landing AND a
  pattern watch, which is noticing; T-281 stages a decision. **That leans
  NO-MAP** and would keep the catalog consistent with how the software already
  thinks.

## 6. WKT-042, Ice and snow same-day clearing
Sources: STD-013.2. Candidate: **T-006**.

- **Turns on:** whether the post-storm exterior CHECK includes clearing, or
  inspects and reports.
- **Candidates:** `T-006` (check and clear as one task) · `NO-MAP: clearing is
  same-day time-critical work, the check is scheduled`.
- **Precedent:** the same inspect-versus-execute shape as row 1, and it should
  probably be answered the same way for consistency rather than separately.
  **The one difference worth weighing: this one is time-critical and safety
  shaped**, so a mapping that hides clearing inside a scheduled check could
  make an urgent task look routine on a forecast.

## 7. WKT-047, Linen closet upkeep
Sources: STD-015.2, STD-000.4. Candidate: **T-021**.

- **Turns on:** whether the closet's own upkeep is part of changing the linens
  or a separate recurring unit.
- **Candidates:** `T-021` (inside the linen change) · `NO-MAP: the closet has
  its own cadence, longer than the linen change`.
- **Precedent:** cadence is the operational catalog's organising idea, and two
  different cadences are usually two rows. **Leans NO-MAP**, though this is the
  weakest signal of the eight and would be defensible either way.

## 8. WKT-055, Subscription observation and proposal
Sources: STD-017.5. Candidates: **T-092, T-115** (each half).

- **Turns on:** whether one operational row may map to two commercial rows that
  together cover it, or whether being half of each means it is neither.
- **Candidates:** `T-092, T-115` (both halves) · `NO-MAP: observation-and-propose
  is a single unit that neither execution row contains`.
- **Precedent, and this is the only row where the mapping's own rules answer
  it.** MAPS_TO is explicitly ONE-TO-MANY throughout the draft, so mapping to
  both is not a compromise, it is the shape the join was built for. **Leans
  `T-092, T-115`**, and it is the one row of the eight I would call close to
  settled by convention rather than by judgment.

---

## What happens when the verdicts come back

Nothing is assumed in the meantime, per your instruction: **WL Gate 2's
estimator does not proceed on an assumed answer, and none of these is guessed.**

The verdicts, applied in one pass through the floor-importer discipline, then
allow, in this order: the draft freezes, `task_definition`'s provisional flags
flip, the Inventory loader is admitted, and WL Gate 2's estimator unblocks.
