/**
 * standards.test.ts : Addendum A1 acceptance for the standards store schema.
 * The gate: every row of provisions_seed.json round-trips through the zod
 * schemas with zero failures, and the floor rule is machine-readable.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  provisionTierSchema, provisionKindSchema, provisionSeedRowSchema,
  standardProvisionSchema, seedRowToProvision, isOverridable, FLOOR_TIERS,
  provisionTierEnum, provisionKindEnum, standardProvision, provisionVersion,
  tierSchema, tierEnum, assertNoProvisionRows,
  STANDARDS_READ_ROLES, STANDARDS_WRITE_ROLES,
  bindProvisions, provisionTreatment, type StandardProvision,
} from "./index";

const seedPath = fileURLToPath(new URL("../../../tooling/seed/provisions_seed.json", import.meta.url));
const seed: unknown[] = JSON.parse(readFileSync(seedPath, "utf8"));

test("zod and pg enums agree on the provision vocabulary", () => {
  assert.deepEqual(provisionTierSchema.options, [...provisionTierEnum.enumValues]);
  assert.deepEqual(provisionKindSchema.options, [...provisionKindEnum.enumValues]);
  // membership_tier_gate reuses the membership tier vocabulary, unchanged
  assert.deepEqual(tierSchema.options, [...tierEnum.enumValues]);
});

test("every seed row round-trips through the zod schemas with zero failures", () => {
  assert.equal(seed.length, 1146); // the extraction's full count
  const failures: string[] = [];
  for (const raw of seed) {
    const parsed = provisionSeedRowSchema.safeParse(raw);
    if (!parsed.success) {
      failures.push(`${(raw as { provision_id?: string }).provision_id}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const stored = standardProvisionSchema.safeParse(seedRowToProvision(parsed.data));
    if (!stored.success) failures.push(`${parsed.data.provision_id}: ${stored.error.issues[0]?.message}`);
  }
  assert.deepEqual(failures, []);
});

test("seed ids are unique and structural (document.section.ordinal)", () => {
  const rows = seed.map((r) => provisionSeedRowSchema.parse(r));
  assert.equal(new Set(rows.map((r) => r.provision_id)).size, rows.length);
  // a renumbered id fails closed
  assert.equal(
    provisionSeedRowSchema.safeParse({ ...rows[0], provision_id: "STD-999.9.9" }).success,
    false,
  );
});

test("floors are never overridable; the other three tiers are", () => {
  for (const tier of FLOOR_TIERS) assert.equal(isOverridable(tier), false);
  for (const tier of ["process", "method", "preference"] as const) {
    assert.equal(isOverridable(tier), true);
  }
});

test("the pg tables carry the Addendum S3 columns", () => {
  for (const col of [
    "id", "document", "section", "ordinal", "text", "tier", "scope", "kind",
    // membershipTierGate DROPPED 2026-07-28 (W-11): always-null column that
    // looked like a feature; tier gating belongs on cascade items (W-3).
    "overridable", "version", "effectiveDate",
    "supersededBy", "sourceNote", "pilotDefault", "reviewDate", "tombstonedAt",
  ]) assert.ok(col in standardProvision, `standard_provision missing ${col}`);
  for (const col of ["provisionId", "version", "snapshot", "effectiveDate", "recordedAt"]) {
    assert.ok(col in provisionVersion, `provision_version missing ${col}`);
  }
  // the store is global: household scoping would be a modeling error
  assert.ok(!("householdId" in standardProvision));
});

test("client payloads never carry provision rows or references (brief T7)", () => {
  // clean client payloads pass, including id-shaped strings that are not provision ids
  assert.equal(assertNoProvisionRows({ fields: [{ id: "b2c9", name: "Staples list", value: "x" }] }), true);
  assert.equal(assertNoProvisionRows([{ note: "mentions STD-006.4.1 in prose" }]), true);
  // a provision row anywhere in the tree fails loudly
  assert.throws(
    () => assertNoProvisionRows({ deep: { provisions: [{ id: "STD-006.4.1", text: "..." }] } }),
    /SEVERE.*STD-006\.4\.1/,
  );
  assert.throws(
    () => assertNoProvisionRows({ fields: [{ id: "b2c9", governing_provisions: ["STD-002.2.1"] }] }),
    /SEVERE.*STD-002\.2\.1/,
  );
  assert.throws(
    () => assertNoProvisionRows({ steps: [{ text: "donate pile", methodRef: "STD-005.4.1" }] }),
    /SEVERE.*STD-005\.4\.1/,
  );
});

test("standards store roles: client can never read, only corporate_admin writes", () => {
  assert.ok(!STANDARDS_READ_ROLES.includes("client"));
  assert.ok(STANDARDS_READ_ROLES.includes("house_manager"));
  assert.deepEqual([...STANDARDS_WRITE_ROLES], ["corporate_admin"]);
});

test("bindProvisions: the briefing render model enforces view, gate, and floor ordering (T4)", () => {
  const P = (id: string, tier: StandardProvision["tier"], sourceNote: string | null = null): StandardProvision => ({
    id, document: id.slice(0, 7), section: 1, ordinal: 1, text: `text for ${id}`,
    tier, scope: ["universal"], kind: "rule",
    version: 1, effectiveDate: "2026-07-24", supersededBy: null, sourceNote,
    pilotDefault: false, reviewDate: null,
  });
  const byId = new Map([
    ["STD-006.3.2", P("STD-006.3.2", "method")],
    ["STD-002.2.1", P("STD-002.2.1", "floor_1", "USDA")],
    ["STD-014.4.3", P("STD-014.4.3", "floor_2")],
  ]);
  const ids = ["STD-006.3.2", "STD-002.2.1", "STD-014.4.3", "STD-999.9.9"];

  // client sees NOTHING, reviewed or not
  assert.deepEqual(bindProvisions(ids, byId, "client", true), []);
  // everything is dark until the founder review lands
  assert.deepEqual(bindProvisions(ids, byId, "hm", false), []);
  // hm: floors first in red-block, method quiet, dangling id skipped, no source notes
  const hm = bindProvisions(ids, byId, "hm", true);
  assert.deepEqual(hm.map((p) => [p.id, p.treatment]), [
    ["STD-002.2.1", "red-block"], ["STD-014.4.3", "red-block"], ["STD-006.3.2", "quiet"],
  ]);
  assert.ok(hm.every((p) => !("sourceNote" in p)));
  // corporate additionally carries the source note
  const corp = bindProvisions(ids, byId, "corporate", true);
  assert.equal(corp.find((p) => p.id === "STD-002.2.1")?.sourceNote, "USDA");
  // unbound fields bind to nothing
  assert.deepEqual(bindProvisions(null, byId, "hm", true), []);
  assert.deepEqual(bindProvisions([], byId, "corporate", true), []);
  // treatment mirrors the overridable rule exactly
  for (const tier of ["floor_1", "floor_2"] as const) assert.equal(provisionTreatment(tier), "red-block");
  for (const tier of ["process", "method", "preference"] as const) assert.equal(provisionTreatment(tier), "quiet");
});

test("schema drift in a re-emitted seed fails loudly", () => {
  const row = provisionSeedRowSchema.parse(seed[0]);
  assert.equal(provisionSeedRowSchema.safeParse({ ...row, surprise: 1 }).success, false);
  assert.equal(provisionSeedRowSchema.safeParse({ ...row, text: "  " }).success, false);
  assert.equal(provisionSeedRowSchema.safeParse({ ...row, tier: "floor_3" }).success, false);
  assert.equal(provisionSeedRowSchema.safeParse({ ...row, scope: [] }).success, false);
});

test("A2 payload guard: recall and outcome rows never reach a client payload", async () => {
  const { assertNoAnticipationRows } = await import("./standards");
  // Clean payloads pass, however nested.
  assert.ok(assertNoAnticipationRows([{ name: "Kitchen", value: "reset", nested: [{ ok: true }] }]));
  // A season_observation row fails loud wherever it hides.
  assert.throws(
    () => assertNoAnticipationRows({ deep: [{ anchorKind: "dot", summary: "Heard last July" }] }),
    /season_observation/,
  );
  assert.throws(
    () => assertNoAnticipationRows([{ anchor_kind: "visit", summary: "snake_case too" }]),
    /season_observation/,
  );
  // A prompt_outcome row fails loud too.
  assert.throws(
    () => assertNoAnticipationRows({ rows: [{ outcome: "acted", promptId: "p-1" }] }),
    /prompt_outcome/,
  );
  // W-5: a condition_flag row fails loud, both casings; a payload merely
  // MENTIONING a concern in prose does not (the pair is the signature).
  assert.throws(
    () => assertNoAnticipationRows({ rows: [{ concern: "cracking grout", raisedBy: "u-1" }] }),
    /condition_flag/,
  );
  assert.throws(
    () => assertNoAnticipationRows([{ concern: "cracking grout", raised_by: "u-1" }]),
    /condition_flag/,
  );
  assert.ok(assertNoAnticipationRows([{ note: "client mentioned a concern about scheduling" }]));
  // W-6: the deferral CONTENT is client-facing; the staff attribution is
  // not. The projected client shape passes; an unprojected row fails.
  assert.throws(
    () => assertNoAnticipationRows([{ noticed: "hairline crack", decidedBy: "u-1" }]),
    /unprojected deferral/,
  );
  assert.ok(assertNoAnticipationRows([{ noticed: "hairline crack", reason: "stable and cosmetic", revisitDate: "2026-10-01" }]));
  // AB: resolution attribution is staff data too; the client shape carries
  // resolution and resolvedAt, never resolvedBy.
  assert.throws(
    () => assertNoAnticipationRows([{ noticed: "hairline crack", resolvedBy: "u-1" }]),
    /unprojected deferral/,
  );
  assert.ok(assertNoAnticipationRows([{ noticed: "hairline crack", resolution: "done", resolvedAt: "2026-07-28" }]));
  // AD (W-7): a paused decision has NO client projection; any recognizable
  // row is the violation. Both signature pairs, and the word "decision"
  // alone stays innocent.
  assert.throws(
    () => assertNoAnticipationRows([{ decision: "filtration vendor", pausedBy: "u-1" }]),
    /paused_decision/,
  );
  assert.throws(
    () => assertNoAnticipationRows({ nested: { decision: "filtration vendor", research: "three quotes" } }),
    /paused_decision/,
  );
  assert.ok(assertNoAnticipationRows([{ decision: "a harmless unrelated key" }]));
  // WK-DEV-007 s3: shadow-log output never reaches a client, in any
  // casing; a payload merely carrying "confidence" in prose stays
  // innocent (the pair is the signature).
  assert.throws(
    () => assertNoAnticipationRows([{ triggerKey: "condition-decline", inputsHash: "abc" }]),
    /shadow_log/,
  );
  assert.throws(
    () => assertNoAnticipationRows({ deep: { proposed_class: "A0", confidence_pct: 50 } }),
    /shadow_log/,
  );
  assert.ok(assertNoAnticipationRows([{ confidence: "the client expressed confidence in the plan" }]));
  // RFC-PRIM-01: a work_item row never reaches a client, either casing;
  // an innocent "title" key in prose stays innocent (the pair signs it).
  assert.throws(
    () => assertNoAnticipationRows([{ title: "gutter vendor visit", dependsOn: [] }]),
    /work_item/,
  );
  assert.throws(
    () => assertNoAnticipationRows({ deep: { window_condition: null, blocked_reason: "quote" } }),
    /work_item/,
  );
  assert.ok(assertNoAnticipationRows([{ title: "a book the client mentioned" }]));
  // RFC-PRIM-01 build 2: an attention_record never reaches a client;
  // "audience" alone in prose stays innocent.
  assert.throws(
    () => assertNoAnticipationRows([{ audience: "hom", urgency: "now" }]),
    /attention_record/,
  );
  assert.throws(
    () => assertNoAnticipationRows({ deep: { audience: "corporate", source_kind: "deferral" } }),
    /attention_record/,
  );
  assert.ok(assertNoAnticipationRows([{ audience: "the dinner party guest list" }]));
  // RFC-PRIM-01 build 3: a decision_record never reaches a client.
  assert.throws(
    () => assertNoAnticipationRows([{ question: "vendor choice", recommendation: "the second quote" }]),
    /decision_record/,
  );
  assert.throws(
    () => assertNoAnticipationRows({ deep: { authority_class: "A3", audience: "founder" } }),
    /decision_record/,
  );
  assert.ok(assertNoAnticipationRows([{ question: "what time works for the walkthrough" }]));

  // WK-DEV-009 s8: a capture_artifact never reaches a client.
  assert.throws(
    () => assertNoAnticipationRows([{ content: "shelf pulling from wall", capturedBy: "u1" }]),
    /capture_artifact/,
  );
  assert.throws(
    () => assertNoAnticipationRows({ deep: { extraction_status: "none", disposition: "filed as work item" } }),
    /capture_artifact/,
  );
  // The innocent keys: a client note with content alone is not a row.
  assert.ok(assertNoAnticipationRows([{ content: "welcome note text" }]));
});
