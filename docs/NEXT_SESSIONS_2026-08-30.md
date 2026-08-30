---
status: living
---
# Next sessions, as of 30 August 2026

Supersedes `NEXT_SESSIONS_2026-08-28.md` as the index of open work; that file
stays as the dated record and is referenced where its write-ups are still the
best ones. Read `CLAUDE.md` and `WORK_QUEUE.md` first; this file does not
repeat what loads automatically.

**State in one paragraph.** Production serves `45c40be` (seventeen clean
runs). Fernbrook is demo-ready with nothing open: the G-113 defects and both
flakes are fixed and verified, the seeds are linked and clock-consistent, and
the change log speaks in sentences. The WK-OPS-002 trace is complete across
all fourteen rows with four rulings applied (R23-R26). What remains splits
cleanly into founder decisions, build sessions, and library-side edits, and
that is how this file is organized.

---

## A. Founder decisions holding builds

### A1. G-111, the paid-time answer: ADOPTED AND BUILT, in review

Ruled 30 August and built the same day as migration 0059 (G-111 second
addendum): nullable household subject on `time_entry` only, the WK-SOP-017
vocabulary verbatim, the subject-shape CHECK proven three refusals red and
two shapes green with preconditions asserted first, the erasure
unreachability recorded in the tool's own header, and the household surfaces
no longer offering `training`. **The PR awaits founder review rather than the
usual merge path, per the ruling.** Still open behind it, each its own
session: the person-scoped capture surface (no producer yet, stated in
0059's header) and the WK-SOP-017 employee self-access view. The friction
and access-custody answers remain recommendations with no clock.

### A2. The outbox drain's total order

Item 2 of the 28 August list, still open, now sharpened: the TEST half is
fixed (distinct timestamps, so it asserts only what the database promises),
and the flake is gone. **Whether the DRAIN should order by `(createdAt, id)`
is a change to shipped ordering semantics and is yours.** If ruled yes, the
test reverts to identical timestamps and asserts the total order, which is
the stronger test.

### A3. Row 6's return-code answers and the D5 selection

The processor questions carry the Phase 2 fraud-monitoring question and the
R24 return-code question. The answers decide criterion 2 and shape the
dunning integration; nothing engineering-side moves until they land.

### A4. Held decisions, listed so they are not re-derived

Meal breaks as a second interval type (R23 item 6). G-108's pointer (re-point
row 8 at WK-SOP-005 Level 2, or produce the five-dimension review). W-16's
three part-log files. Whether seed scripts write audit rows (28 Aug item 3).
The `proposeEdit` member refusal copy.

---

## B. Build sessions, ready now, in the order I would run them

**Three defects deliberately NOT in this list, because they CLOSED this
stretch and a later reader holding an older note should not re-file them
(the carried-forward rule: a re-flag names the build the prior pass
describes).** The founder's three deploy-check finds on `3d86708` were filed
as G-113 and are fixed, deployed and verified on the build production now
serves: the audit line that read `viewed the secured value of "null"` (the
render now prefers the row's own `detail.field` across all four naming kinds
and degrades to a true sentence; the seed no longer writes fieldless
reveals; verified naming the FOSTER CONFIDENTIALITY field in the 30 August
screenshot); the water heater's tripled install date (`installed_at` ruled
authoritative, one date on both surfaces, verified character for character;
the same table's display-name work continues as B4, which is the surviving
half of that class); and the hours-without-visits contradiction (reported as
SEED before anything changed, per the instruction: two seeds keeping two
clocks, then the join and payload hours found unwritten; fixed, linked
210|240|240|240, verified by the founder's own queries).

### B1. RFC-ATTR-01 step 1: the vocabulary module and its guard

No migration. One module exporting the two proposed vocabularies (knowing
state, source-vs-derived), plus a guard computing every attribute-shaped
column from the schema and asserting it resolves, with a count floor (the
survey found TEN provenance mechanisms and FOUR confidence types; the floor
starts there). **This is the session that stops an eleventh mechanism
appearing while the founder decides 2.5 and 2.6**, and it is worth doing even
if every other RFC step defers. Prove red by adding a fake mechanism, green
on the tree.

### B2. The accessibility contract's first stone

D2's baseline is adopted law with NOTHING enforcing it and no trigger to wait
for. **That sentence supersedes a founder ruling, and the handoff carries the
correction rather than silently reflecting the right answer** (her
instruction): on 27 August a two-trigger deferral was ruled for a baseline D2
had already adopted on 24 August under the two-key authorization, and the
founder voided her own ruling the next day (G-102). A later reader should see
which way the correction ran: the deferral was withdrawn, the baseline stood,
and the enforcement gap it left is exactly what this item exists to close.
Do not attempt the whole contract in one session. The honest
first stone: axe checks wired into the existing Playwright journeys for the
three critical flows (sign-in, visit close, drill-in), failures reported not
gating for one week of runs, then gating. The component-library contract
grows from what those runs find rather than from a checklist.

### B3. The LIBRARY_INDEX census guard

G-107's fix that would hold: assert `LIBRARY_INDEX.md` names every file in
`docs/library/`, computed from the directory, count floor at the current ten.
Small, and the index has already been silently wrong for four days once.
Pattern: `legal-census.test.ts`.

### B4. The registry display-name/key split

Item 1 of the 28 August list, still the item that closes two things at once
(the ten em-dash labels held as identifiers, and rename-safety for G-101's
class). The 28 August write-up is still the best brief for it: `entry_key`
minted equal to labels, dedupe and seeds keyed on it, labels become display
copy, CENSUS_EXCUSALS entry retired. One migration.

### B5. Two small trace clauses that need no ruling

The pause auto-resume gap (row 10): nothing fires on `effectiveOn`. The
smallest honest version is not a scheduler; it is the drill-in and board
SAYING a pause's resume date has passed without a resume event, the
overdue-deferral pattern. And the substitution notice (row 9) needs the
firewall and a founder copy decision, so it is NOT in this list; it only
looks small.

### B6. Chores, one sitting

`deploy.sh:342`'s slash-only slug test (the verify-merge proof found the
defect class; one line). The G-95 residue: `dump-seed.ts` refuses without an
explicit id instead of taking any household; `run.ts:117` picks
deterministically among observance fields. The repository `homepage` field.

---

## C. Library-side edits, all texts ready

- WK-DEV-001: the two amendments plus the 1.0-to-1.1 version bump (texts in
  the repo copy).
- WK-SOP-016: the R25 amendment (text in trace section 13).
- R21/R23: the row 1 split, items 4/5/7 to Kelly as wage compliance.
- `WK-DEV-006:30`: the one-line covenant edit, FROM and TO in G-105, at the
  next two-key turning.
- WK-TRN-009: written and placed (G-110); a good first COO assignment.
- A213 read on paper for the five untraceable additions; PAPER-PARITY's text
  pulled, since its direction decides roughly half of WK-OPS-002.

---

## D. The gates that hold everything else

**Staging is still the whole of Phase 1** (ADR-007; six dashboard clicks,
ruling already made to build under contractor accounts, S3/KMS excepted).
Then the WK-SEC-001 audit, then the two onboarding-moment capture fields
(photo consent scope, WK-LEG-005) BEFORE the first household record, per the
pre-household ordering: those are the items that become permanent holes with
a date on them.

---

## Standing cautions for the next session, earned this stretch

- **When the honest options are "make the system say something true" and "make
  the system do something new", take the first and let the second be its own
  decision.** Three instances this stretch: the board disclaiming the hiring
  trigger instead of computing WK-SOP-014's rule, trace rows recorded Partial
  with the interim control named instead of building capture, and the
  pause-resume gap surfaced as a date-passed statement instead of a
  scheduler. A scoping heuristic rather than an evidence rule, and it is the
  one that keeps sessions small.
- A fixture models the application's PRODUCIBLE states, and producibility is
  not one property: dates, joins, and payloads each had to be made true
  separately (G-113 and both addenda).
- State the search beside an absence claim, and prefer the artifact to the
  index (G-106, G-107).
- "I cannot run this here" is a claim about the environment and needs the
  same evidence as a claim about the code (G-112).
- A promised proof line must be reachable from the sequence it is promised
  for (the across-3 ordering artifact).
- Postgres dies between sessions here; `pg_ctlcluster 16 main start`, and a
  failing integration suite reading ECONNREFUSED is that, not the change.
