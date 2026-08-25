/**
 * grant-corporate.ts : the audited corporate grant (pnpm db:grant).
 *
 * Exists for the check-15 orphan case, authorized by register A581 item 1
 * (Field Test Home: grant-and-inspect, founder-confirmed 25 Aug 2026):
 * REQ-001 has no fleet-wide wildcard, so a household with NO corporate
 * assignment is invisible to every corporate operator, and the app's own
 * assignRole cannot reach it because the drill-in it lives on cannot be
 * opened. This script is the same act assignRole performs, from outside,
 * with the same audit shape (the G-64 / db:hg admin-grant pattern:
 * assignment + minted ADR-006 subject token + role_assigned audit row).
 * A silent SQL grant is exactly what it exists to replace.
 *
 * Usage:
 *   pnpm db:grant --household <uuid> --email <grantee email> \
 *     --by <corporate admin email> --reason "<why, citing the register>"
 *     [--role corporate_admin|corporate_ops|cfo_readonly]
 *
 * Rules:
 *  - corporate roles only; field roles are assigned in the app, on a
 *    reachable drill-in, where the context lives.
 *  - --by must exist and hold corporate_admin somewhere (the app
 *    path's posture: assigning a role is a corporate act).
 *  - the grantee must already exist; this script never creates people.
 *  - --reason is required and lands in the audit detail, so the grant
 *    explains itself to a later reader (the escape-hatch rule).
 *  - ndaApproved is FALSE by default (conservative; corporate s3 access
 *    is unaffected by NDA mode per the matrix, so the grant still
 *    serves inspection); pass --nda-approved only when the NDA
 *    familiarization actually happened.
 *  - idempotent: an existing assignment for (user, household) makes the
 *    run a no-op that says so (the one-role index would refuse anyway;
 *    this refuses politely first).
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { household, authUser, householdRoleAssignment, auditEvent, auditSubjectToken } from "./tables.ts";

const argv = process.argv.slice(2);
const argOf = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const householdId = argOf("--household");
const email = argOf("--email");
const by = argOf("--by");
const reason = argOf("--reason");
const role = argOf("--role") ?? "corporate_admin";
const ndaApproved = argv.includes("--nda-approved");

if (!householdId || !/^[0-9a-f-]{36}$/i.test(householdId)) {
  console.error("REFUSED: --household <uuid> is required.");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("REFUSED: --email is required (the grantee's sign-in address).");
  process.exit(1);
}
if (!by || !by.includes("@")) {
  console.error("REFUSED: --by is required (the granting corporate identity; a grant leaves audit history).");
  process.exit(1);
}
if (!reason || reason.trim().length < 10) {
  console.error("REFUSED: --reason is required, in words (cite the register entry that authorizes the grant).");
  process.exit(1);
}
if (!["corporate_admin", "corporate_ops", "cfo_readonly"].includes(role)) {
  console.error("REFUSED: --role must be a corporate role; field roles are assigned in the app.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const [hh] = await db.select().from(household).where(eq(household.id, householdId));
if (!hh) {
  console.error(`REFUSED: no household ${householdId}.`);
  await pool.end();
  process.exit(1);
}
const [actor] = await db.select().from(authUser).where(eq(authUser.email, by));
if (!actor) {
  console.error(`REFUSED: no user with email ${by}; the granting identity must already exist.`);
  await pool.end();
  process.exit(1);
}
const [actorRole] = await db.select().from(householdRoleAssignment).where(and(
  eq(householdRoleAssignment.userId, actor.id),
  eq(householdRoleAssignment.role, "corporate_admin"),
)).limit(1);
if (!actorRole) {
  console.error(`REFUSED: ${by} holds no corporate_admin role; granting is a corporate act.`);
  await pool.end();
  process.exit(1);
}
const [grantee] = await db.select().from(authUser).where(eq(authUser.email, email));
if (!grantee) {
  console.error(`REFUSED: no user with email ${email}; this script never creates people.`);
  await pool.end();
  process.exit(1);
}
const [existing] = await db.select().from(householdRoleAssignment).where(and(
  eq(householdRoleAssignment.userId, grantee.id),
  eq(householdRoleAssignment.householdId, householdId),
));
if (existing) {
  console.log(`no-op: ${email} already holds ${existing.role} on "${hh.name}"; nothing written.`);
  await pool.end();
  process.exit(0);
}

await db.insert(householdRoleAssignment).values({
  id: randomUUID(), userId: grantee.id, householdId,
  role: role as "corporate_admin" | "corporate_ops" | "cfo_readonly", // narrowed by the vocabulary refusal above
  ndaApproved,
});
const tokenId = randomUUID();
await db.insert(auditSubjectToken).values({ id: tokenId, householdId, kind: "email", value: email });
await db.insert(auditEvent).values({
  id: randomUUID(), householdId, actorUser: actor.id, actorRole: "corporate_admin",
  kind: "role_assigned",
  detail: { subjectToken: tokenId, role, ndaApproved, provisionedVia: "db:grant", reason: reason.trim() },
});
console.log(`granted: ${email} -> ${role} on "${hh.name}" (audit row written; reason recorded)`);
await pool.end();
