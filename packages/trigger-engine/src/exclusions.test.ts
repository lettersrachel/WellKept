import { test } from "vitest";
import assert from "node:assert/strict";
import {
  exclusionActive, draftExcluded, filterExcludedDrafts, failClosedDrafts,
  type ExclusionLike,
} from "./exclusions.ts";
import { deriveSeasonObservations, selectRecall, recallExcluded, sanitizeSummary, seasonObservationId } from "./season.ts";
import type { PromptPackItemDraft } from "./engine.ts";

const NOW = new Date("2026-07-25T12:00:00Z");

const DRAFT = (over: Partial<PromptPackItemDraft> = {}): PromptPackItemDraft => ({
  householdId: "hh-1",
  triggerRuleId: "rule-1",
  packKey: "meds-day",
  packName: "meds-day",
  itemText: "Confirm the refill pickup is scheduled.",
  fireAt: NOW,
  suppressedByTag: false,
  methodRef: null,
  ...over,
});

const EXCL = (over: Partial<ExclusionLike> = {}): ExclusionLike => ({
  scope: "rule",
  target: "rule-1",
  effectiveFrom: new Date("2026-01-01T00:00:00Z"),
  effectiveTo: null,
  ...over,
});

test("REQ-056: an active rule-scoped exclusion suppresses that rule's drafts", () => {
  const { kept, suppressed } = filterExcludedDrafts([DRAFT(), DRAFT({ triggerRuleId: "rule-2" })], [EXCL()], { now: NOW });
  assert.equal(suppressed, 1);
  assert.equal(kept.length, 1);
  assert.equal(kept[0]!.triggerRuleId, "rule-2");
});

test("REQ-056: scope=all suppresses everything; topic/person match item text case-insensitively", () => {
  assert.equal(filterExcludedDrafts([DRAFT()], [EXCL({ scope: "all", target: "" })], { now: NOW }).kept.length, 0);
  assert.ok(draftExcluded(DRAFT(), EXCL({ scope: "topic", target: "REFILL" })));
  assert.ok(draftExcluded(DRAFT({ itemText: "Ask how Margaret's recovery is going." }), EXCL({ scope: "person", target: "margaret" })));
  assert.ok(!draftExcluded(DRAFT(), EXCL({ scope: "person", target: "margaret" })));
});

test("REQ-056: the effective window is enforced; an ended exclusion excludes nothing", () => {
  assert.ok(!exclusionActive(EXCL({ effectiveFrom: new Date("2027-01-01T00:00:00Z") }), NOW));
  assert.ok(!exclusionActive(EXCL({ effectiveTo: new Date("2026-06-01T00:00:00Z") }), NOW));
  const ended = EXCL({ effectiveTo: new Date("2026-06-01T00:00:00Z") });
  assert.equal(filterExcludedDrafts([DRAFT()], [ended], { now: NOW }).kept.length, 1);
});

test("REQ-056 GUARDRAIL: exclusions never suppress a floor (A2 finding 7)", () => {
  // Even a scope=all exclusion cannot silence a draft whose method ref
  // resolves to a floor-tier provision.
  const floorDraft = DRAFT({ methodRef: "STD-022.3.3" });
  const { kept, suppressed } = filterExcludedDrafts(
    [floorDraft, DRAFT({ triggerRuleId: "rule-2" })],
    [EXCL({ scope: "all", target: "" })],
    { now: NOW, isFloorRef: (ref) => ref === "STD-022.3.3" },
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0]!.methodRef, "STD-022.3.3");
  assert.equal(suppressed, 1);
});

test("REQ-056 GUARDRAIL: the fail-closed path suppresses every non-floor draft and keeps floors", () => {
  const drafts = [DRAFT(), DRAFT({ triggerRuleId: "rule-2", methodRef: "STD-022.3.3" })];
  const { kept, suppressed } = failClosedDrafts(drafts, (ref) => ref === "STD-022.3.3");
  assert.equal(kept.length, 1);
  assert.equal(kept[0]!.methodRef, "STD-022.3.3");
  assert.equal(suppressed, 1);
});

test("REQ-056: an unknown scope excludes nothing (malformed config must not silence the engine)", () => {
  assert.ok(!draftExcluded(DRAFT(), EXCL({ scope: "vibes", target: "anything" })));
});

// ---------------------------------------------------------------------------
// M (round six): the display-name/key split, proven at the fixture level
// BEFORE the first household exists, per the close-out brief. "Preserve
// which exclusions currently fire" is these assertions.
// ---------------------------------------------------------------------------

test("M: topic matching keys on packKey; a display-only rename never changes which exclusions fire", () => {
  const topicOnPack = EXCL({ scope: "topic", target: "meds" });
  // Keys were minted equal to the names at the split: the match holds.
  assert.ok(draftExcluded(DRAFT(), topicOnPack));
  // The property M exists for: copy work touches packName freely and the
  // household's instruction still fires, because matching never sees it.
  assert.ok(draftExcluded(DRAFT({ packName: "Medication day" }), topicOnPack));
  // And a key change IS a matching change, which is why keys are stable.
  assert.ok(!draftExcluded(DRAFT({ packKey: "renamed-pack" }), topicOnPack));
});

test("M/S: the post-rewrite sweep templates still reach exclusion matching (mechanism check)", async () => {
  // The item-6 voice pass and J1 rewrote template strings; this pins the
  // MECHANISM against the real current templates rather than synthetic
  // text: a sweep draft rendered today matches topic targets by its real
  // itemText and its real packKey.
  const { sweepRegistryDates } = await import("./registry-sweep.ts");
  const drafts = sweepRegistryDates(
    [{ id: "e-1", householdId: "hh-1", kind: "dates", label: "Mia's birthday", keyDate: new Date("2026-08-02T13:00:00Z"), cadence: null }],
    { now: new Date("2026-07-25T12:00:00Z"), statusTag: "ACTIVE" },
  );
  assert.ok(drafts.length > 0, "the dates family renders no drafts; the mechanism test has no input");
  const byText = filterExcludedDrafts(drafts, [EXCL({ scope: "topic", target: "birthday" })], { now: NOW });
  assert.equal(byText.kept.length, 0, "a topic target inside the rendered text no longer matches");
  const byKey = filterExcludedDrafts(drafts, [EXCL({ scope: "topic", target: "dates-radar" })], { now: NOW });
  assert.equal(byKey.kept.length, 0, "a topic target naming the stable pack key no longer matches");
});

// ---------------------------------------------------------------------------
// REQ-054: repeat-season memory.
// ---------------------------------------------------------------------------

test("REQ-054: derivation keys observations to the anchor's month and sanitizes summaries (DEV-005)", () => {
  const [obs] = deriveSeasonObservations([
    { kind: "dot", id: "d-1", householdId: "hh-1", occurredAt: new Date("2025-07-10T15:00:00Z"), text: "The garden party — always the second week of July" },
  ]);
  assert.ok(obs);
  assert.equal(obs!.seasonMonth, 7);
  assert.equal(obs!.confidence, "observed");
  assert.ok(!obs!.summary.includes("—"), "generated summaries carry no em dashes");
  assert.ok(obs!.summary.includes("garden party"));
});

test("REQ-054: recall selects same-month rows at least 300 days old; superseded rows never surface", () => {
  const rows = [
    { seasonMonth: 7, observedAt: new Date("2025-07-10T00:00:00Z"), summary: "last July" },
    { seasonMonth: 7, observedAt: new Date("2026-07-01T00:00:00Z"), summary: "this month, too fresh" },
    { seasonMonth: 1, observedAt: new Date("2025-01-05T00:00:00Z"), summary: "wrong season" },
    { seasonMonth: 7, observedAt: new Date("2025-07-04T00:00:00Z"), summary: "superseded", supersededBy: "x" },
  ];
  const recall = selectRecall(rows, NOW);
  assert.equal(recall.length, 1);
  assert.equal(recall[0]!.summary, "last July");
});

test("REQ-054 GUARDRAIL: recall filters through the exclusion list before rendering", () => {
  assert.ok(recallExcluded("Heard around this time last year: \"Margaret's birthday\"", [{ scope: "person", target: "Margaret" }]));
  assert.ok(recallExcluded("anything", [{ scope: "all", target: "" }]));
  assert.ok(!recallExcluded("Visit report noted: hedges trimmed", [{ scope: "person", target: "Margaret" }]));
  // rule/field scopes name scheduler concepts recall does not have — no match.
  assert.ok(!recallExcluded("anything", [{ scope: "rule", target: "rule-1" }]));
});

test("REQ-054: observation ids are deterministic on the anchor (idempotent daily materialization)", async () => {
  const a = await seasonObservationId("dot", "d-1");
  const b = await seasonObservationId("dot", "d-1");
  const c = await seasonObservationId("dot", "d-2");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("sanitizeSummary flattens whitespace and em dashes", () => {
  assert.equal(sanitizeSummary("a  —  b\n c"), "a , b c");
});
