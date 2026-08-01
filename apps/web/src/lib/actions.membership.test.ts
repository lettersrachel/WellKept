import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { household, membershipEvent, auditEvent } from "@wellkept/schema";

/**
 * AQ (1 August 2026): household.tier is a denormalised cache read directly
 * by the fleet board and elsewhere, but until this session nothing kept it
 * in sync with membership_event - a tier_change wrote history and left the
 * column stale. This is the first test on `recordMembershipEvent`, so it
 * also covers the invariant AQ found already correct: the membership_event
 * row and its audit_event row are written in one transaction.
 *
 * Following the AP finding (coupling cost is zero, module mocks suffice):
 * every direct import of `actions.ts` is mocked below; `@wellkept/schema`
 * and `@wellkept/permissions` stay real, since they're pure.
 */
const calls: { op: string; table: unknown; row: Record<string, unknown> }[] = [];

vi.mock("./db", () => ({
  db: {
    transaction: async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: (table: unknown) => ({
          values: (row: Record<string, unknown>) => { calls.push({ op: "insert", table, row }); return Promise.resolve(); },
        }),
        update: (table: unknown) => ({
          set: (row: Record<string, unknown>) => ({
            where: () => { calls.push({ op: "update", table, row }); return Promise.resolve(); },
          }),
        }),
      };
      return cb(tx);
    },
  },
}));
vi.mock("./session", () => ({
  getPrincipal: async () => ({ userId: "u-1", role: "corporate_admin", householdId: "h-1" }),
}));
vi.mock("./field-events", () => ({ emitFieldChange: async () => {}, outboxFieldEvent: async () => {} }));
vi.mock("./vault", () => ({ vaultWrite: async () => {} }));
vi.mock("./client-allowlist", () => ({ isClientEditable: () => false }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { const e = new Error("NEXT_REDIRECT"); (e as unknown as { url: string }).url = url; throw e; },
}));

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => { calls.length = 0; });

test("AQ: tier_change writes household.tier, membership_event and audit_event in one transaction", async () => {
  const { recordMembershipEvent } = await import("./actions");
  await assert.rejects(() => recordMembershipEvent(form({
    householdId: "h-1", kind: "tier_change", effectiveOn: "2026-08-01", tier: "concierge",
  })), /NEXT_REDIRECT/);

  const tables = calls.map((c) => ({
    op: c.op,
    table: c.table === household ? "household" : c.table === membershipEvent ? "membership_event"
      : c.table === auditEvent ? "audit_event" : "unknown",
  }));
  assert.deepEqual(tables, [
    { op: "insert", table: "membership_event" },
    { op: "update", table: "household" },
    { op: "insert", table: "audit_event" },
  ], "membership_event must land before household.tier, and both before the audit row");

  const tierUpdate = calls.find((c) => c.table === household)!;
  assert.equal(tierUpdate.row.tier, "concierge", "household.tier must be updated to the new tier");
});

test("AQ: start also syncs household.tier (the creation-time gap load-seed.ts leaves open)", async () => {
  const { recordMembershipEvent } = await import("./actions");
  await assert.rejects(() => recordMembershipEvent(form({
    householdId: "h-1", kind: "start", effectiveOn: "2026-08-01", tier: "essential",
  })), /NEXT_REDIRECT/);
  const tierUpdate = calls.find((c) => c.table === household);
  assert.ok(tierUpdate, "a start event must sync household.tier too");
  assert.equal(tierUpdate!.row.tier, "essential");
});

test("AQ: pause/resume/cancel carry no tier and must NOT touch household.tier", async () => {
  const { recordMembershipEvent } = await import("./actions");
  await assert.rejects(() => recordMembershipEvent(form({
    householdId: "h-1", kind: "cancel", effectiveOn: "2026-08-01",
    reason: "moving out of area", initiatedBy: "client",
  })), /NEXT_REDIRECT/);
  assert.ok(!calls.some((c) => c.table === household),
    "a cancel carries no tier - updating household.tier here would write an undefined/garbage value");
});
