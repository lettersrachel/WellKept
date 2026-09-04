import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { appSetting, authUser, household, householdRoleAssignment, mailOutcome } from "@wellkept/schema";
import { db } from "@/lib/db";
import { POST } from "./route";

/**
 * Q-1, proven against the real database (local and CI gates alike): the
 * deliverability webhook fails closed without its secret, refuses a bad
 * signature and a stale timestamp, stores a verified event as ONE
 * mail_outcome row read back by SELECT (the G-72 rule: the mutation is
 * confirmed by the database's own answer, never by the response code
 * alone), dedupes provider redeliveries on the delivery id, resolves
 * the recipient's household from a real client assignment, and beats
 * the mail_webhook_status heartbeat.
 */

// A real base64 test secret in the provider's own format.
const SECRET = "whsec_" + Buffer.from("q1-test-secret-32-bytes-exactly!").toString("base64");

function sign(id: string, timestamp: string, body: string): string {
  const key = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  return "v1," + createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

function request(raw: string, headers: Record<string, string>) {
  const h = new Headers(headers);
  return { headers: h, text: async () => raw } as unknown as Parameters<typeof POST>[0];
}

function signedRequest(raw: string, id: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  return request(raw, { "svix-id": id, "svix-timestamp": ts, "svix-signature": sign(id, ts, raw) });
}

const HH = randomUUID();
const CLIENT_EMAIL = `q1-client-${randomUUID().slice(0, 8)}@wellkept.test`;
let clientUserId = "";
const eventIds: string[] = [];

beforeAll(async () => {
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  await db.insert(household).values({ id: HH, name: "Q-1 webhook test household", tier: "essential" });
  const [u] = await db.insert(authUser).values({ email: CLIENT_EMAIL }).returning({ id: authUser.id });
  clientUserId = u!.id;
  await db.insert(householdRoleAssignment).values({
    id: randomUUID(), userId: clientUserId, householdId: HH, role: "client",
  });
});

afterAll(async () => {
  await db.delete(mailOutcome).where(inArray(mailOutcome.providerEventId, eventIds));
  await db.delete(householdRoleAssignment).where(eq(householdRoleAssignment.householdId, HH));
  await db.delete(authUser).where(eq(authUser.id, clientUserId));
  await db.delete(household).where(eq(household.id, HH));
  delete process.env.RESEND_WEBHOOK_SECRET;
});

test("no secret configured: 503, nothing stored (fail closed)", async () => {
  const saved = process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.RESEND_WEBHOOK_SECRET;
  try {
    const res = await POST(signedRequest(JSON.stringify({ type: "email.bounced" }), randomUUID()));
    assert.equal(res.status, 503);
  } finally {
    process.env.RESEND_WEBHOOK_SECRET = saved;
  }
});

test("a bad signature is refused 401 and stores nothing", async () => {
  const raw = JSON.stringify({ type: "email.bounced", data: { to: [CLIENT_EMAIL] } });
  const id = randomUUID();
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await POST(request(raw, {
    "svix-id": id, "svix-timestamp": ts, "svix-signature": "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  }));
  assert.equal(res.status, 401);
  const rows = await db.select().from(mailOutcome).where(eq(mailOutcome.providerEventId, id));
  assert.equal(rows.length, 0, "a refused delivery must leave no row");
});

test("a stale timestamp is refused 400 even with a valid signature over it", async () => {
  const raw = JSON.stringify({ type: "email.bounced" });
  const id = randomUUID();
  const ts = String(Math.floor(Date.now() / 1000) - 3600);
  const res = await POST(request(raw, {
    "svix-id": id, "svix-timestamp": ts, "svix-signature": sign(id, ts, raw),
  }));
  assert.equal(res.status, 400);
});

test("a verified bounce lands as one row, read back by SELECT, household resolved, heartbeat beaten", async () => {
  const id = randomUUID();
  eventIds.push(id);
  const raw = JSON.stringify({
    type: "email.bounced",
    created_at: "2026-09-04T12:00:00.000Z",
    data: { email_id: "re_test_1", to: [CLIENT_EMAIL], subject: "This week's visit at Q-1 webhook test household" },
  });
  const res = await POST(signedRequest(raw, id));
  assert.equal(res.status, 200);

  const rows = await db.select().from(mailOutcome).where(eq(mailOutcome.providerEventId, id));
  assert.equal(rows.length, 1);
  const row = rows[0]!;
  assert.equal(row.kind, "email.bounced");
  assert.equal(row.recipient, CLIENT_EMAIL);
  assert.equal(row.messageId, "re_test_1");
  assert.equal(row.householdId, HH, "the recipient's client assignment resolves the household");
  assert.equal(row.occurredAt?.toISOString(), "2026-09-04T12:00:00.000Z");
  assert.equal((row.payload as { type?: string }).type, "email.bounced", "the payload is the verbatim event");

  const [hb] = await db.select().from(appSetting).where(eq(appSetting.key, "mail_webhook_status"));
  const v = hb?.value as { lastReceivedAt?: string; lastKind?: string } | undefined;
  assert.ok(v?.lastReceivedAt, "the heartbeat row exists after an accepted event");
  assert.equal(v?.lastKind, "email.bounced");
});

test("a provider redelivery of the same svix-id dedupes to one row", async () => {
  const id = randomUUID();
  eventIds.push(id);
  const raw = JSON.stringify({ type: "email.complained", data: { to: CLIENT_EMAIL } });
  assert.equal((await POST(signedRequest(raw, id))).status, 200);
  assert.equal((await POST(signedRequest(raw, id))).status, 200);
  const rows = await db.select().from(mailOutcome).where(eq(mailOutcome.providerEventId, id));
  assert.equal(rows.length, 1, "two deliveries, one row");
});

test("a staff or unknown recipient stores with a NULL household, never a guess", async () => {
  const id = randomUUID();
  eventIds.push(id);
  const raw = JSON.stringify({ type: "email.bounced", data: { to: ["nobody@example.invalid"] } });
  assert.equal((await POST(signedRequest(raw, id))).status, 200);
  const rows = await db.select().from(mailOutcome).where(eq(mailOutcome.providerEventId, id));
  assert.equal(rows[0]!.householdId, null);
});
