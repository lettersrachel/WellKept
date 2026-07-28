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
 * cannot support a rate (fewer than two live looks, or no time span). */
export function conditionRatePer30Days(looks: FlagLook[]): number | null {
  const live = looks.filter((l) => !l.supersededAt)
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  if (live.length < 2) return null;
  const first = live[0]!;
  const last = live[live.length - 1]!;
  const days = (last.observedAt.getTime() - first.observedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 0) return null;
  return ((first.value - last.value) / days) * 30;
}

export function isPromotionCandidate(looks: FlagLook[], knob: FlagPromotionKnob): boolean {
  if (knob.rateThreshold === null) return false; // nothing promotes while unset
  const live = looks.filter((l) => !l.supersededAt);
  if (live.length < knob.minObservations) return false;
  const rate = conditionRatePer30Days(live);
  return rate !== null && rate >= knob.rateThreshold && rate > 0;
}
