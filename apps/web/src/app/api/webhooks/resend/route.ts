import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { authUser, householdRoleAssignment, mailOutcome, appSetting } from "@wellkept/schema";
import { db } from "@/lib/db";

/**
 * Q-1: the mail provider's deliverability webhook (Resend, Svix scheme).
 *
 * The signature IS the credential: this route is unauthenticated by
 * session design (the provider is not a user) and fails CLOSED three
 * ways instead: 503 when no RESEND_WEBHOOK_SECRET is configured, 401 on
 * a signature that does not verify, 400 on a missing header, a stale
 * timestamp (replay window 5 minutes), or a body that is not JSON. No
 * rate limit on purpose: the limiter fails open by design and is not a
 * security boundary; the HMAC is.
 *
 * Every accepted event becomes ONE mail_outcome row (deduped on the
 * provider's delivery id, so provider retries are idempotent) whose
 * payload is the verbatim event body: the row's provenance is the
 * signed event itself, and no person acted, so there is no actor to
 * stamp. The household link is resolved server-side from the recipient
 * address's client assignment and is never taken from the payload's own
 * claims about us.
 */

const TOLERANCE_SECONDS = 300;

function verifySvixSignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
): boolean {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();
  for (const part of signatureHeader.split(" ")) {
    const [version, sig] = part.split(",", 2);
    if (version !== "v1" || !sig) continue;
    let candidate: Buffer;
    try {
      candidate = Buffer.from(sig, "base64");
    } catch {
      continue;
    }
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return true;
    }
  }
  return false;
}

/** The recipient's household, when the address is exactly one client's. */
async function resolveHousehold(recipient: string): Promise<string | null> {
  const rows = await db
    .select({ householdId: householdRoleAssignment.householdId })
    .from(householdRoleAssignment)
    .innerJoin(authUser, eq(householdRoleAssignment.userId, authUser.id))
    .where(and(eq(authUser.email, recipient), eq(householdRoleAssignment.role, "client")));
  const distinct = [...new Set(rows.map((r) => r.householdId))];
  return distinct.length === 1 ? (distinct[0] ?? null) : null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed, loudly: an unconfigured endpoint accepts nothing.
    console.error("[mail-webhook] RESEND_WEBHOOK_SECRET is not set; refusing delivery");
    return NextResponse.json({ error: "webhook secret not configured" }, { status: 503 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing signature headers" }, { status: 400 });
  }

  const ts = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "timestamp outside tolerance" }, { status: 400 });
  }

  const raw = await req.text();
  if (!verifySvixSignature(secret, svixId, svixTimestamp, raw, svixSignature)) {
    return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
  }

  let event: {
    type?: string;
    created_at?: string;
    data?: { email_id?: string; to?: string | string[]; created_at?: string };
  } | null = null;
  try {
    event = JSON.parse(raw);
  } catch {
    event = null;
  }
  if (!event || typeof event.type !== "string" || !event.type) {
    return NextResponse.json({ error: "malformed event" }, { status: 400 });
  }

  const to = event.data?.to;
  const recipient = (Array.isArray(to) ? to[0] : to) ?? null;
  const occurredRaw = event.created_at ?? event.data?.created_at ?? null;
  const occurredMs = occurredRaw ? Date.parse(occurredRaw) : NaN;

  try {
    await db
      .insert(mailOutcome)
      .values({
        id: randomUUID(),
        providerEventId: svixId,
        kind: event.type,
        recipient: recipient ?? "(none in payload)",
        messageId: event.data?.email_id ?? null,
        householdId: recipient ? await resolveHousehold(recipient) : null,
        payload: event,
        occurredAt: Number.isFinite(occurredMs) ? new Date(occurredMs) : null,
      })
      .onConflictDoNothing({ target: mailOutcome.providerEventId });

    // The heartbeat: state, not a decision, so a plain upsert (the
    // outbox_drain_status precedent). The silence knob on the fleet
    // board reads lastReceivedAt.
    const status = { lastReceivedAt: new Date().toISOString(), lastKind: event.type };
    await db
      .insert(appSetting)
      .values({ key: "mail_webhook_status", value: status, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSetting.key, set: { value: status, updatedAt: new Date() } });
  } catch (err) {
    // A 5xx makes the provider retry; the dedupe key makes the retry safe.
    console.error("[mail-webhook] store failed", err);
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
