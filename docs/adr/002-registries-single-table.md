# ADR-002: Registries as one structured table, not seven

Date: 2026-07-19 | Status: Accepted | Context: REQ-014

## Decision

The seven structured registries (dates, sizes, appliance, vendor,
subscription, commitment, horizon — dot log and gesture log already have
dedicated tables) share ONE `registry_entry` table:

- `kind` (pg enum) discriminates the registry
- `label` is the human handle ("Mia — birthday", "Water heater")
- `detail` (jsonb) carries the kind-shaped payload, validated by per-kind
  zod schemas at the application boundary
- `key_date` is the single date that drives radar/cadence logic
  (birthday, renewal, install date) — one column the trigger engine can
  query across every registry uniformly
- `cadence` is the human-readable rhythm ("annual", "filter every 6 mo")
- `sensitivity` reuses the s1/s2/s3 enum so the EXISTING permission
  matrix filters registries with zero new policy code
- `source_field_id` links back to the playbook field an entry was
  structured out of (provenance; REQ-046 dot promotion lands here too)
- `tombstoned_at` — registries tombstone, never delete (DEV-005 S3)

## Why one table

1. **One permission story.** Sensitivity column + the tested matrix means
   a client sees s1 registry rows and structurally cannot receive s2 —
   same guarantee, no per-table re-implementation.
2. **One radar query.** REQ-051's roster/age and calendar families want
   "every dated thing for this household" — `WHERE key_date IS NOT NULL`
   across kinds beats seven UNIONs.
3. **Pilot scale.** 150 households × a few hundred entries is nothing;
   jsonb + zod gives structure where it matters (the boundary) without
   seven migrations to evolve during the pilot's learning phase.

## Revisit when

- REQ-047 (CPSC recall matching) lands: the appliance registry then needs
  relational integrity against a recalls table — promote `appliance` to
  its own table at that point, migrating its rows out.
- Any registry needs cross-row constraints or per-kind indexes beyond
  (household, kind).

## Explicitly deferred

- Trigger-engine reading `key_date` for birthday math (REQ-051 roster/age
  family) — next engine sprint; the column is shaped for it.
- Structured extraction FROM existing playbook field text — entries are
  authored/seeded directly for now; an extraction assist is a later tool.
