import { Redis } from "ioredis";

/**
 * Fixed-window rate limit over the existing Redis (sprint-10 hardening,
 * REQ-070). Fails OPEN on Redis trouble: sign-in availability beats a
 * perfect limiter, and the magic-link flow is already unguessable-token
 * gated — this throttles abuse (email bombing, enumeration), it is not
 * the security boundary.
 */
const globalForRedis = globalThis as unknown as { wkRateLimitRedis?: Redis };

function redis(): Redis {
  // Default offline queue ON: commands wait for the connection instead of
  // throwing pre-ready (which made every check fail open — caught in dev).
  globalForRedis.wkRateLimitRedis ??= new Redis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    { maxRetriesPerRequest: 1, connectTimeout: 3000 },
  );
  return globalForRedis.wkRateLimitRedis;
}

export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const r = redis();
    const full = `wk:rl:${key}`;
    const count = await r.incr(full);
    if (count === 1) await r.expire(full, windowSeconds);
    return count <= max;
  } catch {
    return true; // fail open
  }
}
