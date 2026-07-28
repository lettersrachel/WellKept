/**
 * W-5 (STD-016 S5): promotion is a COMPUTED property, not a state machine.
 * "Anything degrading faster than its flag assumed is promoted" - the rate
 * comes from the flag's observation series, the threshold from the
 * flag_promotion knob, and nothing promotes while the threshold is unset
 * (founder decision 3, the informativeRateFloor posture: the number is
 * calibrated from real data, never invented at a desk).
 *
 * Promotion raises attention, never a prompt (founder decision 4): the
 * candidate rises in the briefing and is marked for the corporate digest.
 * Feeding synthetic prompts into the uncalibrated health metrics would
 * corrupt the exact numbers the knobs wait for.
 */

export interface FlagPromotionKnob {
  /** A rate computed from fewer looks than this is a line, not a trend. */
  minObservations: number;
  /** Condition points lost per 30 days that count as "faster than assumed".
   * DELIBERATELY null until the founder sets it from real series. */
  rateThreshold: number | null;
}

export const DEFAULT_FLAG_PROMOTION: FlagPromotionKnob = {
  minObservations: 3,
  rateThreshold: null,
};

export interface FlagLook {
  value: number;
  observedAt: Date;
  supersededAt?: Date | null;
}

/** Condition points lost per 30 days across the live (non-superseded)
 * series, oldest to newest. Positive = degrading. Null when the series
 * cannot support a rate (fewer than two live looks, or no time span).
 *
 * Session Y (founder decision): the rate is computed over observations
 * AT OR AFTER the flag was raised, never the object's full history.
 * STD-016 says degrading faster than ITS FLAG assumed: the flag sets
 * the baseline rather than inheriting one, and under all-history a
 * well-documented object would be promotion-eligible the day it was
 * flagged, on observations nobody raised it about. The flag-id tagging
 * already enforces this structurally for looks logged via the flag;
 * the sinceRaised filter is the belt for any path that reaches the
 * shared series directly. */
export function conditionRatePer30Days(looks: FlagLook[], sinceRaised?: Date): number | null {
  const live = looks.filter((l) => !l.supersededAt)
    .filter((l) => !sinceRaised || l.observedAt.getTime() >= sinceRaised.getTime())
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  if (live.length < 2) return null;
  const first = live[0]!;
  const last = live[live.length - 1]!;
  const days = (last.observedAt.getTime() - first.observedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 0) return null;
  return ((first.value - last.value) / days) * 30;
}

export function isPromotionCandidate(looks: FlagLook[], knob: FlagPromotionKnob, sinceRaised?: Date): boolean {
  if (knob.rateThreshold === null) return false; // nothing promotes while unset
  const live = looks.filter((l) => !l.supersededAt)
    .filter((l) => !sinceRaised || l.observedAt.getTime() >= sinceRaised.getTime());
  // minObservations counts the FLAG's own looks (session Y): pre-flag
  // history cannot satisfy it, or the minimum stops meaning anything on
  // a well-documented object.
  if (live.length < knob.minObservations) return false;
  const rate = conditionRatePer30Days(live, sinceRaised);
  return rate !== null && rate >= knob.rateThreshold && rate > 0;
}
