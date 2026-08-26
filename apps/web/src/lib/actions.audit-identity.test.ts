import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { auditEvent, auditSubjectToken, anticipationExclusion, householdRoleAssignment, authUser } from "@wellkept/schema";

/**
 * AR's first fix (G-59, ADR-006): the two audit-write sites that stored an
 * identifying value directly now mint a token instead. Proven in both
 * directions per doctrine: the token row carries the value, the audit row
 * carries the token and NEVER the value, and non-personal exclusion scopes
 * keep their plaintext target (a topic tag is not a person; blanking it
 * would make the trail useless without protecting anyone).
 *
 * Module-mock pattern per session AP's finding (coupling cost zero).
 */
const inserts: { table: unknown; row: Record<string, unknown> }[] = [];
const selectResults: Record<string, unknown[]> = {};

vi.mock("./db", () => ({
  db: {
    insert: (table: unknown) => ({
      values: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { onConflictDoNothing: () => Promise.resolve() };
      },
    }),
    select: () => ({
      from: (t: unknown) => {
        const key = t === authUser ? "authUser"
          : t === householdRoleAssignment ? "roleAssignment"
          : t === anticipationExclusion ? "exclusion" : "other";
        const rows = selectResults[key] ?? [];
        const chain = { where: () => Promise.resolve(rows) };
        return chain;
      },
    }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    // The delete EMPTIES what a later select would find, so an action that
    // reads its subject after deleting the row gets nothing. That is what
    // makes G-69's ordering claim a test rather than a code comment.
    delete: () => ({ where: () => { selectResults.roleAssignment = []; selectResults.authUser = []; return Promise.resolve(); } }),
  },
}));
vi.mock("./session", () => ({
  getPrincipal: async () => ({ userId: "u-actor", role: "corporate_admin", householdId: "h-1" }),
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

const tokenRows = () => inserts.filter((i) => i.table === auditSubjectToken).map((i) => i.row);
const auditRows = () => inserts.filter((i) => i.table === auditEvent).map((i) => i.row);

/**
 * G-68: these actions now CONFIRM, which means they end in a redirect and
 * therefore throw. Asserting the throw is not a workaround; it is the
 * added coverage: a write that stopped confirming would fail here too.
 */
async function confirms(run: Promise<unknown>) {
  await assert.rejects(run, /NEXT_REDIRECT/, "the action must confirm its write with a redirect");
}

beforeEach(() => {
  inserts.length = 0;
  for (const k of Object.keys(selectResults)) delete selectResults[k];
});

test("G-59: role_assigned audits a token, never the email", async () => {
  selectResults.authUser = [{ id: "u-target", email: "target@example.com" }];
  selectResults.roleAssignment = [];
  const { assignRole } = await import("./actions");
  await confirms(assignRole(form({ householdId: "h-1", email: "target@example.com", role: "house_manager" })));

  const [tok] = tokenRows();
  assert.ok(tok, "a subject token row must be minted");
  assert.equal(tok!.kind, "email");
  assert.equal(tok!.value, "target@example.com", "the mapping row holds the value - that is where it lives now");

  const audit = auditRows().find((a) => a.kind === "role_assigned")!;
  const detail = audit.detail as Record<string, unknown>;
  assert.equal(detail.subjectToken, tok!.id, "the audit row carries the token");
  assert.ok(!JSON.stringify(detail).includes("target@example.com"),
    "the email must not appear anywhere in the audit detail - this is the G-59 leak");
});

test("G-59: a person-scoped exclusion audits a token, never the name", async () => {
  const { createAnticipationExclusion } = await import("./actions");
  await confirms(createAnticipationExclusion(form({
    householdId: "h-1", scope: "person", target: "Grandma Ruth", requestedBy: "client",
  })));

  const [tok] = tokenRows();
  assert.ok(tok, "a subject token row must be minted for a person-scoped exclusion");
  assert.equal(tok!.kind, "person_ref");
  assert.equal(tok!.value, "Grandma Ruth");

  const audit = auditRows().find((a) => a.kind === "exclusion_created")!;
  const detail = audit.detail as Record<string, unknown>;
  assert.equal(detail.subjectToken, tok!.id);
  assert.ok(!JSON.stringify(detail).includes("Grandma Ruth"),
    "the person's name must not appear in the audit detail");
});

test("G-59, the other direction: a topic-scoped exclusion keeps its plaintext target", async () => {
  const { createAnticipationExclusion } = await import("./actions");
  await confirms(createAnticipationExclusion(form({
    householdId: "h-1", scope: "topic", target: "medication", requestedBy: "client",
  })));

  assert.equal(tokenRows().length, 0, "a topic tag is not a person - no token, no blanking");
  const audit = auditRows().find((a) => a.kind === "exclusion_created")!;
  assert.equal((audit.detail as Record<string, unknown>).target, "medication",
    "non-personal targets stay readable in the trail");
});

test("G-59: exclusion_ended tokenizes a person-scoped row's target the same way", async () => {
  selectResults.exclusion = [{
    id: "x-1", householdId: "h-1", scope: "person", target: "Grandma Ruth", effectiveTo: null,
  }];
  const { endAnticipationExclusion } = await import("./actions");
  await confirms(endAnticipationExclusion(form({ exclusionId: "x-1" })));

  const [tok] = tokenRows();
  assert.ok(tok, "ending a person-scoped exclusion must mint its own token");
  assert.equal(tok!.value, "Grandma Ruth");
  const audit = auditRows().find((a) => a.kind === "exclusion_ended")!;
  assert.ok(!JSON.stringify(audit.detail).includes("Grandma Ruth"));
  assert.equal((audit.detail as Record<string, unknown>).subjectToken, tok!.id);
});

test("G-69: role_revoked carries the token, the role and the NDA standing, read before the delete", async () => {
  // The production row that produced this finding carried assignmentId
  // alone. Once the assignment is deleted that id dereferences to
  // nothing, so the trail could say an assignment ended and never say
  // whose, which role, or under what standing. The values must be read
  // BEFORE the delete, which is what this test is really pinning.
  selectResults.roleAssignment = [{
    id: "a-1", householdId: "h-1", userId: "u-target", role: "house_manager", ndaApproved: true,
  }];
  selectResults.authUser = [{ id: "u-target", email: "target@example.com" }];
  const { revokeRole } = await import("./actions");
  await confirms(revokeRole(form({ assignmentId: "a-1", householdId: "h-1" })));

  const [tok] = tokenRows();
  assert.ok(tok, "revoking must mint its own subject token, the assignRole pattern");
  assert.equal(tok!.kind, "email");
  assert.equal(tok!.value, "target@example.com", "the mapping row holds the value");

  const audit = auditRows().find((a) => a.kind === "role_revoked")!;
  const detail = audit.detail as Record<string, unknown>;
  assert.equal(detail.subjectToken, tok!.id, "the audit row carries the token");
  assert.equal(detail.role, "house_manager", "which role ended is the point of the row");
  assert.equal(detail.ndaApproved, true, "the standing the assignment carried, kept as it stood");
  assert.equal(detail.assignmentId, "a-1", "the existing key survives; production rows carry it");
  assert.ok(!JSON.stringify(detail).includes("target@example.com"),
    "ADR-006 holds on the revoke side too: the address never enters the audit detail");
});

test("G-69, the other direction: a subject whose user row is already gone records that fact", async () => {
  // Not a blank to fill in later. A null token is the honest statement
  // that there was no address to tokenize at revocation time.
  selectResults.roleAssignment = [{
    id: "a-2", householdId: "h-1", userId: "u-vanished", role: "client", ndaApproved: false,
  }];
  selectResults.authUser = [];
  const { revokeRole } = await import("./actions");
  await confirms(revokeRole(form({ assignmentId: "a-2", householdId: "h-1" })));

  assert.equal(tokenRows().length, 0, "no address, no token, and no invented one");
  const detail = auditRows().find((a) => a.kind === "role_revoked")!.detail as Record<string, unknown>;
  assert.equal(detail.subjectToken, null);
  assert.equal(detail.role, "client", "the role is still known from the assignment row itself");
});
