/**
 * Ordered offline mutation queue (the airplane-test contract). Ported from
 * the July 12 foundation repo's verified packages/offline-queue. Network
 * failure retains order; conflicts are surfaced to corporate without
 * blocking later safe work.
 *
 * AF (sync-defect sessions, 2026-07-28): a failed item used to stay
 * "pending" forever with no cap and no distinct state, so a stuck head
 * silently dammed the queue and the operator's only signal was a counter
 * that could not distinguish waiting from stuck. The queue now:
 * - counts attempts and moves an item to "dead" at the drain's
 *   maxAttempts cap (the dead-letter);
 * - keeps the ordering contract BOTH ways: a pending-failed head still
 *   breaks the drain, and a dead head still blocks the tail until the
 *   operator acts, because a submit must not apply before the commands
 *   it depends on;
 * - exposes retryDead (a fresh set of attempts) and discardDead, which
 *   returns the removed item so the caller can write the audit row a
 *   discarded-but-believed-submitted command demands. No audit, no
 *   discard is the caller's contract, enforced where the audit write
 *   lives.
 * Backoff timing lives with the caller (it owns the clock); the pure
 * delay curve is exported here so its bounds are testable.
 *
 * globalThis.crypto.randomUUID so the queue runs unchanged in a browser
 * bundle — it must execute client-side to persist across an offline session.
 */
const randomUUID = () => globalThis.crypto.randomUUID();

export { rehydrate, type HandoffStore, type PersistedRecord } from "./handoff";

export interface QueueCommand {
  type: string;
  idempotencyKey: string;
  payload: { householdId: string; [k: string]: unknown };
}

export interface QueueItem extends QueueCommand {
  readonly id: string;
  readonly sequence: number;
  readonly state: "pending" | "sent" | "conflict" | "dead";
  readonly attempts: number;
}

export interface QueueConflict {
  mutationId: string;
  householdId: string;
  reason: string;
  occurredAt: string;
}

export type Transport = (item: QueueItem) => Promise<{ conflict?: boolean; reason?: string } | void>;

/** Bounded exponential backoff: baseMs * 2^failStreak, capped. Pure so the
 * bounds are provable without a clock. */
export function backoffDelayMs(
  failStreak: number,
  { baseMs = 5_000, capMs = 300_000 }: { baseMs?: number; capMs?: number } = {},
): number {
  if (failStreak <= 0) return baseMs;
  return Math.min(baseMs * 2 ** failStreak, capMs);
}

export class OfflineMutationQueue {
  #items: QueueItem[] = [];
  #conflicts: QueueConflict[] = [];

  enqueue(
    command: QueueCommand,
    restore?: { attempts?: number; state?: "pending" | "dead" },
  ): QueueItem {
    const item = Object.freeze({
      id: randomUUID(),
      sequence: this.#items.length + 1,
      state: restore?.state ?? ("pending" as const),
      attempts: restore?.attempts ?? 0,
      ...command,
    });
    this.#items.push(item);
    return item;
  }

  pending(): QueueItem[] {
    return this.#items.filter((item) => item.state === "pending");
  }

  /** Dead-lettered items: out of attempts, waiting on an operator's
   * retry-or-discard. They still block the tail. */
  dead(): QueueItem[] {
    return this.#items.filter((item) => item.state === "dead");
  }

  conflicts(): QueueConflict[] {
    return [...this.#conflicts];
  }

  /** Operator action: give a dead item a fresh set of attempts. */
  retryDead(itemId: string): QueueItem | null {
    const index = this.#items.findIndex((i) => i.id === itemId && i.state === "dead");
    if (index === -1) return null;
    const revived = Object.freeze({ ...this.#items[index]!, state: "pending" as const, attempts: 0 });
    this.#items[index] = revived;
    return revived;
  }

  /** Operator action: remove a dead item, returning it so the caller can
   * write the audit row. Only dead items are discardable; a healthy
   * pending item is not the operator's to throw away. */
  discardDead(itemId: string): QueueItem | null {
    const index = this.#items.findIndex((i) => i.id === itemId && i.state === "dead");
    if (index === -1) return null;
    const [removed] = this.#items.splice(index, 1);
    return removed ?? null;
  }

  async drain(
    transport: Transport,
    { maxAttempts = Infinity }: { maxAttempts?: number } = {},
  ): Promise<QueueItem[]> {
    const sent: QueueItem[] = [];
    for (let index = 0; index < this.#items.length; index += 1) {
      const item = this.#items[index]!;
      // A dead head blocks the tail: ordering is the contract, and the
      // operator has not yet said what the stuck command means.
      if (item.state === "dead") break;
      if (item.state !== "pending") continue;
      try {
        const result = await transport(item);
        if (result?.conflict) {
          this.#items[index] = Object.freeze({ ...item, state: "conflict" as const, attempts: item.attempts + 1 });
          this.#conflicts.push(Object.freeze({
            mutationId: item.id,
            householdId: item.payload.householdId,
            reason: result.reason ?? "last_write_wins",
            occurredAt: new Date().toISOString(),
          }));
          continue;
        }
        this.#items[index] = Object.freeze({ ...item, state: "sent" as const, attempts: item.attempts + 1 });
        sent.push(item);
      } catch {
        const attempts = item.attempts + 1;
        const state = attempts >= maxAttempts ? ("dead" as const) : ("pending" as const);
        this.#items[index] = Object.freeze({ ...item, state, attempts });
        break; // order is preserved: nothing later jumps the failed item
      }
    }
    return sent;
  }
}
