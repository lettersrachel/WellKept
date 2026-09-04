/**
 * Q-4: the judgment-free pattern list (RFC-001 §4 as absorbed by
 * RFC-ATTR-01 Amendment 1 §A1.4, extended by Ruling 2 §5).
 *
 * FOUNDER-EDITABLE, versioned by review: every entry carries its WHY,
 * and a change to this list is a reviewed commit, never a drive-by.
 * The guard (judgment-free.test.ts) refuses any schema column whose
 * name matches an entry unless a written exception names it.
 *
 * What the list bars is the INFERENCE, never the human record: the
 * 4 September adoption ruling admits `load_concern_raised` (a
 * human-recorded concern with a required reported_by, self or senior;
 * no code path sets it) and it matches no pattern here BY DESIGN. If a
 * future pattern would catch it, the allowlist entry cites that
 * ruling. The same boundary the standing law draws everywhere:
 * capacity measurement is not performance scoring, a person's own
 * report is not an inference about them.
 */

export type JudgmentFreePattern = { re: RegExp; why: string };

export const JUDGMENT_FREE_PATTERNS: readonly JudgmentFreePattern[] = [
  {
    re: /rank|leaderboard/i,
    why: "Ruling 1 and Ruling 2 s5: no ranking construct over HOMs, ever; a column named for ranking is the schema starting to hold one",
  },
  {
    re: /stress|emotion|mood|burnout|anxiet/i,
    why: "Ruling 2 s5: stress and emotion inference are barred; a column with these names is the inference getting a place to live",
  },
  {
    re: /cognitive_load/i,
    why: "the standing bar written on WorkCognitiveLoadProfile in the CAND ledger: planning input, never a stored per-person load figure",
  },
  {
    re: /health_score|health_risk|diagnos|medical_flag/i,
    why: "Ruling 2 s5 health inference, and the adopted no-diagnosis gate: no baseline behavior may require a diagnosis flag, so no column holds one",
  },
  {
    re: /^social_|_social_/i,
    why: "Ruling 2 s5: no inference from social content into household truth or authority; social-sourced columns are where that would land",
  },
  {
    re: /temperament|personality/i,
    why: "RFC-001 s4's own words: no person-characterizing column, no temperament words",
  },
];

/** The written-exception hatch: column -> the reason and its authority. */
export const JUDGMENT_FREE_EXCEPTIONS: Record<string, string> = {};
