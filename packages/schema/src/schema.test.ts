/**
 * schema.test.ts : vocabulary-alignment sanity suite.
 * The zod enums (app boundary), pg enums (database), and the permission
 * core's role/sensitivity lists must never drift apart (WK-DEV-005 glossary).
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  sensitivitySchema, roleSchema, tierSchema, statusTagSchema,
  provenanceSchema, fieldFlagSchema, NA_CONFIRMED,
  sensitivityEnum, provenanceEnum, fieldFlagEnum, tierEnum, statusTagEnum,
  household, playbookField, vaultItem, auditEvent, visit,
} from "./index";
import { ROLES, SENSITIVITIES } from "@wellkept/permissions";

test("zod and pg enums agree on every shared vocabulary", () => {
  assert.deepEqual(sensitivitySchema.options, [...sensitivityEnum.enumValues]);
  assert.deepEqual(provenanceSchema.options, [...provenanceEnum.enumValues]);
  assert.deepEqual(fieldFlagSchema.options, [...fieldFlagEnum.enumValues]);
  assert.deepEqual(tierSchema.options, [...tierEnum.enumValues]);
  assert.deepEqual(statusTagSchema.options, [...statusTagEnum.enumValues]);
});

test("permissions core vocabulary matches the schema enums", () => {
  assert.deepEqual([...ROLES], roleSchema.options);
  assert.deepEqual([...SENSITIVITIES], sensitivitySchema.options);
});

test("sensitivity parse fails closed on unknown markers", () => {
  assert.equal(sensitivitySchema.safeParse("s2").success, true);
  assert.equal(sensitivitySchema.safeParse("S2").success, false); // case is not forgiven
  assert.equal(sensitivitySchema.safeParse("s4").success, false);
  assert.equal(sensitivitySchema.safeParse("").success, false);
});

test("N/A-confirmed is a VALUE, not an empty field (WK-DEV-005 S2)", () => {
  assert.equal(NA_CONFIRMED, "N/A-confirmed");
  assert.notEqual(NA_CONFIRMED, "");
});

test("core tables exist and carry the invariant columns", () => {
  for (const t of [household, playbookField, vaultItem, auditEvent, visit]) {
    assert.ok("id" in t && "createdAt" in t && "updatedAt" in t);
  }
  // household-scoped tables carry householdId (WK-DEV-004 S2)
  for (const t of [playbookField, vaultItem, auditEvent, visit]) {
    assert.ok("householdId" in t);
  }
  // s3 values never live on playbook_field; the vault holds ciphertext only
  assert.ok("ciphertext" in vaultItem && "keyRef" in vaultItem);
  assert.ok(!("ciphertext" in playbookField));
});
