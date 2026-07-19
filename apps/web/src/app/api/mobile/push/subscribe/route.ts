import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { pushSubscription } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { staffMfaCleared } from "@/lib/totp";

/**
 * Register a browser's web-push subscription for the signed-in staff user, so
 * WATCH/LIFE-EVENT alerts can reach the lock screen of an installed PWA.
 * Upsert on the endpoint (re-subscribe from the same device just refreshes it).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 403 });
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } } | null;
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  await db
    .insert(pushSubscription)
    .values({ id: randomUUID(), userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });

  return NextResponse.json({ ok: true });
}
