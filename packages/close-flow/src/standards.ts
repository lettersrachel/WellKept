/**
 * Floor enforcement (WK-APP-003 Addendum A1 S5; CLAUDE_CODE_BRIEF T5).
 * Floors are enforced, not displayed: recording a floor-tier provision as
 * adapted-per-Playbook is refused, and the attempt becomes a structured
 * floor_conflict event routed to corporate — implementing WK-STD-000 S9's
 * escalation rather than leaving it to memory.
 *
 * Pure and dependency-free like the rest of this package (the close flow
 * runs client-side to work offline): the caller supplies the provision
 * tiers — bundled with the briefing per the airplane test — and a sink that
 * delivers the event (the offline queue on the client, BullMQ server-side;
 * see @wellkept/worker enqueueFloorConflict). The tier vocabulary mirrors
 * @wellkept/schema's; the schema test suite keeps them from drifting.
 */
import { CloseFlowError } from "./errors.ts";

export type ProvisionTier = "floor_1" | "floor_2" | "process" | "method" | "preference";
export const FLOOR_TIERS: readonly ProvisionTier[] = ["floor_1", "floor_2"];

export class FloorNotOverridable extends CloseFlowError {
  constructor(provisionId: string) {
    super(`${provisionId} is a floor and cannot be recorded as adapted-per-Playbook`);
    this.name = "FloorNotOverridable";
  }
}

/** The structured event the corporate signal inbox receives (Addendum A1 S5). */
export interface FloorConflictEvent {
  type: "floor_conflict";
  household: string;
  provision_id: string;
  hm_assignment: string;
  occurred_at: string; // ISO
}

export interface AdaptationRecord {
  fieldId: string;
  provisionId: string;
  recordedAt: string; // ISO
}

export function createAdaptationRecorder({
  householdId,
  hmAssignment,
  provisionTiers,
  onFloorConflict,
}: {
  householdId: string;
  hmAssignment: string;
  /** provision id -> tier, from the briefing bundle (never fetched live). */
  provisionTiers: ReadonlyMap<string, ProvisionTier>;
  onFloorConflict: (event: FloorConflictEvent) => void;
}): { recordAdaptation(fieldId: string, provisionId: string): AdaptationRecord } {
  if (!householdId.trim() || !hmAssignment.trim()) {
    throw new CloseFlowError("household and hm assignment are required");
  }
  return {
    recordAdaptation(fieldId, provisionId) {
      const tier = provisionTiers.get(provisionId);
      // The governing_provisions FK check lives in app code (provisions
      // tombstone, so the DB can't hold it): an unknown id fails loudly.
      if (!tier) throw new CloseFlowError(`unknown provision ${provisionId}`);
      if (FLOOR_TIERS.includes(tier)) {
        onFloorConflict({
          type: "floor_conflict",
          household: householdId,
          provision_id: provisionId,
          hm_assignment: hmAssignment,
          occurred_at: new Date().toISOString(),
        });
        throw new FloorNotOverridable(provisionId);
      }
      return { fieldId, provisionId, recordedAt: new Date().toISOString() };
    },
  };
}
