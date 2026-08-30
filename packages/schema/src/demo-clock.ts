/**
 * demo-clock.ts : the one place the Fernbrook demo's dates come from.
 *
 * WHY THIS EXISTS. The corporate board read 0 applied visits in 30 days
 * while Fernbrook's own record read 15.5 delivery hours in the same window
 * and a last applied visit of 19 July. Hours without a visit is internally
 * contradictory, because in the real system a visit close is what WRITES
 * the time entry (visit-command-store.ts, one transaction).
 *
 * The cause was two seeds keeping two clocks. `demo-primitives.ts` wrote
 * delivery hours at FIXED dates; `demo-content.ts` inserted its applied
 * visit with no `received_at`, so the column defaulted to now() and the
 * visit was dated whenever the seed happened to run. Seeded months apart,
 * they disagreed, and the disagreement grew by one day per day.
 *
 * Both now read these constants, so a re-seed on any date produces the
 * same, consistent record.
 */

/** The four Thursdays the demo's trailing month of service happened on. */
export const DEMO_VISIT_DAYS = ["2026-08-06", "2026-08-13", "2026-08-20", "2026-08-27"] as const;

/** The most recent one, which carries the rich report demo-content seeds. */
export const DEMO_LAST_VISIT_DAY = DEMO_VISIT_DAYS[DEMO_VISIT_DAYS.length - 1]!;

/** Visits close in the early evening; the report lands with the close. */
export const DEMO_VISIT_CLOSE_UTC = "18:10:00Z";
