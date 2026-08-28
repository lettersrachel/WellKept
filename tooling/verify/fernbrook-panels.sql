-- Fernbrook Demo: a panel-by-panel state read, from the database.
--
-- Read-only. Every statement is a SELECT.
--
--   cd apps/web
--   DATABASE_URL="$(cat ../../.neon-connection)" \
--     node scripts/run-sql-readonly.mjs ../../tooling/verify/fernbrook-panels.sql
--
-- WHY IT EXISTS. Before a demo, the question "what state is Fernbrook
-- actually in" has to be answered from rows rather than from what a seed
-- script intended to write. A seed reports what it attempted; only the
-- database reports what is there.
--
-- Household is PINNED, never resolved by name and never by "the first
-- household" (G-95). If the pin returns no row, every count below is a
-- count of nothing and reads identically to a genuinely empty household,
-- so section 0 exists to tell those apart before anything else is read.
--
-- COLUMN NOTES, checked against information_schema rather than assumed:
--   consent is on `household` (consent_signed_at, consent_doc_version),
--     not a consent table; there is none.
--   `prompt_pack_item` has no outcome column: fired_at non-null IS the
--     retirement, and the answer is a row in `prompt_outcome`, whose own
--     fired_at means WHEN THE PROMPT SURFACED. Same name, two tables,
--     opposite meanings.
--   `dot` has no status and no resolved_at: a dot closes by gaining
--     promoted_field_id, so promotion IS the closure.
--   `shadow_log` carries no status; it is engine output, not a workflow.


-- =====================================================================
-- 0. PRECONDITION: the household exists at the pinned id.
-- =====================================================================
-- Expect exactly ONE row. Zero rows means every section below is
-- vacuously empty and none of it means what it appears to mean.
SELECT '0. household' AS panel, id, name, tier, status_tag, is_fixture, created_at
FROM household WHERE id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 1. PLAYBOOK HEALTH
-- =====================================================================
-- The drill-in renders "N fields (s1/s2/s3); M unconfirmed" and NOTHING
-- about values. CARRIES A VALUE AND CONFIRMED ARE DIFFERENT FACTS: a
-- field can hold a value nobody confirmed, and be confirmed while empty.
-- `fields` here is the real denominator. (258 is Field Test Home's July
-- import, not Fernbrook's; do not carry it over.)
SELECT '1. playbook health' AS panel,
  count(*)                                                      AS fields,
  count(*) FILTER (WHERE value IS NOT NULL AND value <> '')      AS carries_value,
  count(*) FILTER (WHERE value IS NULL OR value = '')            AS blank,
  count(*) FILTER (WHERE confirmed)                              AS confirmed,
  count(*) FILTER (WHERE NOT confirmed)                          AS unconfirmed,
  count(*) FILTER (WHERE sensitivity = 's1')                     AS s1,
  count(*) FILTER (WHERE sensitivity = 's2')                     AS s2,
  count(*) FILTER (WHERE sensitivity = 's3')                     AS s3,
  count(*) FILTER (WHERE flag IS NOT NULL AND flag <> 'none')    AS flagged
FROM playbook_field WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 2. CONSENT
-- =====================================================================
-- On `household`, not a table of its own. Rendered in UTC deliberately
-- (G-61): a date-only fact cast in a session timezone reads a day early
-- west of UTC.
SELECT '2. consent' AS panel,
  consent_signed_at,
  (consent_signed_at AT TIME ZONE 'UTC')::date AS signed_on_utc,
  consent_doc_version,
  (consent_signed_at IS NOT NULL)              AS consent_on_record
FROM household WHERE id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 3. SHADOW LOG
-- =====================================================================
-- Engine output in shadow mode. Nothing here reaches a HOM until the
-- founder promotes a trigger, so a non-zero count is the engine working
-- and NOT a surface with content on it.
SELECT '3. shadow log' AS panel,
  count(*) AS rows_total,
  count(DISTINCT trigger_key)              AS distinct_triggers,
  count(*) FILTER (WHERE scored_at IS NOT NULL) AS scored,
  min(evaluated_at)                        AS earliest,
  max(evaluated_at)                        AS latest
FROM shadow_log WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 4. PREFERENCE RULES
-- =====================================================================
SELECT '4. preference rules' AS panel,
  count(*)                                        AS rows_total,
  count(*) FILTER (WHERE status = 'active')       AS active,
  count(*) FILTER (WHERE status = 'retired')      AS retired,
  count(*) FILTER (WHERE provenance = 'explicit') AS explicit,
  count(*) FILTER (WHERE provenance <> 'explicit') AS inferred_or_observed,
  count(*) FILTER (WHERE review_by IS NOT NULL AND review_by < current_date) AS past_review
FROM preference_rule WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 5. SITUATIONS
-- =====================================================================
SELECT '5. situations' AS panel,
  count(*)                                   AS rows_total,
  count(*) FILTER (WHERE status = 'open')     AS open,
  count(*) FILTER (WHERE status = 'resolved') AS resolved
FROM situation WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 6. WORK ITEMS
-- =====================================================================
SELECT '6. work items' AS panel,
  count(*)                                         AS rows_total,
  count(*) FILTER (WHERE resolved_at IS NULL)       AS open,
  count(*) FILTER (WHERE resolved_at IS NOT NULL)   AS resolved,
  count(*) FILTER (WHERE due_date IS NOT NULL AND due_date < current_date
                     AND resolved_at IS NULL)       AS overdue_open,
  count(*) FILTER (WHERE window_condition IS NOT NULL) AS condition_timed
FROM work_item WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 7. DECISIONS
-- =====================================================================
SELECT '7. decisions' AS panel,
  count(*)                                        AS rows_total,
  count(*) FILTER (WHERE outcome IS NULL)          AS undecided,
  count(*) FILTER (WHERE outcome IS NOT NULL)      AS decided,
  count(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < now()
                     AND outcome IS NULL)          AS expired_undecided
FROM decision_record WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 8. INCIDENTS
-- =====================================================================
-- A non-zero OPEN count is operationally load-bearing beyond this panel:
-- the erasure tool refuses to run at all while an incident is open.
SELECT '8. incidents' AS panel,
  count(*)                                        AS rows_total,
  count(*) FILTER (WHERE resolved_at IS NULL)      AS open,
  count(*) FILTER (WHERE resolved_at IS NOT NULL)  AS resolved,
  max(occurred_at)                                 AS most_recent
FROM incident_report WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';


-- =====================================================================
-- 9. CHANGE LOG DEPTH
-- =====================================================================
-- Append-only (REQ-005). Depth is the point: a shallow log on an old
-- household means history was not being written, which is a finding
-- rather than a quiet state.
SELECT '9. change log' AS panel,
  count(*)                    AS rows_total,
  count(DISTINCT kind)        AS distinct_kinds,
  count(DISTINCT actor_user)  AS distinct_actors,
  min(created_at)             AS earliest,
  max(created_at)             AS latest
FROM audit_event WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645';

-- The same log by kind, since one busy kind can carry a total that reads
-- as breadth.
SELECT '9b. change log by kind' AS panel, kind, count(*) AS rows, max(created_at) AS latest
FROM audit_event WHERE household_id = '7ed45b9b-aec3-4393-b0a9-19de059a3645'
GROUP BY kind ORDER BY rows DESC, kind;


-- =====================================================================
-- 10. TENANCY CHECK
-- =====================================================================
-- Not a panel. Every count above is scoped to one id, and a count scoped
-- to one id says nothing about what sits elsewhere. This names every
-- household holding prompt items, so a write on the wrong tenant appears
-- as an extra line rather than as silence.
SELECT '10. tenancy' AS panel, h.name, p.household_id, count(*) AS prompt_items
FROM prompt_pack_item p JOIN household h ON h.id = p.household_id
GROUP BY h.name, p.household_id ORDER BY prompt_items DESC;
