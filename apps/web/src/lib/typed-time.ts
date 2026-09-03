/**
 * G-116 ruling ("true instant", 2 September 2026): every typed time is a
 * wall-clock reading in the OPERATOR'S zone, and the store holds UTC
 * instants. This module is the ONE conversion path; the guard test
 * asserts no action parses a typed time any other way, which is what
 * "fails on any zone-less time write" means structurally.
 *
 * No dependency is introduced (the stack is pinned): the zone math is
 * the standard two-pass Intl technique. Pass one guesses the instant as
 * if the wall clock were UTC and reads the zone's offset AT that guess;
 * pass two re-reads the offset at the corrected instant, which converges
 * across DST transitions (an offset is wrong only when the first guess
 * lands on the other side of a transition, and the second read is taken
 * from the right side).
 */

function tzOffsetMs(tz: string, utc: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(utc)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return asUtc - utc.getTime();
}

/** True when the string names a real IANA zone this runtime knows. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * A datetime-local string ("2026-08-30T09:00") plus the operator's IANA
 * zone becomes the true UTC instant, or null when either input is not
 * what it claims. Null is a refusal, never a fallback: a zone-less time
 * write is the exact defect this ruling closes.
 */
export function parseTypedInstant(local: string, tz: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local);
  if (!match) return null;
  if (!isValidTimeZone(tz)) return null;
  const [, y, m, d, hh, mm, ss] = match;
  const guess = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss ?? "0"));
  let offset = tzOffsetMs(tz, new Date(guess));
  offset = tzOffsetMs(tz, new Date(guess - offset));
  return new Date(guess - offset);
}

/** The stored instant rendered as the operator's own wall clock. */
export function formatInZone(instant: Date, tz: string): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}
