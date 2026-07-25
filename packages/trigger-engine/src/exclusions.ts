/**
 * REQ-056 (Addendum A2 Part 3): the anticipation exclusion list, applied to
 * prompt drafts BEFORE anything is written to the queue. Pure functions —
 * the runner in run.ts does the I/O and the fail-closed handling.
 *
 * The contract, exactly as the addendum states it:
 *  - Enforcement is server-side, inside the scheduler, never the interface.
 *  - Fail closed: if the exclusion check errors, suppress the prompt.
 *  - EXCLUSIONS NEVER SUPPRESS A FLOOR. A draft whose method ref resolves to
 *    a floor-tier provision bypasses the check entirely (and bypasses the
 *    fail-closed suppression too — a broken exclusion read must not silence
 *    a safety floor). Asserted in exclusions.test.ts.
 */
import type { PromptPackItemDraft } from "./engine.ts";

export interface ExclusionLike {
  scope: string; // rule | topic | person | field | all
  target: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export function exclusionActive(x: ExclusionLike, now: Date): boolean {
  if (x.effectiveFrom.getTime() > now.getTime()) return false;
  if (x.effectiveTo && x.effectiveTo.getTime() <= now.getTime()) return false;
  return true;
}

export interface DraftContext {
  /** The field name behind an event-driven draft (sweep drafts have none). */
  fieldName?: string;
}

/** Case-insensitive containment — topic/person/field targets are plain text. */
const contains = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase());

export function draftExcluded(
  draft: Pick<PromptPackItemDraft, "triggerRuleId" | "packName" | "itemText">,
  exclusion: ExclusionLike,
  ctx: DraftContext = {},
): boolean {
  const target = exclusion.target.trim();
  if (!target && exclusion.scope !== "all") return false; // an empty target excludes nothing
  switch (exclusion.scope) {
    case "all":
      return true;
    case "rule":
      return draft.triggerRuleId === target;
    case "field":
      return ctx.fieldName ? contains(ctx.fieldName, target) : contains(draft.itemText, target);
    case "topic":
      return contains(draft.itemText, target) || contains(draft.packName, target);
    case "person":
      return contains(draft.itemText, target);
    default:
      // Unknown scope fails CLOSED for the draft it names nothing about?
      // No — an unrecognized scope row is malformed configuration; treating
      // it as matching everything would let a typo silence the engine. It
      // excludes nothing and is corporate's to fix (visible in the admin UI).
      return false;
  }
}

export interface FilterOptions {
  now?: Date;
  ctx?: DraftContext;
  /** True when the draft's methodRef is a floor-tier provision. */
  isFloorRef?: (methodRef: string) => boolean;
}

/**
 * Drop every draft an active exclusion names; floors always pass. Returns
 * the surviving drafts plus how many were suppressed (the runner logs it —
 * suppression is corporate-visible, never silent).
 */
export function filterExcludedDrafts<T extends PromptPackItemDraft>(
  drafts: T[],
  exclusions: ExclusionLike[],
  opts: FilterOptions = {},
): { kept: T[]; suppressed: number } {
  const now = opts.now ?? new Date();
  const active = exclusions.filter((x) => exclusionActive(x, now));
  if (active.length === 0) return { kept: drafts, suppressed: 0 };
  const kept: T[] = [];
  let suppressed = 0;
  for (const draft of drafts) {
    if (draft.methodRef && opts.isFloorRef?.(draft.methodRef)) {
      kept.push(draft); // floors bypass the exclusion check entirely
      continue;
    }
    if (active.some((x) => draftExcluded(draft, x, opts.ctx))) suppressed += 1;
    else kept.push(draft);
  }
  return { kept, suppressed };
}

/**
 * The fail-closed disposition: when the exclusion read itself errors, only
 * floor-carrying drafts survive; everything else is suppressed.
 */
export function failClosedDrafts<T extends PromptPackItemDraft>(
  drafts: T[],
  isFloorRef?: (methodRef: string) => boolean,
): { kept: T[]; suppressed: number } {
  const kept = drafts.filter((d) => Boolean(d.methodRef && isFloorRef?.(d.methodRef)));
  return { kept, suppressed: drafts.length - kept.length };
}
