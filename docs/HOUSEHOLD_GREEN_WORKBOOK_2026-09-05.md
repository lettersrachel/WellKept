---
status: living
---
# The Household Green workbook, and one clause deliberately not done

**Preparation batch item 7.** An empty workbook in the exact import shape,
every field labelled, so filling it is answering questions rather than deciding
what the questions are.

**File:** `tooling/seed/household_green_workbook.json`, 258 fields, sections 1
to 23, generated from the WK-PLAY-001 instrument template exactly as the three
fixture workbooks were.

---

## Two things that make this different from the fixtures

**1. Household Green is a REAL household, so it must NOT carry `is_fixture`.**
Item 6's finding applies here in the opposite direction and is worth stating
that way: there, a fixture household loaded as real would have been counted in
every corporate number; here, a real household loaded as a fixture would
VANISH from all of them, from fleet roll-ups, the reconciliation knob, the
capacity calculation and the covenant figures. **Load it with `--real`**, which
as of today the loader requires you to say (Q-11y).

**2. It targets the EXISTING household row**, `01997700-...-a001`, which
already holds 4 playbook fields and 4 registry entries. The loader upserts by
uuid, so filling this file updates Green rather than creating a second Green
beside it. Field ids are derived from the field name, so a re-run updates the
same rows.

---

## THE PRE-FILL CLAUSE IS NOT DONE, AND IT IS A REFUSAL RATHER THAN AN OMISSION

The item asks to "pre-fill anything derivable from public sources (parcel
record, school assignment, county service calendar) marked `estimated` for me
to confirm."

**I did not do this, and I do not think it should be done by a session.** Three
reasons, in order of weight:

1. **I cannot reach any of those sources.** No parcel record, no school
   assignment map, no county calendar is in this repository, and this session
   has no route to them. Anything I wrote in those fields would be produced
   from nothing.
2. **The subject is a real family's home.** A plausible-looking wrong parcel
   figure or school assignment, sitting in a field marked `estimated`, is the
   most dangerous shape this document could take: it reads as researched, it
   invites confirmation rather than entry, and **confirming a plausible wrong
   answer is easier than noticing it.** The `estimated` marker was meant to
   flag a real derivation; on a fabricated value it becomes a disguise.
3. **The item's own governing sentence forbids it**: "Invent nothing about the
   household itself." A value derived from a source I cannot read is an
   invention with a citation attached.

**What is there instead:** the `_estimated` field exists on every row, defaulted
false, so a real pre-fill can be recorded and distinguished when somebody who
can reach those sources does it. **The mechanism is ready and empty**, which is
the honest state.

**If the pre-fill is still wanted**, it is a founder-side or COO-side pass with
the sources open, and the marker is there to carry it. That is a different task
from this one and not a smaller version of it.

---

## How to fill it

Each field carries two working keys beside the real ones:

- **`_answer`**: put the answer here first.
- **`_estimated`**: set true ONLY where the answer came from a public source
  rather than from the household, so those get confirmed before they are
  trusted.

Then copy `_answer` into `value`. The loader reads `value` and ignores keys it
does not know, so the working keys can stay in the file as the record of how
each answer arrived.

```
pnpm --filter @wellkept/schema db:seed ../../tooling/seed/household_green_workbook.json --real
```

**Verify by query, not by the loader's success line** (the item 6 lesson,
which is exactly how the `is_fixture` defect was found):

```sql
select name, is_fixture from household where id = '01997700-0000-7000-8000-00000000a001';
-- expect: Household Green | f
select count(*) filter (where value <> '') from playbook_field where household_id = '01997700-...-a001';
```

## What this file does not carry

**Registries and the Decision Rights block**, for the same reason the fixture
workbooks omit them: `db:seed` ingests `household` and `playbook_field` and
nothing else. Including them would produce a workbook the importer silently
ignores. Green additionally already holds 4 registry entries that this file
must not disturb.
