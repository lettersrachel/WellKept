import { assertWithinCap, type AuthorityClass } from "./authority";

/**
 * The shadow evaluation harness (WK-DEV-007 section 3). The engine
 * evaluates every trigger and writes what it WOULD have surfaced to the
 * shadow sink: signal, confidence, evidence, proposed authority class,
 * and the inputs hash that makes the evaluation replayable. No HOM
 * notification, no client output, no task creation happens here.
 *
 * Safety rails, each enforced in code and proven in the suite:
 * - Deterministic and replayable: the inputs are canonically hashed and
 *   the hash rides the signal; same inputs, same output, same hash.
 * - Evaluation never mutates household data: the inputs are deep-frozen
 *   before the trigger sees them, so a mutating trigger throws instead
 *   of corrupting.
 * - Per-trigger kill switch: a flags record (the REL-01 feature-flag
 *   read, key `trigger:<key>`, fallback ON) silences one trigger with
 *   no deploy.
 * - The A0 cap: promotion (`promoted:<key>` flag, founder-set per
 *   trigger on scored evidence) lets a signal reach the Cockpit SIGNALS
 *   panel, and even then assertWithinCap refuses anything above A0.
 *
 * The sink is an interface: the shadow_log table implements it when its
 * migration lands (its own session); tests use memory. The founder's
 * weekly scoring (true signal / noise / unknowable) lives with the
 * table, not here.
 */
export interface ShadowSignal {
  triggerKey: string;
  householdId: string;
  signal: string;
  confidence: number; // 0..1
  evidence: string[];
  proposedClass: AuthorityClass;
  inputsHash: string;
  evaluatedAt: string;
}

export interface ShadowSink {
  record(signal: ShadowSignal): Promise<void>;
}

export interface ShadowTrigger {
  key: string;
  /** Pure over its inputs; the harness freezes them and hashes them. */
  evaluate(inputs: Record<string, unknown>): {
    signal: string; confidence: number; evidence: string[]; proposedClass: AuthorityClass;
  } | null;
}

/** Canonical JSON (sorted keys, recursively) so the hash is stable
 * regardless of property order. */
export async function canonicalHash(inputs: Record<string, unknown>): Promise<string> {
  const canon = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, canon(x)]));
    }
    return v;
  };
  // Web Crypto, not node:crypto: this package is bundled into the client
  // (the wizard imports its constants), and any node: scheme import,
  // dynamic included, breaks that build. subtle.digest exists in Node 22
  // and every browser alike.
  const bytes = new TextEncoder().encode(JSON.stringify(canon(inputs)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function deepFreeze<T>(v: T): T {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v as object)) deepFreeze((v as Record<string, unknown>)[k]);
  }
  return v;
}

export interface ShadowEvaluationOptions {
  /** The REL-01 flags record, read once per pass by the caller. */
  flags?: Record<string, boolean>;
  /** evaluatedAt injected for determinism in tests and replays. */
  evaluatedAt?: string;
}

/** Evaluate one trigger in shadow: the signal goes to the SINK, always
 * and only. Returns the signal for the caller's bookkeeping, or null
 * when the trigger is killed or found nothing. */
export async function evaluateInShadow(
  trigger: ShadowTrigger,
  householdId: string,
  inputs: Record<string, unknown>,
  sink: ShadowSink,
  opts: ShadowEvaluationOptions = {},
): Promise<ShadowSignal | null> {
  const flags = opts.flags ?? {};
  // Kill switch: `trigger:<key>` with kill-switch semantics (fallback ON).
  if (flags[`trigger:${trigger.key}`] === false) return null;

  const frozen = deepFreeze(structuredClone(inputs));
  const inputsHash = await canonicalHash(inputs);
  const result = trigger.evaluate(frozen);
  if (!result) return null;

  const signal: ShadowSignal = {
    triggerKey: trigger.key,
    householdId,
    signal: result.signal,
    confidence: Math.max(0, Math.min(1, result.confidence)),
    evidence: result.evidence,
    proposedClass: result.proposedClass,
    inputsHash,
    evaluatedAt: opts.evaluatedAt ?? new Date().toISOString(),
  };
  await sink.record(signal);
  return signal;
}

/** The one gate between the shadow log and any human-visible surface
 * (the Cockpit SIGNALS panel). A signal surfaces only when its trigger
 * carries the founder's promotion flag AND its class is within the cap;
 * the cap check throws rather than filters, because a trigger proposing
 * beyond A0 reaching this gate at all is a defect worth hearing about.
 */
export function surfacesBeyondShadow(signal: ShadowSignal, flags: Record<string, boolean>): boolean {
  if (flags[`promoted:${signal.triggerKey}`] !== true) return false;
  assertWithinCap(signal.proposedClass);
  return true;
}
