/**
 * How a scheduled prompt is described to a HOM, and how the day's prompts
 * are divided between the two field panels.
 *
 * WHY THIS EXISTS. Both surfaces used to split prompts on a boundary and
 * then render the LITERAL STRING "due today" on everything at or before
 * it. A prompt scheduled on 19 July and never answered read "due today"
 * in September, so eight items spanning five weeks all claimed the same
 * urgency. The label was not computed from anything; it sat beside a
 * bucket and described the bucket.
 *
 * The founder's ruling, 27 August 2026: ONE panel with a computed label,
 * not a split into two. A HOM does not think in buckets, they think in
 * what is late, and overdue-ness is information they act on. A panel that
 * can say "overdue by two months" is a better instrument than two panels
 * that cannot say it at all.
 *
 * The second half of the same ruling is the CAPS. The old query was one
 * pool ordered oldest-first with a single limit, so a backlog of past-due
 * items consumed every slot and nothing with a future date was ever
 * fetched. That is why the forward-looking panel read "Nothing scheduled
 * in the window" while eight stale prompts filled the view: not two
 * defects, one backlog starving the other panel. Overdue and upcoming are
 * therefore capped SEPARATELY, and an overdue list longer than its cap
 * reports the remainder as a count rather than truncating silently.
 */

/** Calendar days from a to b, both pinned to UTC midnight first. */
function dayDelta(a: Date, b: Date): number {
  const ua = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const ub = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((ub - ua) / 86_400_000);
}

export type PromptState = "overdue" | "due_today" | "upcoming";

export type PromptTiming = {
  state: PromptState;
  /** Whole days late. 0 unless state is "overdue". Never negative. */
  overdueDays: number;
  /**
   * What a HOM reads. "due today"; "overdue by 3 days"; "overdue by 2
   * months". Upcoming prompts carry no label here, because the surface
   * renders their DATE, which is more useful than a countdown and is
   * what the panel already did correctly.
   */
  label: string | null;
};

/**
 * Days are exact up to 45. Past that a HOM wants the scale, not the
 * arithmetic: "overdue by 67 days" is a number to convert in your head
 * and "overdue by 2 months" is a fact you can act on. 30-day months,
 * stated rather than implied, because this is a description and not a
 * calculation anything depends on.
 */
export function overdueLabel(days: number): string {
  if (days <= 0) return "due today";
  if (days === 1) return "overdue by 1 day";
  if (days <= 45) return `overdue by ${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? "overdue by 1 month" : `overdue by ${months} months`;
}

export function promptTiming(fireAt: Date, now: Date): PromptTiming {
  const delta = dayDelta(fireAt, now); // positive when fireAt is in the past
  if (delta > 0) return { state: "overdue", overdueDays: delta, label: overdueLabel(delta) };
  if (delta === 0) return { state: "due_today", overdueDays: 0, label: "due today" };
  return { state: "upcoming", overdueDays: 0, label: null };
}

export type PartitionCaps = { overdue: number; upcoming: number };

/** The founder's figures, 27 August 2026. Named so a reader sees a decision. */
export const PROMPT_CAPS: PartitionCaps = { overdue: 5, upcoming: 8 };

export type PromptPartition<T> = {
  /**
   * Overdue and due-today together, oldest first, capped. They share a
   * panel because they share a question ("what needs answering now"), and
   * the label separates them without a boundary putting the same object
   * in two places on different days.
   */
  now: T[];
  /** Future prompts, soonest first, capped. */
  upcoming: T[];
  /** Every overdue-or-due-today item, before the cap. */
  nowTotal: number;
  /** How many the cap is hiding. Zero when nothing is hidden. */
  nowHidden: number;
  upcomingTotal: number;
  upcomingHidden: number;
};

/**
 * Oldest first within the now list, because the oldest overdue item
 * genuinely is the most urgent; soonest first within upcoming, because
 * the nearest future item is the one to prepare for.
 */
export function partitionPrompts<T extends { fireAt: Date }>(
  items: readonly T[],
  now: Date,
  caps: PartitionCaps = PROMPT_CAPS,
): PromptPartition<T> {
  const nowList: T[] = [];
  const upcomingList: T[] = [];
  for (const i of items) {
    if (promptTiming(i.fireAt, now).state === "upcoming") upcomingList.push(i);
    else nowList.push(i);
  }
  nowList.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  upcomingList.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return {
    now: nowList.slice(0, caps.overdue),
    upcoming: upcomingList.slice(0, caps.upcoming),
    nowTotal: nowList.length,
    nowHidden: Math.max(0, nowList.length - caps.overdue),
    upcomingTotal: upcomingList.length,
    upcomingHidden: Math.max(0, upcomingList.length - caps.upcoming),
  };
}
