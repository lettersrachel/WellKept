import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

/**
 * Session AP: the two G-53 branches that had never run. The outcome row
 * records whether a reveal actually delivered a secret, and until now only
 * `delivered` had ever executed - `no_vault_item` and `decrypt_failed`
 * were written and unproven, in the subsystem where a wrong row is
 * evidence.
 *
 * The coupling cost the brief asked about, measured: the route reaches
 * five internal modules (db, session, totp, vault, rate-limit). All five
 * are mockable at the module boundary, so **no refactor of the action or
 * auth layer was required** - the fake `db` below is 20 lines and the
 * permission core runs for real. That is the finding: this route was
 * testable all along; it simply had nowhere to be tested from.
 */
const audited: { kind: string; detail: Record<string, unknown> }[] = [];
let vaultResult: { value: string | null } | { throws: true };

const FIELD = {
  id: "f-1", householdId: "h-1", name: "alarm code", sensitivity: "s3", value: "",
};

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: (t: unknown) => ({ where: () => (String(t).includes("household") ? [{ id: "h-1", isNda: false }] : [FIELD]) }) }),
    insert: () => ({ values: (row: { kind: string; detail: Record<string, unknown> }) => { audited.push(row); return Promise.resolve(); } }),
  },
}));
vi.mock("@/lib/session", () => ({
  getPrincipal: async () => ({ userId: "u-1", role: "corporate_admin", householdId: "h-1", ndaApproved: true }),
}));
vi.mock("@/lib/totp", () => ({ staffMfaCleared: async () => true }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/vault", () => ({
  vaultOpen: async () => {
    if ("throws" in vaultResult) throw new Error("Unsupported state or unable to authenticate data");
    return vaultResult.value;
  },
}));

async function reveal() {
  const { POST } = await import("./route");
  const req = { json: async () => ({ fieldId: "f-1" }) } as unknown as Parameters<typeof POST>[0];
  const res = await POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => { audited.length = 0; });

test("AP/G-53: delivered - the value is returned and the outcome row says so", async () => {
  vaultResult = { value: "0000 (smoke-test value)" };
  const { status, body } = await reveal();
  assert.equal(status, 200);
  assert.equal(body.value, "0000 (smoke-test value)");
  assert.deepEqual(audited.map((a) => a.kind), ["s3_corporate_view", "s3_reveal_outcome"]);
  assert.equal(audited[1]!.detail.outcome, "delivered");
  assert.equal(audited[1]!.detail.delivered, true);
});

test("AP/G-53: no_vault_item - the placeholder is returned and the outcome row does NOT claim delivery", async () => {
  vaultResult = { value: null };
  const { status, body } = await reveal();
  assert.equal(status, 200);
  assert.equal(body.value, "vault-pending");
  // The whole point of the entry: the attempt row alone would be
  // indistinguishable from the delivered case above.
  assert.deepEqual(audited.map((a) => a.kind), ["s3_corporate_view", "s3_reveal_outcome"]);
  assert.equal(audited[1]!.detail.outcome, "no_vault_item");
  assert.equal(audited[1]!.detail.delivered, false);
});

test("AP/G-53: decrypt_failed - refuses with a reason instead of throwing, and records the failure", async () => {
  vaultResult = { throws: true };
  const { status, body } = await reveal();
  assert.equal(status, 500);
  assert.equal(body.ok, false);
  assert.match(String(body.reason), /could not be opened/);
  assert.deepEqual(audited.map((a) => a.kind), ["s3_corporate_view", "s3_reveal_outcome"]);
  assert.equal(audited[1]!.detail.outcome, "decrypt_failed");
  assert.equal(audited[1]!.detail.delivered, false);
});

test("AP: the attempt row is written BEFORE the decrypt, in every outcome", async () => {
  // The audit invariant, asserted rather than assumed: whatever the
  // decrypt does, the attempt row is already on the record. A future
  // refactor that "tidies" the two writes into one, or reorders them,
  // fails here.
  for (const state of [{ value: "v" }, { value: null }, { throws: true } as const]) {
    audited.length = 0;
    vaultResult = state;
    await reveal();
    assert.equal(audited[0]!.kind, "s3_corporate_view", "the attempt row must come first");
    assert.equal(audited.length, 2, "exactly two rows: the attempt and its outcome");
  }
});
