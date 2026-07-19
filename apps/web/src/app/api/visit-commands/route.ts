import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { householdRoleAssignment, authUser, household } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getPrincipal } from "@/lib/session";
import { applyVisitCommand, type ApplyInput } from "@/lib/visit-command-store";
import { sendMail } from "@/lib/mail";

/**
 * REQ-061: on an applied visit.submit, the client receives the report —
 * exactly the three sentences and the photo count, nothing internal.
 * Best-effort: a mail failure never un-applies the visit (the record is
 * the record); it logs and moves on.
 */
async function deliverClientReport(householdId: string, payload: { report?: string[]; photoIds?: string[] }) {
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  const clients = await db
    .select({ email: authUser.email, name: authUser.name })
    .from(householdRoleAssignment)
    .innerJoin(authUser, eq(authUser.id, householdRoleAssignment.userId))
    .where(and(
      eq(householdRoleAssignment.householdId, householdId),
      eq(householdRoleAssignment.role, "client"),
    ));
  const sentences = (payload.report ?? []).map((s) => `<p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#26241f;margin:6px 0">${s}</p>`).join("");
  for (const client of clients) {
    try {
      await sendMail({
        to: client.email,
        subject: `This week's visit — ${hh?.name ?? "your household"}`,
        html: `<div style="max-width:560px;margin:0 auto"><h2 style="font-family:Georgia,serif;color:#1c3d2e">This week&rsquo;s visit</h2>${sentences}<p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6b6b6b">${(payload.photoIds ?? []).length} photo(s) attached &middot; photo-supported report &middot; Well Kept</p></div>`,
      });
    } catch (err) {
      console.error("[visit-report] delivery failed (visit stays applied):", err instanceof Error ? err.message : err);
    }
  }
}

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
  if (body.type === "visit.submit" && !result.conflict) {
    await deliverClientReport(principal.householdId, body.payload as { report?: string[]; photoIds?: string[] });
  }
  return NextResponse.json(result);
}
