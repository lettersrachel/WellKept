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

/** Delivery minutes per visit day, aligned index-for-index with
 * DEMO_VISIT_DAYS (3.5 to 4 hours, per the demo spec). The same figures
 * drive the time entries, the visit payloads' hours, and therefore what
 * the economics page derives, so the three can never disagree. */
export const DEMO_DELIVERY_MIN = [210, 240, 240, 240] as const;

/** The fixed id of the most recent visit, which demo-content.ts owns
 * (it carries the rich three-sentence report). Here so demo-primitives
 * can LINK the Aug 27 delivery time entry to it without either script
 * importing the other. */
export const DEMO_LAST_VISIT_ID = "01980000-0000-7000-8000-00000000de10";

/** An applied visit's payload hours for a given day and duration, in the
 * exact shape the close flow submits and the economics page reads. */
export function demoVisitHours(day: string, minutes: number) {
  const startedAt = `${day}T13:00:00.000Z`;
  const endedAt = new Date(+new Date(startedAt) + minutes * 60_000).toISOString();
  return { startedAt, endedAt };
}
