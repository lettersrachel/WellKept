/**
 * Trigger engine core (REQ-050/051/052): pure functions, no I/O. The worker
 * shell (index.ts) feeds it field-change events and writes what it returns.
 *
 * Rules per WK-DEV-005:
 * - Packs are scheduled INSTANCES that survive source-field edits; the
 *   engine emits concrete prompt_pack_item rows, never live queries.
 * - LIFE-EVENT suppression HOLDS items (suppressed_by_tag = true), never
 *   deletes or skips them; the hold is released by a later tag change.
 * - No client-facing prompt fires 9pm-7am household-local; fire-at times
 *   are computed in the household's timezone (America/New_York for the
 *   pilot) and clamped forward to 7am.
 */

export interface FieldChangeEvent {
  householdId: string;
  fieldId: string;
  fieldName: string;
  section: number;
  newValue: string;
  changedAt: string; // ISO
}

export interface TriggerRuleRow {
  id: string;
  householdId: string | null; // null = fleet-level library rule
  family: string;
  bindsToFieldName: string | null;
  enabled: boolean;
  definition: {
    packName: string;
    items: { text: string; offsetDays: number }[];
  };
}

export interface PromptPackItemDraft {
  householdId: string;
  triggerRuleId: string;
  packName: string;
  itemText: string;
  fireAt: Date;
  suppressedByTag: boolean;
}

const QUIET_START_HOUR = 21; // 9pm household-local
const QUIET_END_HOUR = 7; // 7am household-local

/** Hour-of-day in a timezone without a date library. */
function hourIn(timezone: string, date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false, }).format(date),
  ) % 24;
}

/**
 * Clamp a fire-at instant out of household quiet hours (REQ-052): anything
 * landing 9pm-7am household-local moves forward, hour by hour, to the first
 * 7am-or-later moment. Hour steps keep this DST-correct without a tz math
 * library; at most 10 iterations.
 */
export function clampOutOfQuietHours(fireAt: Date, timezone: string): Date {
  let out = new Date(fireAt);
  for (let i = 0; i < 24; i += 1) {
    const hour = hourIn(timezone, out);
    if (hour >= QUIET_END_HOUR && hour < QUIET_START_HOUR) return out;
    out = new Date(+out + 60 * 60 * 1000);
  }
  return out; // unreachable for a valid timezone; fail open to "later"
}

export function ruleMatches(rule: TriggerRuleRow, event: FieldChangeEvent): boolean {
  if (!rule.enabled) return false;
  if (rule.householdId !== null && rule.householdId !== event.householdId) return false;
  if (!rule.bindsToFieldName) return false;
  return event.fieldName.toLowerCase().includes(rule.bindsToFieldName.toLowerCase());
}

/**
 * Evaluate one field-change event against the rule library. statusTag drives
 * suppression: LIFE-EVENT marks every emitted item suppressed_by_tag (held,
 * not dropped). A blank new value emits nothing: packs schedule off real
 * content, and a cleared field is not a signal (tombstoning is the field's
 * own lifecycle, not the engine's).
 */
export function evaluate(
  event: FieldChangeEvent,
  rules: TriggerRuleRow[],
  household: { statusTag: string; timezone?: string },
): PromptPackItemDraft[] {
  if (!event.newValue || !event.newValue.trim()) return [];
  const timezone = household.timezone ?? "America/New_York";
  const suppressed = household.statusTag === "LIFE-EVENT";
  const out: PromptPackItemDraft[] = [];
  for (const rule of rules) {
    if (!ruleMatches(rule, event)) continue;
    for (const item of rule.definition.items) {
      const raw = new Date(+new Date(event.changedAt) + item.offsetDays * 24 * 60 * 60 * 1000);
      out.push({
        householdId: event.householdId,
        triggerRuleId: rule.id,
        packName: rule.definition.packName,
        itemText: item.text,
        fireAt: clampOutOfQuietHours(raw, timezone),
        suppressedByTag: suppressed,
      });
    }
  }
  return out;
}

/**
 * Deterministic id for an emitted item: the same (rule, household, field
 * change, item) never double-inserts on redelivery — the queue's at-least-
 * once delivery meets an at-most-once row. SHA-256 folded to UUID shape.
 */
export async function deterministicItemId(
  event: FieldChangeEvent,
  ruleId: string,
  itemText: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${event.householdId}|${event.fieldId}|${event.changedAt}|${ruleId}|${itemText}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
