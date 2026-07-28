import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auditEvent } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getPrincipal } from "@/lib/session";

const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);

/**
 * AF (sync-defect sessions): discarding a dead-lettered visit command is
 * exactly the event a dispute turns on - a command a House Manager
 * believed was submitted, then thrown away. The audit row is therefore
 * written FIRST, here, server-side; the client removes its local copy
 * only after this responds ok. No audit, no discard - the same ordering
 * posture as the vault reveal.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { idempotencyKey?: string; type?: string; householdId?: string; attempts?: number }
    | null;
  if (!body?.idempotencyKey || !body.type || !body.householdId) {
    return NextResponse.json({ error: "malformed discard" }, { status: 400 });
  }
  const principal = await getPrincipal(body.householdId);
  if (!principal || !FIELD_ROLES.has(principal.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { staffMfaCleared } = await import("@/lib/totp");
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });
  await db.insert(auditEvent).values({
    id: randomUUID(),
    householdId: principal.householdId,
    actorUser: principal.userId,
    actorRole: principal.role,
    kind: "command_discarded",
    detail: {
      idempotencyKey: body.idempotencyKey,
      type: body.type,
      attempts: body.attempts ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}
