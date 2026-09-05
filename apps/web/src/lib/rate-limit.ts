import { Redis } from "ioredis";

/**
 * Fixed-window rate limit over the existing Redis (sprint-10 hardening,
 * REQ-070).
 *
 * THE FAILURE MODE IS AN ARGUMENT, NOT A DEFAULT (founder ruling, 5
 * September 2026, on the security self-audit). It used to fail OPEN
 * everywhere, with the reason written down: sign-in availability beats a
 * perfect limiter. That was a defensible call made when no real
 * household existed, and the ruling changes it on the sign-in path only.
 *
 * It is a REQUIRED parameter rather than a default because the two
 * answers are opposite and a new call site must choose. A default here
 * is the shape the producer rule bars: whichever answer were the
 * default, a later site would inherit it silently and nobody could tell
 * an inherited answer from a decided one.
 *
 * WHAT FAIL-CLOSED COSTS, stated where it is implemented rather than
 * only in the report: if Redis is unreachable, NO NEW SIGN-IN SUCCEEDS,
 * on web or mobile. The bound that makes that acceptable is that the
 * session strategy is DATABASE, so every session already signed in
 * keeps working: an outage blocks new entry and does not evict anyone,
 * including the founder mid-incident.
 */
export type LimitFailureMode = "closed" | "open";

const globalForRedis = globalThis as unknown as { wkRateLimitRedis?: Redis };

function redis(): Redis {
  // Default offline queue ON: commands wait for the connection instead of
  // throwing pre-ready (which made every check fail open, caught in dev).
  globalForRedis.wkRateLimitRedis ??= new Redis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    { maxRetriesPerRequest: 1, connectTimeout: 3000 },
  );
  return globalForRedis.wkRateLimitRedis;
}

/**
 * True when the call is within budget.
 *
 * @param onError what an unreachable Redis means. "closed" refuses the
 *   request (use on any path that issues or accepts a credential);
 *   "open" allows it (use only where blocking is worse than allowing,
 *   and say why at the call site).
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  onError: LimitFailureMode,
): Promise<boolean> {
  try {
    const r = redis();
    const full = `wk:rl:${key}`;
    const count = await r.incr(full);
    if (count === 1) await r.expire(full, windowSeconds);
    return count <= max;
  } catch {
    return onError === "open";
  }
}
