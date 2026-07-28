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
  // G-49 part two: typed horizon-derivation inputs. Optional so existing
  // callers and fixtures stay valid; null/absent means "not collected".
  installedAt?: Date | null;
  lifespanMonths?: number | null;
  maintenanceIntervalMonths?: number | null;
  lastServicedAt?: Date | null;
}

// Synthetic rule ids: sweep items carry a stable per-family "rule" so the
// pack panel can attribute them (no FK on prompt_pack_item.trigger_rule_id).
export const SWEEP_RULE_IDS: Record<string, string> = {
  dates: "01980000-0000-7000-8000-000000000d01",
  commitment: "01980000-0000-7000-8000-000000000d02",
  subscription: "01980000-0000-7000-8000-000000000d03",
  horizon: "01980000-0000-7000-8000-000000000d04",
  appliance: "01980000-0000-7000-8000-000000000d06", // d05 = observances
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

export const WINDOWS: Record<string, { annual: boolean; windows: SweepWindow[] }> = {
  dates: {
    annual: true,
    windows: [
      { offsetDays: 14, text: (l, w) => `Occasion radar: ${l} on ${w}. Is a gesture planned?` },
      { offsetDays: 3, text: (l, w) => `${l} is three days out (${w}). Is the plan in motion?` },
    ],
  },
  commitment: {
    annual: true,
    windows: [
      { offsetDays: 14, text: (l, w) => `Prep window opens: ${l} (${w}).` },
      { offsetDays: 3, text: (l, w) => `Final prep: ${l} (${w}).` },
    ],
  },
  subscription: {
    annual: false,
    windows: [{ offsetDays: 30, text: (l, w) => `Renewal ahead: ${l} on ${w}.` }],
  },
  horizon: {
    annual: false,
    windows: [{ offsetDays: 30, text: (l, w) => `Coming due: ${l} (${w}). Start planning before it becomes urgent.` }],
  },
  appliance: {
    annual: false,
    windows: [{ offsetDays: 14, text: (l, w) => `Maintenance due: ${l} (${w}); it has been a full interval since the last service.` }],
  },
};

/** Calendar-aware month addition, day clamped (Jan 31 + 1mo → Feb 28/29). */
export function addMonthsUTC(d: Date, months: number): Date {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 13, 0, 0));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d.getUTCDate(), daysInMonth), 13, 0, 0));
}

/** Next service-due date on/after now: lastServiced + k·interval, smallest k ≥ 1.
 * Recurring by nature — an unserviced appliance re-prompts every cycle;
 * recording a service (updating last_serviced_at) moves the whole series. */
export function nextIntervalOccurrence(lastServiced: Date, intervalMonths: number, now: Date): Date {
  let k = 1;
  let due = addMonthsUTC(lastServiced, intervalMonths);
  while (due.getTime() < now.getTime() - DAY && k < 600) {
    k += 1;
    due = addMonthsUTC(lastServiced, k * intervalMonths);
  }
  return due;
}

/**
 * G-49 part two: the dated events an entry implies. An explicit key_date
 * wins for the entry's own kind (the operator said so); the typed inputs
 * fill in what no one maintains — end-of-life from installed + lifespan,
 * maintenance from last-serviced + interval. Derived from facts that only
 * change when the world does, so these dates cannot rot.
 */
export function entryEvents(entry: RegistryEntryLike, now: Date): { occurrence: Date; windowsKey: string }[] {
  const events: { occurrence: Date; windowsKey: string }[] = [];
  const spec = WINDOWS[entry.kind];
  if (entry.keyDate && spec) {
    events.push({ occurrence: spec.annual ? nextAnnualOccurrence(entry.keyDate, now) : entry.keyDate, windowsKey: entry.kind });
  } else if (!entry.keyDate && (entry.kind === "horizon" || entry.kind === "appliance") && entry.installedAt && entry.lifespanMonths) {
    events.push({ occurrence: addMonthsUTC(entry.installedAt, entry.lifespanMonths), windowsKey: "horizon" });
  }
  if (entry.kind === "appliance" && entry.lastServicedAt && entry.maintenanceIntervalMonths) {
    events.push({ occurrence: nextIntervalOccurrence(entry.lastServicedAt, entry.maintenanceIntervalMonths, now), windowsKey: "appliance" });
  }
  return events;
}

/**
 * F1 (round five): the W-9 object collapse, shared so the display and the
 * guard test use ONE definition. Date position in templates is a
 * load-bearing convention; the template-collapse test enforces it.
 */
export function collapseItemText(t: string): string {
  return t.replace(/\s*\(([^)]*)\)|\son\s.+$/g, "").trim();
}

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
    for (const ev of entryEvents(entry, now)) {
      const spec = WINDOWS[ev.windowsKey];
      if (!spec) continue;
      const occurrence = ev.occurrence;
      if (occurrence.getTime() < now.getTime() - DAY) continue; // one-shot already past
      for (const w of spec.windows) {
        const windowOpens = new Date(occurrence.getTime() - w.offsetDays * DAY);
        if (windowOpens.getTime() > now.getTime()) continue; // not yet in window
        if (occurrence.getTime() < now.getTime()) continue; // occurrence passed
        out.push({
          householdId: entry.householdId,
          triggerRuleId: SWEEP_RULE_IDS[ev.windowsKey] ?? SWEEP_RULE_IDS.dates!,
          // M: the key is the identifier; the name is display. Minted equal
          // at the split; a display rename never changes exclusion matching.
          packKey: `${ev.windowsKey}-radar`,
          packName: `${ev.windowsKey}-radar`,
          itemText: w.text(entry.label, fmt(occurrence, timezone)),
          fireAt: clampOutOfQuietHours(new Date(Math.max(windowOpens.getTime(), now.getTime())), timezone),
          suppressedByTag: suppressed,
          occurrence: occurrence.toISOString(),
        });
      }
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

// ---------------------------------------------------------------------------
// REQ-051 completion: the movable-dates and threshold families.
// ---------------------------------------------------------------------------

export const OBSERVANCE_RULE_ID = "01980000-0000-7000-8000-000000000d05";

/**
 * M (round six, K member 3): the sweep finds its input field by this name
 * prefix. One definition, used by the runner's LIKE and asserted against
 * the intake seed template by seed-binding.test.ts, so a seed rename
 * cannot silently detach the observance radar.
 */
export const OBSERVANCES_FIELD_PREFIX = "Movable-date observances";

export interface MovableObservanceLike { name: string; date: Date }
export interface HouseholdObservanceField {
  householdId: string;
  statusTag: string;
  /** The household's movable-date observances field value ("" = none kept). */
  fieldValue: string;
}

/**
 * Movable dates (DEV-005 S2: from the maintained calendar table, never
 * computed): a household gets an observance radar item when ITS OWN
 * Playbook names the observance — the movable_observance table carries the
 * date, the field carries the relevance. T-14 radar, one-shot per year.
 */
export function sweepMovableObservances(
  observances: MovableObservanceLike[],
  households: HouseholdObservanceField[],
  opts: { now?: Date; timezone?: string } = {},
): SweepDraft[] {
  const now = opts.now ?? new Date();
  const timezone = opts.timezone ?? "America/New_York";
  const out: SweepDraft[] = [];
  for (const obs of observances) {
    if (obs.date.getTime() < now.getTime()) continue; // passed this year
    const windowOpens = obs.date.getTime() - 14 * DAY;
    if (windowOpens > now.getTime()) continue; // not in window yet
    for (const hh of households) {
      if (!hh.fieldValue.toLowerCase().includes(obs.name.toLowerCase())) continue;
      out.push({
        householdId: hh.householdId,
        triggerRuleId: OBSERVANCE_RULE_ID,
        packKey: "observance-radar",
        packName: "observance-radar",
        itemText: `Movable observance ahead: ${obs.name} on ${fmt(obs.date, timezone)}. Prep per this household's Playbook and WK-STD-014.`,
        fireAt: clampOutOfQuietHours(new Date(Math.max(windowOpens, now.getTime())), timezone),
        suppressedByTag: hh.statusTag === "LIFE-EVENT",
        occurrence: obs.date.toISOString(),
      });
    }
  }
  return out;
}

/**
 * M (round six, K member 5): the no-drift vocabulary is a code-owned
 * constant, not a convention HMs are taught by placeholder copy. The visit
 * wizard writes it via its own control, the exhibit page and the detector
 * read it from here; a copy pass cannot silently change what breaks the run.
 */
export const ZONE_DRIFT_NONE = "none";

/**
 * The threshold family's converged number (Addendum A1 S5: APP-002's load
 * signal and STD-023's maintenance-capacity threshold are the same rule):
 * three consecutive visits reporting zone drift. Input is the most-recent-
 * first drift answers of APPLIED visits; "none" (or blank) breaks the run.
 */
export function detectLoadSignal(zoneDriftAnswers: (string | null | undefined)[]): boolean {
  if (zoneDriftAnswers.length < 3) return false;
  return zoneDriftAnswers.slice(0, 3).every((a) => {
    const t = (a ?? "").trim().toLowerCase();
    return t !== "" && t !== ZONE_DRIFT_NONE;
  });
}
