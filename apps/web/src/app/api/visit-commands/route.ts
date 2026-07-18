import { NextRequest, NextResponse } from "next/server";
import { getPrincipal } from "@/lib/session";
import { applyVisitCommand, type ApplyInput } from "@/lib/visit-command-store";

const TYPES = new Set(["visit.submit", "dot.create", "signal.route"]);
const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);

/**
 * The drain target for @wellkept/offline-queue. Only field roles submit
 * visit commands, and only for the household their server-side assignment
 * names — the payload's householdId is overwritten with the principal's,
 * never trusted from the client.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ApplyInput | null;
  if (!body?.idempotencyKey || !TYPES.has(body.type) || !body.payload) {
    return NextResponse.json({ error: "malformed command" }, { status: 400 });
  }
  const householdId = String(body.payload.householdId ?? "");
  if (!householdId) return NextResponse.json({ error: "missing householdId" }, { status: 400 });
  const principal = await getPrincipal(householdId);
  if (!principal || !FIELD_ROLES.has(principal.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await applyVisitCommand({
    idempotencyKey: body.idempotencyKey,
    type: body.type,
    payload: { ...body.payload, householdId: principal.householdId, submittedBy: principal.userId },
  });
  return NextResponse.json(result);
}
