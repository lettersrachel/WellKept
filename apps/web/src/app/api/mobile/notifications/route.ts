import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { notification } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { staffMfaCleared } from "@/lib/totp";

/**
 * The signed-in staff member's in-app notifications (e.g. corporate raised a
 * WATCH / LIFE-EVENT on one of their households). GET returns recent items +
 * the unread count; POST marks them read. Gated by the session + the second
 * factor, like every mobile route. (The same rows can later drive lock-screen
 * push once there's an EAS dev build — Expo Go can't receive remote push.)
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 403 });
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  const rows = await db.select().from(notification)
    .where(eq(notification.userId, user.id))
    .orderBy(desc(notification.createdAt))
    .limit(30);
  const items = rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, read: !!r.readAt, createdAt: r.createdAt }));
  return NextResponse.json({ items, unread: items.filter((i) => !i.read).length });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 403 });
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  await db.update(notification).set({ readAt: new Date() })
    .where(and(eq(notification.userId, user.id), isNull(notification.readAt)));
  return NextResponse.json({ ok: true });
}
