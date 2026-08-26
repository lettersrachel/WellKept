---
status: living
---

# Part B: serve verification for 0056 (situation) and 0057 (preference_rule)

Version 1.1, 26 August 2026. Run against PRODUCTION with a browser.
Supersedes v1; v1's corrections are listed at the end so the changes are
reviewable rather than silent.

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

---

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

Confirm before starting: the masthead reads your primary address, and
the fleet board lists the fixture.

## Pre-flight

Do not start until all four hold. If any fails, stop and report.

| # | Check | Expected |
|---|-------|----------|
| P1 | Deployed commit | `747a98c` |
| P2 | Migration count, three ways | 58 / 58 / 58 |
| P3 | Health endpoint | `{"ok":true,"db":"up"}` |
| P4 | Fixture household id | see below, confirmed not assumed |

The fixture id recorded at the 25 August sitting is
`8a4b9786-9698-4200-95b9-91abec7a40ef`. **Confirm it rather than trusting
this line**, since a wrong id here sends test writes somewhere real:

```sql
SELECT id, name, is_fixture FROM household WHERE is_fixture = true;
```

Record the confirmed value as `:FIXTURE_ID`: ____________________

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

The strings below are all comfortably longer. If you see a red banner,
read it before assuming a fault.

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
- `household_id` unchanged
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
