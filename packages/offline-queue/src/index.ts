/**
 * Ordered offline mutation queue (the airplane-test contract). Ported from
 * the July 12 foundation repo's verified packages/offline-queue. Network
 * failure retains order; conflicts are surfaced to corporate without
 * blocking later safe work.
 *
 * globalThis.crypto.randomUUID so the queue runs unchanged in a browser
 * bundle — it must execute client-side to persist across an offline session.
 */
const randomUUID = () => globalThis.crypto.randomUUID();

export interface QueueCommand {
  type: string;
  idempotencyKey: string;
  payload: { householdId: string; [k: string]: unknown };
}

export interface QueueItem extends QueueCommand {
  readonly id: string;
  readonly sequence: number;
  readonly state: "pending" | "sent" | "conflict";
  readonly attempts: number;
}

export interface QueueConflict {
  mutationId: string;
  householdId: string;
  reason: string;
  occurredAt: string;
}

export type Transport = (item: QueueItem) => Promise<{ conflict?: boolean; reason?: string } | void>;

export class OfflineMutationQueue {
  #items: QueueItem[] = [];
  #conflicts: QueueConflict[] = [];

  enqueue(command: QueueCommand): QueueItem {
    const item = Object.freeze({
      id: randomUUID(),
      sequence: this.#items.length + 1,
      state: "pending" as const,
      attempts: 0,
      ...command,
    });
    this.#items.push(item);
    return item;
  }

  pending(): QueueItem[] {
    return this.#items.filter((item) => item.state === "pending");
  }

  conflicts(): QueueConflict[] {
    return [...this.#conflicts];
  }

  async drain(transport: Transport): Promise<QueueItem[]> {
    const sent: QueueItem[] = [];
    for (let index = 0; index < this.#items.length; index += 1) {
      const item = this.#items[index]!;
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
        this.#items[index] = Object.freeze({ ...item, state: "pending" as const, attempts: item.attempts + 1 });
        break; // order is preserved: nothing later jumps the failed item
      }
    }
    return sent;
  }
}
