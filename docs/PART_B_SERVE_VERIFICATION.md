---
status: living
---

# Part B: serve verification for 0056 (situation) and 0057 (preference_rule)

Version 4, 26 August 2026. Run against PRODUCTION with a browser.

**One lineage from here.** The repo file and the chat drafts are now the
same document at the same number: this is v4, drafted from what was
v1.3 in the repo, folding the founder's v4 instruction list. Earlier
copies (v1, v2, v3 in chat; v1.1, v1.2, v1.3 here) are superseded. A v5
is drafted FROM THIS FILE.

Lineage, because two versions were written in parallel and one of them
is wrong on a load-bearing fact. v1 was uploaded and corrected to v1.1
(this file, merged in PR #189). A v2 was then uploaded, written from v1
rather than from v1.1: it reached several of the same improvements
independently AND kept two of v1's errors. This v1.2 is v1.1 plus every
genuine improvement v2 made. The corrections section below says which
of v2's claims are wrong and how that was settled, so nobody
reconciles it silently a third time.

A v3 was then uploaded, again drafted from the chat lineage rather than
from this file. It is the strongest draft yet in four places, all of
them folded in below, AND it repeats the same two errors for a third
time while introducing a new one that is more dangerous than either.
This is v1.3: v1.2 plus v3's improvements, minus v3's errors, with the
developer tasks v3 asked for actually run and answered. **Draft a v4
from THIS FILE.**

Purpose: prove the `situation` and `preference_rule` tables actually
SERVE, not merely that their migrations applied. Health passing proves
the app boots with the new schema present and nothing more.

---

## Corrections to v1, read these first

**1. G-68 IS LIVE. The confirmation banner is expected, and its absence
is a finding.** v1 said the banner "landed today and is not in
747a98c", and instructed the tester to log silence as expected. That is
backwards: PR #183 carried G-68 and its merge `e3fe0f5` is an ancestor
of `747a98c` (verified with `git merge-base --is-ancestor`). It was also
observed rendering in production the same morning, on the Field Test
Home capture dismissal: "Recorded: capture dismissed; it is in the table
below and in the audit trail."

So every write step below expects a green **Recorded:** line. A write
that lands silently on this build is the G-68 class recurring and gets
a register entry.

**2. `situation` has no `work_item_id`.** v1's B2 query asked for one.
The column does not exist (see `0056_situation.sql`); asking for it
fails the query rather than returning null.

**3. Every placeholder is resolved below** against the two migrations on
disk. No identifier in this version is a guess.

Also corrected: v1 said the sign-in email and `/verify-request` address
lines are not live. That part is RIGHT and stands. They landed in #187
and #188, which production does not carry.

**4. v2 repeats corrections 1 and 2 as written in v1, and both are
still wrong.** v2 carries the same "No RecordedBanner ... silence is
expected here and is not a failure" paragraph, and the same
`<work_item_id_col?>` on `situation`. If a v3 is drafted, draft it from
this file. The evidence for correction 1 is not a judgment call: the
git ancestry command above, plus the banner observed rendering in
production on 26 August.

**5. v3 repeats corrections 1 and 2 for a third time**, and adds a new
error of its own: its P4 resolves the fixture with
`WHERE is_fixture = true` and asserts exactly one row. **Three
households carry that flag** (locally: HO Twin, The Training Household,
Smoke Test Fixture; production carries the Training Household too). So
v3's P4 either fails outright or, worse, invites the tester to pick the
row that looks right, which is precisely the mistake P4 exists to
prevent. Resolving by NAME, as v1.1 and this version do, returns
exactly one row today. Verified by query, not by reading the seed.

**And the predicate now matches the fixture's own, by construction
rather than by coincidence.** `ensure-smoke-fixture.mjs:33` finds its
household with `WHERE name = $1` against the constant
`FIXTURE_NAME = "Smoke Test Fixture"` (line 25). This script uses the
same predicate, so the script and the thing it tests agree by
definition instead of by two people writing the same string twice.

**The finding that came out of checking that, filed rather than worked
around (G-71): `household.name` carries no unique constraint.** The
table's only index is its primary key on `id`, confirmed against both
the live schema and `tables.ts`. So the fixture script's own identifying
predicate is non-unique BY SCHEMA: nothing stops a second household
named "Smoke Test Fixture" existing, and if one ever did,
`ensure-smoke-fixture.mjs` would silently take whichever row came back
first. That is a real gap in the seeding tool, not a flaw in this
script. What this script does about it is assert the count: P4 requires
exactly one row and STOPS otherwise, so the ambiguity surfaces here
even though it cannot be prevented here.

**Adopted FROM v2, which reached these independently and improved on
v1.1:** the identity check done by QUERY rather than by reading the
masthead; the explicit assertion that the resolved fixture id is not
Field Test Home, and that it is copied from query output rather than
retyped; the optional short-input negative check, which proves the
refuse path serves as well as the write path; and A3's assertion that
provenance and confidence are UNCHANGED by retirement.

**Adopted FROM v3, which is the strongest draft on all four of these:**
the founder's build-timing decision made explicit before the run rather
than falling out of when an hour is free; the three-step
absent-card diagnosis (identity, then bundle, then serve failure, and
only the third is a Part B finding); **recording the refusal SHAPE**,
client-side versus server-side, which is the one thing a browser can
answer that a query cannot and which no earlier version asked for; and
the framing that a wrong provenance is its own register entry, because
the question it raises is who else can write to that table.

---

## The developer tasks v3 asked for: RUN AND ANSWERED, 26 August

v3 said the production run should not be scheduled until these were
done. They are done.

### D1. Sensitivity of the rehearsal's assertions: ALL FOUR DONE

v3 was right that one assertion proven red is below the bar set by
`success-visibility.test.ts` this morning. All four now have the same
treatment.

| # | Mutation | Direct result | With the CHECK dropped |
|---|---|---|---|
| D1a | partial retirement group | UNREPRESENTABLE | RED, as required |
| D1b | provenance other than `explicit` | RED, as required | n/a |
| D1c | non-NULL `confidence` on create | UNREPRESENTABLE | RED, as required |
| D1d | mutate the situation label in resolve | RED, as required | n/a |

**D1b and D1d turned red on the assertion that exists for them**, and
green again on revert. D1d is worth recording twice over: the first
attempt at it silently did not apply, because the anchor line appears in
TWO actions (`resolvePausedDecision` and `resolveSituation` set an
identical field list), and the run reported "1 passed". A mutation that
never lands and a test that cannot fail look exactly the same from the
outside. That is the inputs-doctrine failure in miniature, caught only
because the patch printed a traceback.

**D1a and D1c could not be made red, and that is the stronger answer.**
Both states are refused by CHECK constraints, so no path through the app
or a direct write can produce them. Proven in SQL rather than asserted:

- partial retirement: `ERROR: new row for relation "preference_rule"
  violates check constraint "preference_rule_retirement_is_whole"`
- explicit provenance with a confidence: `ERROR: ... violates check
  constraint "preference_rule_confidence_is_whole"`
- the legitimate shape on the same table: `INSERT 0 1`

So those two assertions are belt-and-braces over a structural guarantee
rather than the only thing standing between the product and the defect.
To show they are not merely decorative, D1a was ALSO proven red with the
CHECK temporarily dropped and the action changed to omit the reason: the
rehearsal caught it, and the constraint was restored and verified
present afterwards. Read that as: if the CHECK is ever dropped in a
migration, the rehearsal notices.

### D2. Do the cards ship in the build under test?

**YES.** The Situations card shipped in `5431ff0` (SITUATIONS bundling,
0056) and the Preference rules card in `a940321` (Substrate backfill,
0057). Both are ancestors of `747a98c`, verified with
`git merge-base --is-ancestor`. So an absent card on that build is NOT
explained by the bundle, and the three-step diagnosis collapses to
identity first, then a real serve failure.

### D3. CI coverage: CLOSED, not documented

v3 offered two ways out and asked for a decision. Taken: **seed the
fixture in CI**, which closes the gap rather than recording it.
`ci.yml`'s airplane job now runs `ensure-smoke-fixture.mjs` after
`db:seed`, so the rehearsal runs in CI instead of skipping, and
`retirePreferenceRule` cannot be changed to mutate in place without
something automated noticing.

Chosen rather than the "accept it as a local artifact" option because a
documented gap is still a gap, and the evidence that seeding is safe
already existed: the full suite ran green locally WITH the fixture
present before this change. The spec keeps its skip path, which is now
a fallback for a database that lacks the fixture rather than the
expected CI behaviour.

## Scope and standing constraints

- Target: the **Smoke Test Fixture** only (G-23). These are write-heavy
  items and they never touch a client household. Field Test Home
  (`d05ab5a2-7d9c-4cff-919a-250adafa0355`) is explicitly not the target.
- Never echo `DATABASE_URL`, `WK_KMS_KEY`, `AUTH_SECRET`, or the
  contents of `.neon-connection`. Refer to them by name.
- `erase-household.mjs` is not used by this script at all.
- Every screen assertion is paired with a database assertion. The screen
  is never the evidence.

## Identity, which will otherwise stop you at step one

Both cards require **corporate_admin or corporate_ops on the fixture
household**. Sign in as the PRIMARY corporate account.

The `lettersrachel+ftc-admin` alter identity holds a role on Field Test
Home and nowhere else, so it cannot see the fixture at all: its fleet
board shows one household and the fixture is not it. If you are still in
the incognito window from the Field Test Home work, that window is the
wrong identity for this script.

**Confirm it by query, not by looking at the screen** (v2's improvement,
and the standing rule):

```sql
SELECT a.role, a.household_id
FROM household_role_assignment a
JOIN auth_user u ON u.id = a.user_id
WHERE u.email = :ACTING_EMAIL
  AND a.household_id = :FIXTURE_ID;
```

Expected: one row, `role` in (`corporate_admin`, `corporate_ops`). Zero
rows is a STOP, and the correct response is to fix the window, not to
file a finding. A card that is absent entirely, at A1 or B1, is an
ACCESS outcome and proves nothing about 0056 or 0057.

## Pre-flight

Do not start until all four hold. If any fails, stop and report.

| # | Check | Expected |
|---|-------|----------|
| P1 | Deployed commit | `747a98c` |
| P2 | Migration count, three ways | 58 / 58 / 58 |
| P3 | Health endpoint | `{"ok":true,"db":"up"}` |
| P4 | Fixture household id | see below, confirmed not assumed |

The fixture id recorded at the 25 August sitting is
`8a4b9786-9698-4200-95b9-91abec7a40ef`. **Resolve it rather than trusting
this line**, since a wrong id here sends test writes into a real
household. The seed script names the household "Smoke Test Fixture"
(`ensure-smoke-fixture.mjs:25`):

```sql
SELECT id, name, is_fixture FROM household WHERE name = 'Smoke Test Fixture';
```

Assert all three:

- exactly one row returned, and `is_fixture` is true
- the returned id is **not** `d05ab5a2-7d9c-4cff-919a-250adafa0355`
- the returned id is used verbatim as `:FIXTURE_ID` for the rest of the
  run, copied from the query output rather than retyped

Record the resolved value as `:FIXTURE_ID`: ____________________

Shape read, once per table, so the tester knows what they are looking at:

```sql
SELECT * FROM preference_rule WHERE household_id = :FIXTURE_ID;
SELECT * FROM situation        WHERE household_id = :FIXTURE_ID;
```

## Input rules that refuse, so a refusal is not misread as a defect

All four are server-side minimums, and all four redirect to a visible
refusal banner rather than failing silently:

| Field | Minimum | Refusal |
|---|---|---|
| preference rule text | 4 characters | `bad-input` |
| retirement reason | 4 characters | `gate-unmet` |
| situation label | 4 characters | `bad-input` |
| resolution note | 4 characters | `gate-unmet` |

The strings below are all comfortably longer, so a refusal on the
strings AS WRITTEN is a real finding.

**Optional negative check, one per card, cheap and worth doing** (v2's
addition): submit a three-character value, confirm the app refuses with
a visible banner, confirm NO POST returning 303 occurred, and confirm no
row was created. That proves the refuse path serves as well as the write
path, which no other step here covers.

## Network instrument

For every write step, have the network panel open and filtered to
`method:POST` before clicking. This is the G-67 calibration and it
applies here unchanged.

- Exactly one POST of ours per write.
- Status `303`.
- No POST row at all means client side: the click never left the browser.
- A non-303 means server side.

Any deviation is a STOP. Capture the row; do not retry blind.

---

## Section A: preference_rule

### A1. Empty state

1. Open the **Preference rules (WK-DEV-007 §4)** card on the fixture
   drill-in.
2. Screen: the card renders with "No preference rules on record." Not an
   error, not an unresolved spinner, not a blank region.
3. Database:

```sql
SELECT count(*) FROM preference_rule WHERE household_id = :FIXTURE_ID;
```

Expected `0`. If non-zero the fixture is dirty; stop and clean it first,
or A3's retirement assertions cannot be interpreted.

PASS / FAIL: ______  Notes: ______

### A2. Record one rule

Record the exact string here before typing it, character for character:

```
RULE TEXT: PARTB-0057-<timestamp>-do-not-move-the-blue-bin
```

1. Network panel filtered to `method:POST`.
2. Enter the rule in "the preference, in words" and submit. Leave
   "Review by" empty for this run.
3. Network: one POST, `303`.
4. Screen: **green "Recorded: preference recorded."** The empty state is
   gone and the rule shows with `explicit` beside it.
5. Database:

```sql
SELECT id, household_id, created_at, rule, provenance, confidence,
       review_by, recorded_by, status, retired_reason, retired_at, retired_by
FROM preference_rule
WHERE household_id = :FIXTURE_ID;
```

Assert all six:

- exactly one row
- `household_id` equals `:FIXTURE_ID` and nothing else
- `rule` matches the recorded string byte for byte, including case
- `status` is `active`
- `retired_reason`, `retired_at`, `retired_by` are ALL null (the
  whole-or-absent CHECK)
- **`provenance` is `explicit` and `confidence` is NULL.** This is a
  design assertion, not a formality: the app creates only explicit rows
  (the action takes no provenance input at all), and confidence belongs
  to non-explicit rows alone. A row arriving any other way means
  something other than the app wrote it.

Record the returned `id` as `:RULE_ID`: ______________________

PASS / FAIL: ______  Notes: ______

### A3. Retire the rule

Record the retirement reason before typing it:

```
RETIRE REASON: PARTB-0057-<timestamp>-test-row-retired-after-serve-check
```

1. Network panel filtered.
2. Retire `:RULE_ID` through the card, entering the reason above.
3. Network: one POST, `303`.
4. Screen: **green "Recorded: preference retired."** Record what the card
   does with the row: it should render in place with "retired: <reason>"
   beneath the original text. Record what it actually does; do not assume.
5. Database:

```sql
SELECT id, household_id, rule, status, retired_reason, retired_at,
       retired_by, updated_at
FROM preference_rule
WHERE id = :RULE_ID;
```

Assert all five:

- the row still exists. A retirement that DELETES is a FAIL, not a
  variation
- `status` is `retired` and `retired_reason`, `retired_at`, `retired_by`
  are ALL populated together
- `household_id` unchanged, and **`provenance` and `confidence`
  unchanged** by the retirement
- `retired_reason` matches the recorded reason byte for byte
- **`rule` is byte-identical to the string recorded in A2**

That last one is the point of this section. A rule never edits in place;
retiring it with a reason is the only change, and a corrected preference
is a new rule. If the text has been rewritten, appended to, prefixed,
truncated, or had a status word folded into it, that is a FAIL and it is
the most consequential finding available in Part B, because it means
retired rules cannot be read back as what they actually said.

PASS / FAIL: ______  Notes: ______

### A4. Reload

Reload the drill-in once. Confirm the retired state and the original rule
text both survive a fresh server fetch, rather than having come from a
render that happened to look right.

PASS / FAIL: ______  Notes: ______

---

## Section B: situation

### B1. Empty state

1. Open the **Situations (WK-DEV-009 §10)** card on the fixture drill-in.
2. Screen: "No situations on this household." Not an error, not an
   unresolved spinner.
3. Database:

```sql
SELECT count(*) FROM situation WHERE household_id = :FIXTURE_ID;
```

Expected `0`. Non-zero means a dirty fixture. Stop.

PASS / FAIL: ______  Notes: ______

### B2. Open a situation

Record the exact text before typing it:

```
SITUATION TEXT: PARTB-0056-<timestamp>-front-gate-latch
```

1. Network panel filtered.
2. Enter it in "the situation, in words" and click Open situation.
3. Network: one POST, `303`.
4. Screen: **green "Recorded: situation opened."** The situation appears
   reading `0 bundled · open`.
5. Database:

```sql
SELECT id, household_id, created_at, label, created_by, status,
       resolution, resolved_at, resolved_by
FROM situation
WHERE household_id = :FIXTURE_ID;
```

Assert all five:

- exactly one row
- `household_id` equals `:FIXTURE_ID`
- `label` matches byte for byte
- `status` is `open`
- `resolution`, `resolved_at`, `resolved_by` are ALL null (the
  whole-or-absent CHECK)

Record the returned `id` as `:SITUATION_ID`: ______________________

PASS / FAIL: ______  Notes: ______

### B3. Resolve it

Record the resolution note before typing it:

```
RESOLVE NOTE: PARTB-0056-<timestamp>-test-row-resolved-after-serve-check
```

1. Network panel filtered.
2. Resolve `:SITUATION_ID` with the note above.
3. Network: one POST, `303`.
4. Screen: **green "Recorded: situation resolved."** Record what the card
   does with the row; do not assume.
5. Database:

```sql
SELECT id, household_id, label, status, resolution, resolved_at,
       resolved_by, updated_at
FROM situation
WHERE id = :SITUATION_ID;
```

Assert all five:

- the row still exists
- `status` is `resolved` and `resolution`, `resolved_at`, `resolved_by`
  are ALL populated together
- `resolution` matches the recorded note byte for byte
- **`label` is byte-identical to the string recorded in B2**, same
  reasoning as A3
- `household_id` unchanged

PASS / FAIL: ______  Notes: ______

### B4. Reload

Reload once. Confirm the resolved state and the original label survive a
fresh fetch.

PASS / FAIL: ______  Notes: ______

---

## Section C: containment

The whole script wrote to one household. Confirm nothing leaked.

```sql
SELECT household_id, count(*) FROM preference_rule GROUP BY household_id;
SELECT household_id, count(*) FROM situation        GROUP BY household_id;
```

Assert: no rows against `d05ab5a2-7d9c-4cff-919a-250adafa0355` were
created by this run, and no rows exist against any household id you did
not expect.

PASS / FAIL: ______  Notes: ______

---

## Closeout

Part B passes only if A1 through A4, B1 through B4, and C all pass.

A partial pass is reported as a partial pass. Do not describe the tables
as serving on the strength of the write steps alone: the immutability
assertions in A3 and B3 are the substance of this script.

Leave the fixture rows in place. They are labeled and dated and are a
useful baseline for anything that follows.

**Not tested here, and deliberately:** the sign-in email's recipient line
and the `/verify-request` address line (both landed after this build);
the `role_revoked` audit detail (G-69, verified separately on 25 August);
erasure treatment for either table; and automatic situation grouping,
which is unbuilt by decision.

### Result

- Date and time of run:
- Commit confirmed serving at start:
- Overall: PASS / PARTIAL / FAIL
- Findings requiring a register entry:
