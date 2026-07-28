---
status: frozen
---
# Round six, session P: floor review preflight

Read-only against the codebase; the loader round-trip was exercised against
a throwaway local Postgres 16 in the session container, never production.
28 July 2026, at main `ed0b4fa`. Report only; nothing fixed.

## 1. The kind enum: widened, and the widening is documented

The shipped Zod enum accepts all three seed values:
`provisionKindSchema = z.enum(["rule", "table_row", "callout"])`
(packages/schema/src/standards.ts:12). A corrected sheet carrying
`table_row` rows will not fail at import on kind.

Not silent drift: the widening landed with the store itself (9f24b99,
"Standards store: the fourth model lands behind seed_reviewed=false") and
SPEC_AUDIT.md line 143 records it explicitly: "Seed kind has three values
(rule 902 / table_row 184 / callout 60); the brief said rule|callout and
Addendum S3 omits kind entirely. Schema adopted the 3-value enum; S3 table
should gain the column." The founder-side S3 edit is the remaining half,
already on the founder-chore ledger from W-11's pattern.

## 2. The loader round-trip: exercised for real, and the workbook needs a mapping step

**The round-trip itself works.** Executed in this container against a local
Postgres 16 (all 28 migrations applied first):

- Full seed load: 1,146 inserted, seed_reviewed stamped false.
- Five tier changes (two process to method, two method to process, one
  floor_2 to process; the seed contains no preference rows to change, its
  tiers are method 812 / floor_1 189 / floor_2 111 / process 34), re-run
  with `--supersede`: loader reported exactly "0 inserted, 5 versioned,
  1141 unchanged."
- Verified by SQL, not the loader's own output: the five rows sit at
  version 2 with the changed tiers in `standard_provision`;
  `provision_versions` holds both snapshots per changed row (v1 with the
  old tier, v2 with the new; 1,151 total rows = 1,146 v1 + 5 v2);
  `app_setting standards.seed_reviewed` = false.

**But the review workbook cannot reach the loader as-is.** The only
xlsx-to-JSON path is tooling/import/wk_provisions.py, and it expects the
ORIGINAL founder review sheet, not the floor-review workbook:

- It reads one tab named "Provisions for review" with fixed columns
  (1=provision_id, 5=tier, 8=text, 9=column I, 10=notes). The floor-review
  workbook's multiple tabs (300 floor, 41 high-signal, 130 contextual,
  decisions) do not match.
- Column I vocabulary is "Y" (confirmed), a tier value (correction), or
  blank (unreviewed). Of the DECISION vocabulary: `floor_1`, `floor_2`,
  `process`, `method`, `preference` pass as corrections; **`keep` and
  `unsure` are each a hard error** ("not Y and not a tier; resolve before
  load", wk_provisions.py:73-74), and any error aborts the whole
  conversion.
- It requires EVERY base provision present: a 471-row workbook fails with
  "675 base provisions missing from the sheet" (wk_provisions.py:97-99).

So a mapping step is required before the review can load: map `keep` to
"Y" and `unsure` to blank (blank already means unreviewed, matching the
workbook's own semantics), and merge the workbook's rows back over the
full 1,146-row sheet (or extend the converter to treat absent rows as
unreviewed). Which of those two is wanted is a decision, not made here.

Two loader behaviours worth knowing before the real load:

- `--reviewed` must be passed on the load that follows the completed
  review, or the flag stays false and everything stays dark.
- The loader stamps `seed_reviewed` on EVERY run with whatever the flag
  says, so any later maintenance load run without `--reviewed` silently
  re-darkens the library. Fail-dark is the intended direction, but it
  means the flag is not sticky.

## 3. What seed_reviewed=true actually unlocks

**It unlocks display, and only display.** The gate is read in
apps/web/src/lib/standards.ts:50 and the standards page renders a
"pending founder review" notice while it is off. Flipping it makes the
provision library render. It does not enable any enforcement that is
currently disabled, because:

**Floor enforcement exists as a tested library with no caller.**
`createAdaptationRecorder` (packages/close-flow/src/standards.ts:42-76)
refuses to record a floor-tier provision as adapted, throws
FloorNotOverridable, and emits a structured floor_conflict event; the
worker's `enqueueFloorConflict` routes it to notification rows for every
corporate_admin/corporate_ops on the household
(services/worker/src/index.ts:80-100). All of it is unit-tested
(standards.test.ts). But the only importer of `createAdaptationRecorder`
in the tree is its own test file. No close-flow surface, no visit screen,
nothing lets an HM record an adaptation at all. The worker's own comment
states the position: "The event type is wired now; the close-flow UI that
sends it is its own sprint." T5's stub was never dispositioned; it fails
safe by absence (no adaptation can be recorded, so no floor can be
recorded as adapted), which is the right failure direction and still a
gap.

**The WK-STD-000 S1 conflict path does not exist in the software.** Of
its three commitments: "tell the client at the time" has no software
surface; "log it in the visit report the same day marked as a floor
conflict" has no field, no marker, and no code path (the visit report is
three sentences; nothing links a floor_conflict event to a visit);
"the CEO owns the client conversation within one business day" has no
assignment, no timer, and no tracking. The only artifact the system can
produce today is the corporate notification row, whose body cites S9
review. Grep for a CEO/business-day path finds only the support page's
reply-time copy and the CEO master-view comment.

**Consequence for the review sitting:** the 300-row review and the flag
flip are safe to do; they turn the library's display on. But the standard
will then be visible while promising a conflict path the system cannot
record. That is a known, now-documented gap (the S9 escalation half is
built and idle; the S1 same-day-report and CEO-ownership halves are
unbuilt), not a reason to delay the review.
