-- Part B v5, the database half. 27 August 2026.
--
-- Run against PRODUCTION, read-only. Every statement here is a SELECT;
-- nothing writes, and nothing is transactional because nothing needs to be.
--
--   psql "$DATABASE_URL" -f tooling/verify/partb-db.sql
--
-- WHY THIS FILE EXISTS. Part B's eight steps passed on the screen. The
-- screen is never the evidence: a render proves a page composed, never
-- that a row committed with the bytes the operator typed. These queries
-- are what closes Part B.
--
-- The two rows under test, created by the Part B run on the Smoke Test
-- Fixture:
--   preference_rule  PARTB-0057-2026-08-27-do-not-move-the-blue-bin
--   situation        PARTB-0056-2026-08-27-front-gate-latch
--
-- COLUMN NAME NOTE: the preference rule's text column is `rule`, not
-- `rule_text`. The Part B script describes it correctly and names it
-- wrongly; these queries use the identifier the schema actually carries
-- (packages/schema/src/tables.ts:1328).


-- ===================================================================
-- PRECONDITION 0. The CHECK constraints exist in production.
-- ===================================================================
--
-- This runs FIRST and its output is read BEFORE any assertion below.
--
-- G-72: a proof asserts its own preconditions before any case runs. Six
-- CHECK-constraint refusals once reported a clean REFUSED with Postgres
-- down. The same shape applies here in the accepting direction: a row
-- whose state group is whole proves nothing about the constraint if the
-- constraint is absent, because a whole group and an enforced group look
-- IDENTICAL in the data. Only this query separates them.
--
-- Expect FIVE rows. Fewer is a STOP, and the assertions below do not
-- mean what they appear to mean until this is resolved.

SELECT
  'PRECONDITION' AS block,
  rel.relname    AS table_name,
  con.conname    AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE con.contype = 'c'
  AND con.conname IN (
    'preference_rule_confidence_is_whole',
    'preference_rule_retirement_is_whole',
    'preference_rule_status_known',
    'situation_resolution_is_whole',
    'situation_status_known'
  )
ORDER BY rel.relname, con.conname;


-- ===================================================================
-- SECTION A. The preference rule.
-- ===================================================================
--
-- A1  rule_byte_identical           the text stored is the text typed
-- A2  retirement_group_whole        status, reason, at, by all together
-- A3  provenance_explicit_conf_null provenance='explicit', confidence NULL
-- A4  household_is_fixture          scoped to the Smoke Test Fixture
--
-- A1 is byte identity, not visual similarity. The equality is against a
-- dollar-quoted literal, and length / octet_length / md5 ride alongside
-- so trailing whitespace, a smart quote, or an encoding difference
-- cannot hide behind a match on screen. length counts CHARACTERS and
-- octet_length counts BYTES: where they differ the text is not ASCII,
-- which is itself worth seeing on a value that was typed.

SELECT
  'A' AS block,
  pr.id,
  pr.household_id,
  pr.rule,
  pr.provenance,
  pr.confidence,
  pr.status,
  pr.retired_reason,
  pr.retired_at,
  pr.retired_by,
  pr.recorded_by,
  pr.created_at,
  pr.updated_at,

  -- A1
  (pr.rule = $wk$PARTB-0057-2026-08-27-do-not-move-the-blue-bin$wk$)
    AS a1_rule_byte_identical,
  length(pr.rule)       AS a1_rule_chars,
  octet_length(pr.rule) AS a1_rule_bytes,
  md5(pr.rule)          AS a1_rule_md5,
  (pr.retired_reason = $wk$PARTB-retire-check$wk$)
    AS a1_reason_byte_identical,
  length(pr.retired_reason)       AS a1_reason_chars,
  octet_length(pr.retired_reason) AS a1_reason_bytes,

  -- A2. Whole or absent, in the retired direction.
  (pr.status = 'retired'
    AND pr.retired_reason IS NOT NULL
    AND pr.retired_at     IS NOT NULL
    AND pr.retired_by     IS NOT NULL) AS a2_retirement_group_whole,

  -- A3. The app's action takes no provenance input at all and can only
  -- create explicit rows. Anything else here is a STOP and its own
  -- register entry about what else can write to this table.
  (pr.provenance = 'explicit' AND pr.confidence IS NULL)
    AS a3_provenance_explicit_conf_null,

  -- A4
  (pr.household_id = '8a4b9786-9698-4200-95b9-91abec7a40ef'::uuid)
    AS a4_household_is_fixture

FROM preference_rule pr
WHERE pr.rule LIKE 'PARTB-%'
ORDER BY pr.created_at;


-- ===================================================================
-- SECTION B. The situation.
-- ===================================================================
--
-- B1  label_byte_identical      the text stored is the text typed
-- B2  resolution_group_whole    status, resolution, at, by all together
-- B3  (no analogue)             situation carries no provenance column;
--                               stated so its absence reads as designed
--                               rather than as a forgotten assertion
-- B4  household_is_fixture      scoped to the Smoke Test Fixture

SELECT
  'B' AS block,
  s.id,
  s.household_id,
  s.label,
  s.status,
  s.resolution,
  s.resolved_at,
  s.resolved_by,
  s.created_by,
  s.created_at,
  s.updated_at,

  -- B1
  (s.label = $wk$PARTB-0056-2026-08-27-front-gate-latch$wk$)
    AS b1_label_byte_identical,
  length(s.label)       AS b1_label_chars,
  octet_length(s.label) AS b1_label_bytes,
  md5(s.label)          AS b1_label_md5,
  (s.resolution = $wk$PARTB-resolve-check$wk$)
    AS b1_resolution_byte_identical,
  length(s.resolution)       AS b1_resolution_chars,
  octet_length(s.resolution) AS b1_resolution_bytes,

  -- B2. Whole or absent, in the resolved direction.
  (s.status = 'resolved'
    AND s.resolution  IS NOT NULL
    AND s.resolved_at IS NOT NULL
    AND s.resolved_by IS NOT NULL) AS b2_resolution_group_whole,

  -- B4
  (s.household_id = '8a4b9786-9698-4200-95b9-91abec7a40ef'::uuid)
    AS b4_household_is_fixture

FROM situation s
WHERE s.label LIKE 'PARTB-%'
ORDER BY s.created_at;


-- ===================================================================
-- SECTION 4b. Household scoping, from the other direction.
-- ===================================================================
--
-- A4 and B4 assert the row we found is on the fixture. They cannot say
-- anything about a row we did NOT find. This grouped count is the other
-- half: it names every household that carries a PARTB row across both
-- tables, so a write that landed on the wrong tenant appears here as an
-- extra line rather than as silence.
--
-- Expect exactly TWO lines, both on 8a4b9786-9698-4200-95b9-91abec7a40ef,
-- one per table, count 1 each. Any other household is a STOP.
--
-- A count is written nowhere in this file: every number below is
-- computed by the query.

SELECT
  '4b' AS block,
  'preference_rule' AS source_table,
  pr.household_id,
  h.name AS household_name,
  count(*) AS partb_rows
FROM preference_rule pr
JOIN household h ON h.id = pr.household_id
WHERE pr.rule LIKE 'PARTB-%'
GROUP BY pr.household_id, h.name

UNION ALL

SELECT
  '4b' AS block,
  'situation' AS source_table,
  s.household_id,
  h.name AS household_name,
  count(*) AS partb_rows
FROM situation s
JOIN household h ON h.id = s.household_id
WHERE s.label LIKE 'PARTB-%'
GROUP BY s.household_id, h.name

ORDER BY source_table, household_id;


-- ===================================================================
-- What this file does NOT close.
-- ===================================================================
--
-- Neither negative check was run during Part B: no rule and no label
-- shorter than the four-character minimum was submitted against the
-- production build. The minimum's server-side enforcement is proven in
-- the journeys, so it is an unexercised path in one environment rather
-- than an unknown behaviour, and the distinction matters: a journey
-- proves the CODE refuses, and only a production run proves the DEPLOYED
-- BUILD does. That follow-up stays open and no query here touches it.


-- ===================================================================
-- How this file was proven, before it was ever pointed at production.
-- ===================================================================
--
-- A query that finds nothing and a query whose booleans are silently
-- broken return the same empty result, so running it against a database
-- with no PARTB rows proves only that it parses. It was therefore proven
-- in both directions against a local dev database on synthetic rows
-- (never real household data), 27 August 2026:
--
--   PRECONDITION returned exactly 5 constraints.
--   GREEN, on rows seeded to the Part B shape: a1, a1_reason, a2, a3,
--     b1, b1_resolution and b2 all true; the grouped count returned one
--     line per table, one row each.
--   RED, with the mutation confirmed landed by printing the stored value
--     first: one TRAILING SPACE appended to the rule. a1 flipped to
--     false and a1_rule_chars moved 46 to 47. That is the whole argument
--     for the length columns, because on screen the mutated row is
--     indistinguishable from the correct one.
--   a4 and b4 read FALSE on the local fixture, whose uuid differs from
--     production's, which proves the comparison discriminates rather
--     than always passing; their accepting direction was proven
--     separately by substituting the local uuid, which returned true.
--
-- The synthetic rows were deleted afterwards and the count read back
-- zero. Nothing in this file writes; the seeding was done by hand,
-- outside it, and is recorded here rather than left as an assurance.
