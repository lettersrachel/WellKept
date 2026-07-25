/**
 * REQ-054 (Addendum A2 Part 2): repeat-season memory. Recall, not a rule
 * family — these functions turn a household's own history into season-keyed
 * FACT rows and select which of them belong in a briefing. Nothing here
 * creates prompts, asserts policy, or reads across households.
 *
 * Pure computation; run.ts materializes rows (deterministic ids, idempotent
 * daily) and the briefing read filters through the exclusion list before
 * rendering (A2 guardrail: a recall naming an excluded topic does not
 * surface).
 */

export interface SeasonAnchor {
  kind: "visit" | "dot" | "gesture";
  id: string;
  householdId: string;
  occurredAt: Date;
  /** The human line the anchor carries (report sentence, verbatim, idea). */
  text: string;
}

export interface SeasonObservationDraft {
  householdId: string;
  observedAt: Date;
  seasonMonth: number; // 1-12
  seasonWeek: number; // 1-53
  anchorKind: string;
  anchorId: string;
  summary: string;
  recurrence: "annual" | "seasonal" | "none";
  confidence: "observed" | "inferred";
}

/** DEV-005 applies to generated summaries: no em dashes (A2 finding 9). */
export function sanitizeSummary(text: string): string {
  return text.replace(/—/g, ", ").replace(/\s+/g, " ").trim();
}

/** ISO-adjacent week of year, 1-53 — matching granularity only, not calendars. */
export function weekOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.min(53, Math.floor((d.getTime() - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
}

const SUMMARY: Record<SeasonAnchor["kind"], (text: string) => string> = {
  visit: (t) => `Around this time last year, the visit report noted: ${t}`,
  dot: (t) => `Heard around this time last year: "${t}"`,
  gesture: (t) => `A gesture landed around this time last year: ${t}`,
};

/**
 * One observation per anchor. Everything is `confidence: observed` (the
 * anchor happened) and `recurrence: none` (recall reports fact; asserting a
 * pattern would be inference, which stays out until there are multiple
 * years to infer from). Anchors with no usable text produce nothing.
 */
export function deriveSeasonObservations(anchors: SeasonAnchor[]): SeasonObservationDraft[] {
  const out: SeasonObservationDraft[] = [];
  for (const a of anchors) {
    const text = sanitizeSummary(a.text);
    if (!text) continue;
    out.push({
      householdId: a.householdId,
      observedAt: a.occurredAt,
      seasonMonth: a.occurredAt.getUTCMonth() + 1,
      seasonWeek: weekOfYear(a.occurredAt),
      anchorKind: a.kind,
      anchorId: a.id,
      summary: SUMMARY[a.kind](text).slice(0, 300),
      recurrence: "none",
      confidence: "observed",
    });
  }
  return out;
}

export interface RecallRow {
  seasonMonth: number;
  observedAt: Date;
  summary: string;
  supersededBy?: string | null;
}

const MIN_AGE_DAYS = 300; // A2 derivation: at least 300 days old on day D

/**
 * The recall selection for day D: this household's observations whose season
 * month is the current month and which are old enough to be "last year", not
 * "last week". Superseded rows never surface.
 */
export function selectRecall<T extends RecallRow>(rows: T[], now: Date): T[] {
  const cutoff = now.getTime() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
  const month = now.getUTCMonth() + 1;
  return rows
    .filter((r) => !r.supersededBy && r.seasonMonth === month && r.observedAt.getTime() <= cutoff)
    .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
}

/**
 * A2 guardrail: recall is filtered through the exclusion list before
 * rendering. Topic/person/all scopes apply (rule and field scopes name
 * scheduler concepts recall doesn't have).
 */
export function recallExcluded(
  summary: string,
  exclusions: { scope: string; target: string }[],
): boolean {
  const lower = summary.toLowerCase();
  return exclusions.some((x) => {
    if (x.scope === "all") return true;
    if (x.scope !== "topic" && x.scope !== "person") return false;
    const t = x.target.trim().toLowerCase();
    return t.length > 0 && lower.includes(t);
  });
}

/** Deterministic id: the same anchor never materializes twice. */
export async function seasonObservationId(anchorKind: string, anchorId: string): Promise<string> {
  const data = new TextEncoder().encode(`season|${anchorKind}|${anchorId}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
