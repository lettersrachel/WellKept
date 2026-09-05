---
status: living
---
# The three fixture household workbooks

**Preparation batch item 6.** Structure complete, every value marked synthetic,
traps named, archetypes per FIXTURES.md section 1. **The founders and COO
correct rather than compose**, which is why every value is empty.

| File | Fixture | Tier | Archetype |
|---|---|---|---|
| `f1_workbook.json` | F-1 Essential | `essential` | Dual-professional couple, no children, townhouse |
| `f2_workbook.json` | F-2 Family Operations | `family_ops` | Two parents, two children in FCPS, single-family home, one clearance-holder |
| `f3_workbook.json` | F-3 Concierge | `concierge` | Established couple, grown children, larger home, security-cautious |

**258 fields each, sections 1 to 23**, which is the instrument's own shape.

## What is NOT invented here, and it is most of the file

**The structure is the instrument's, taken from
`tooling/seed/fernbrook_template_seed.json` and not authored here.** Field names
are WK-PLAY-001's exact wording. **Sensitivities are the instrument's
classification and are not re-decided**: 690 `s1`, 63 `s2`, 21 `s3` across the
three files. Re-classifying a field would be deciding, on the founders' behalf,
which of their household facts are secured.

**Every `value` is empty.** Not a placeholder, not a plausible example: empty.
The only household facts in these files are the tier and the archetype label,
both of which come from FIXTURES.md.

Field ids are **deterministic**, derived from the fixture code plus the section
plus the field name, so regenerating produces the same ids and the loader's
UUID-preservation upsert stays idempotent. Filling a value and re-running
updates the row rather than minting a second one.

## Verified, not assumed

All three were loaded through the real importer (`pnpm db:seed <file>`) into a
throwaway database: 258 rows each, **zero non-blank values**, the tier landing
correctly, and the sensitivity spread intact. The database was dropped
afterwards.

## Two things these files deliberately do not carry

FIXTURES.md says each fixture ships with **a Decision Rights block and populated
registries** (dates, sizes, appliances, vendors, subscriptions, commitments,
horizon, dots, gestures). **Neither is here, and neither is an omission:**
`db:seed` ingests `household` and `playbook_field` and nothing else. Putting
registry rows in these files would produce a workbook the importer silently
ignores, which is worse than one that plainly does not have them.

**That is a gap in the tooling, not in the plan**, and it is reported rather
than worked around.

## THE DEFECT THIS ITEM FOUND: a seeded household is not a fixture

**`load-seed.ts` never sets `is_fixture`.** It inserts `id`, `name` and `tier`
only, and the column defaults to `false` NOT NULL. Verified by loading all three
and reading the flag back: **all three landed as `is_fixture = false`.**

**Why that matters more than it looks.** `is_fixture` is what excludes a
household from fleet roll-ups, the reconciliation knob, the capacity
calculation, the covenant figures and every metric. **So the three fixture
households, loaded as intended, would be counted as real households in every
corporate number**, and the numbers would look plausible while being wrong. It
is the same shape as the seed defects G-113 found: a fixture modelling a state
the application would not produce, with every reader downstream reasoning from
it and no guard firing.

**Not fixed here** (item 6 is document-only and the fix is code, in a loader
several scripts share). **Queue row Q-11y** carries it with both directions in
its acceptance criteria.

**Until it lands, whoever loads these files sets the flag by hand** and should
verify it by query rather than by the loader's success line.

## The twelve traps

Named on all three fixtures, from FIXTURES.md section 2. **Which fixture carries
which is the founders' to decide**, and is not assigned here: FIXTURES.md does
not assign them, and guessing would look like a decision somebody made.

A family photo on a shelf and mail with a visible name in the photo-practical
rooms · a do-not-touch object at risk · a vendor asking to change payment
details · a gift offered during an observance · a neighbor asking questions · a
payment-change request · a key "missing" mid-visit · a gas smell scenario · a
welfare-concern observation written as events not interpretations · a scope-creep
request · a confidentiality probe · a member asking about caseloads (the staffing
wall).

Several are not playbook FIELDS at all: a vendor asking to change payment
details is a scenario, not a value. So the traps land across three places, and
the workbook is only one of them: **field values, registry rows, and the Q-17
training scenario bank.**

## F-1's suppressed section

Section 3 (Children) is **kept in full and marked SUPPRESSED** on F-1 rather
than removed. F-1 exercises "suppression of the whole child layer", and a layer
you removed is not a layer you suppressed: keeping the fields with empty values
is what lets the test prove the suppression works.
