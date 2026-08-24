/**
 * Pure validation for the offline-captured visit-page commands (input
 * spine build 1). Each validator mirrors its server action's rules
 * EXACTLY - same trims, same length floors, same em-dash refusal, same
 * structural sentences (a flag without a revisit trigger is worse than
 * no flag, STD-016) - so a capture is held to one standard regardless of
 * transport. An invalid command is never dropped: the store records it
 * as a conflict with the reason, and the operator sees it where
 * conflicts already surface.
 */
const EM_DASH = "\u2014";
const UUID_RE = /^[0-9a-f-]{36}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type Validated<T> = { ok: true; clean: T } | { ok: false; reason: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const optStr = (v: unknown, max: number) => str(v, max) || null;
const optUuid = (v: unknown) => (typeof v === "string" && UUID_RE.test(v) ? v : null);

export interface FlagCreateClean {
  id: string | null;
  subject: string; location: string; concern: string;
  revisitDate: string | null; revisitCondition: string | null;
  registryEntryId: string | null;
}
export function validateFlagCreate(p: Record<string, unknown>): Validated<FlagCreateClean> {
  const subject = str(p.subject, 120);
  const location = str(p.location, 120);
  const concern = str(p.concern, 500);
  const revisitCondition = optStr(p.revisitCondition, 200);
  const revisitDate = typeof p.revisitDate === "string" && DATE_RE.test(p.revisitDate.trim()) ? p.revisitDate.trim() : null;
  if (subject.length < 2 || location.length < 2 || concern.length < 4) return { ok: false, reason: "bad_input:text" };
  if ([subject, location, concern, revisitCondition ?? ""].some((s) => s.includes(EM_DASH))) return { ok: false, reason: "bad_input:em_dash" };
  if (!revisitDate && !revisitCondition) return { ok: false, reason: "bad_input:no_revisit_trigger" };
  const registryRaw = typeof p.registryEntryId === "string" ? p.registryEntryId.trim() : "";
  if (registryRaw && !UUID_RE.test(registryRaw)) return { ok: false, reason: "bad_input:registry_entry_id" };
  return { ok: true, clean: { id: optUuid(p.id), subject, location, concern, revisitDate, revisitCondition, registryEntryId: registryRaw || null } };
}

export interface FlagLookClean { flagId: string; value: number; note: string | null }
export function validateFlagLook(p: Record<string, unknown>): Validated<FlagLookClean> {
  const flagId = optUuid(p.flagId);
  if (!flagId) return { ok: false, reason: "bad_input:flag_id" };
  const raw = typeof p.value === "number" ? String(p.value) : str(p.value, 3);
  const value = /^\d$/.test(raw) ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(value) || value < 1 || value > 5) return { ok: false, reason: "bad_input:value" };
  return { ok: true, clean: { flagId, value, note: optStr(p.note, 300) } };
}

export interface FlagCloseClean { flagId: string; closeReason: string }
export function validateFlagClose(p: Record<string, unknown>): Validated<FlagCloseClean> {
  const flagId = optUuid(p.flagId);
  if (!flagId) return { ok: false, reason: "bad_input:flag_id" };
  const closeReason = str(p.closeReason, 300);
  if (closeReason.length < 4) return { ok: false, reason: "bad_input:close_reason" };
  if (closeReason.includes(EM_DASH)) return { ok: false, reason: "bad_input:em_dash" };
  return { ok: true, clean: { flagId, closeReason } };
}

export const RESOLUTIONS = ["done", "no_longer_needed", "superseded"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
export interface ResolveClean { targetId: string; resolution: Resolution }
function validateResolve(p: Record<string, unknown>, idKey: string, reasonKey: string): Validated<ResolveClean> {
  const targetId = optUuid(p[idKey]);
  if (!targetId) return { ok: false, reason: `bad_input:${reasonKey}_id` };
  const resolution = typeof p.resolution === "string" ? p.resolution : "";
  if (!(RESOLUTIONS as readonly string[]).includes(resolution)) return { ok: false, reason: "bad_input:resolution" };
  return { ok: true, clean: { targetId, resolution: resolution as Resolution } };
}
export const validateDeferralResolve = (p: Record<string, unknown>) => validateResolve(p, "deferralId", "deferral");
export const validatePausedDecisionResolve = (p: Record<string, unknown>) => validateResolve(p, "pausedDecisionId", "paused_decision");

export const OUTCOMES = ["acted", "dismissed", "not_applicable", "already_done"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export interface PromptOutcomeClean {
  promptId: string; outcome: Outcome; note: string | null;
  wasNews: boolean | null; dismissReason: "wrong" | "bad_timing" | null;
}
export function validatePromptOutcome(p: Record<string, unknown>): Validated<PromptOutcomeClean> {
  const promptId = optUuid(p.promptId);
  if (!promptId) return { ok: false, reason: "bad_input:prompt_id" };
  const outcome = typeof p.outcome === "string" ? p.outcome : "";
  if (!(OUTCOMES as readonly string[]).includes(outcome)) return { ok: false, reason: "bad_input:outcome" };
  // Session A: was_news only means something on acted; dismiss_reason only
  // on dismissed. Any other combination drops to null, never coerced.
  const wasNewsRaw = typeof p.wasNews === "boolean" ? String(p.wasNews) : typeof p.wasNews === "string" ? p.wasNews : "";
  const wasNews = outcome === "acted" && (wasNewsRaw === "true" || wasNewsRaw === "false") ? wasNewsRaw === "true" : null;
  const dismissRaw = typeof p.dismissReason === "string" ? p.dismissReason : "";
  const dismissReason = outcome === "dismissed" && ["wrong", "bad_timing"].includes(dismissRaw)
    ? (dismissRaw as "wrong" | "bad_timing") : null;
  return { ok: true, clean: { promptId, outcome: outcome as Outcome, note: optStr(p.note, 500), wasNews, dismissReason } };
}
