-- 0061: the G-119 backfill (G-116's ruling, founder zones confirmed
-- 2 September 2026: America/New_York for both operators).
--
-- WHAT CONVERTS AND WHY, per clause:
--
-- Clause 1 shifts INSTANTS, and is the non-recoverable one. A pre-ruling
-- source = 'manual' row holds the operator's WALL CLOCK stamped as UTC
-- (the G-116 finding): typed 09:00 Eastern, stored 09:00Z. The
-- conversion reads the stored value's UTC wall-clock fields and
-- re-interprets them in America/New_York, which is DST-aware per row
-- date by Postgres's own tzdata: a July row lands 13:00Z, a January row
-- 14:00Z. Guards on the WHERE, each load-bearing:
--   source = 'manual'  : seeded rows self-mark source = 'seed' and hold
--                        deliberate TRUE instants (the G-113 clock
--                        work); shifting them would corrupt the demo by
--                        the zone offset. visit_close rows were always
--                        true instants (browser-converted). Only manual
--                        rows were typed into the skewing forms.
--   tz IS NULL         : a post-0060 manual row already carries its zone
--                        and a TRUE instant; shifting it would be the
--                        double-shift this clause must never do, and
--                        the same guard makes an accidental re-apply a
--                        no-op.
-- minutes is untouched: both ends shift equally, durations were always
-- right.
--
-- Clause 2 sets ONLY the zone label on visit_close rows (instants
-- untouched, so a wrong label here would mislabel display and be
-- correctable, unlike clause 1). Every production visit close to date
-- was performed by one of the two named operators in America/New_York.
--
-- Rows with source = 'seed' keep tz NULL deliberately: their author is
-- a script, "zone not recorded" is the true statement, and displays
-- fall back to the honest UTC label.
--
-- THE TIGHTEN (tz NOT NULL) IS DELIBERATELY NOT HERE. The visit-close
-- sink still grandfathers a legacy queued offline command without tz
-- (writing tz NULL), so a NOT NULL would turn a pre-0060 device's sync
-- into a stuck queue head. The constraint lands as its own one-line
-- reviewed migration once no pre-0060 queued commands can exist; the
-- G-119 register entry carries the condition.
--
-- READ before applying: two UPDATEs, no DDL, both idempotent under
-- their own WHERE clauses.
UPDATE "time_entry" SET
  "started_at" = (("started_at" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York'),
  "ended_at"   = (("ended_at"   AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York'),
  "tz" = 'America/New_York'
WHERE "source" = 'manual' AND "tz" IS NULL;--> statement-breakpoint
UPDATE "time_entry" SET "tz" = 'America/New_York'
WHERE "source" = 'visit_close' AND "tz" IS NULL;
