/**
 * REQ-051 roster/age + calendar families over the structured registries
 * (ADR-002): key_date drives everything. Pure computation here; the
 * runner in run.ts does the I/O. Windows per kind:
 *
 *   dates        annual recurrence; radar at T-14, confirm at T-3 (REQ-030)
 *   commitment   annual when cadence says so; prep opens T-14, final T-3
 *                (the REQ-053 commitment-cascade shape)
 *   subscription renewal heads-up at T-30
 *   horizon      one-shot transition heads-up at T-30
 *
 * Deterministic item ids: (entry, occurrence, text) — the sweep can run
 * every day, anywhere, and only ever add what is new.
 */
import { clampOutOfQuietHours, type PromptPackItemDraft } from "./engine.ts";

export interface RegistryEntryLike {
  id: string;
  householdId: string;
  kind: string;
  label: string;
  keyDate: Date | null;
  cadence: string | null;
}

// Synthetic rule ids: sweep items carry a stable per-family "rule" so the
// pack panel can attribute them (no FK on prompt_pack_item.trigger_rule_id).
export const SWEEP_RULE_IDS: Record<string, string> = {
  dates: "01980000-0000-7000-8000-000000000d01",
  commitment: "01980000-0000-7000-8000-000000000d02",
  subscription: "01980000-0000-7000-8000-000000000d03",
  horizon: "01980000-0000-7000-8000-000000000d04",
};

const DAY = 24 * 60 * 60 * 1000;

/** Next occurrence of an annual date on/after `now` (month/day carried). */
export function nextAnnualOccurrence(keyDate: Date, now: Date): Date {
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), keyDate.getUTCMonth(), keyDate.getUTCDate(), 13, 0, 0));
  if (candidate.getTime() < now.getTime() - DAY) {
    return new Date(Date.UTC(now.getUTCFullYear() + 1, keyDate.getUTCMonth(), keyDate.getUTCDate(), 13, 0, 0));
  }
  return candidate;
}

function fmt(d: Date, timezone: string): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: timezone });
}

interface SweepWindow { offsetDays: number; text: (label: string, when: string) => string }

const WINDOWS: Record<string, { annual: boolean; windows: SweepWindow[] }> = {
  dates: {
    annual: true,
    windows: [
      { offsetDays: 14, text: (l, w) => `Occasion radar: ${l} on ${w}. Is a gesture planned?` },
      { offsetDays: 3, text: (l, w) => `T-3: ${l} (${w}) — confirm the plan is in motion.` },
    ],
  },
  commitment: {
    annual: true,
    windows: [
      { offsetDays: 14, text: (l, w) => `Prep window opens: ${l} (${w}).` },
      { offsetDays: 3, text: (l, w) => `Final prep: ${l} is ${w}.` },
    ],
  },
  subscription: {
    annual: false,
    windows: [{ offsetDays: 30, text: (l, w) => `Renewal ahead: ${l} on ${w}.` }],
  },
  horizon: {
    annual: false,
    windows: [{ offsetDays: 30, text: (l, w) => `Transition ahead: ${l} (${w}).` }],
  },
};

export interface SweepDraft extends PromptPackItemDraft { occurrence: string }

export function sweepRegistryDates(
  entries: RegistryEntryLike[],
  opts: { now?: Date; statusTag: string; timezone?: string } ,
): SweepDraft[] {
  const now = opts.now ?? new Date();
  const timezone = opts.timezone ?? "America/New_York";
  const suppressed = opts.statusTag === "LIFE-EVENT";
  const out: SweepDraft[] = [];
  for (const entry of entries) {
    if (!entry.keyDate) continue;
    const spec = WINDOWS[entry.kind];
    if (!spec) continue;
    const occurrence = spec.annual ? nextAnnualOccurrence(entry.keyDate, now) : entry.keyDate;
    if (occurrence.getTime() < now.getTime() - DAY) continue; // one-shot already past
    for (const w of spec.windows) {
      const windowOpens = new Date(occurrence.getTime() - w.offsetDays * DAY);
      if (windowOpens.getTime() > now.getTime()) continue; // not yet in window
      if (occurrence.getTime() < now.getTime()) continue; // occurrence passed
      out.push({
        householdId: entry.householdId,
        triggerRuleId: SWEEP_RULE_IDS[entry.kind] ?? SWEEP_RULE_IDS.dates!,
        packName: `${entry.kind}-radar`,
        itemText: w.text(entry.label, fmt(occurrence, timezone)),
        fireAt: clampOutOfQuietHours(new Date(Math.max(windowOpens.getTime(), now.getTime())), timezone),
        suppressedByTag: suppressed,
        occurrence: occurrence.toISOString(),
      });
    }
  }
  return out;
}

/** Deterministic id for a sweep item: same entry+occurrence+text never double-inserts. */
export async function sweepItemId(entryId: string, occurrenceIso: string, itemText: string): Promise<string> {
  const data = new TextEncoder().encode(`sweep|${entryId}|${occurrenceIso}|${itemText}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
