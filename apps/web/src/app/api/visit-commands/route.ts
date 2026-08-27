import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { householdRoleAssignment, authUser, household } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getPrincipal } from "@/lib/session";
import { applyVisitCommand, type ApplyInput } from "@/lib/visit-command-store";
import { sendMail, escapeHtml } from "@/lib/mail";
import { projectClientReport } from "@/lib/client-report";

/**
 * REQ-061: on an applied visit.submit, the client receives the report —
 * exactly the three sentences and the photo count, nothing internal.
 * Best-effort: a mail failure never un-applies the visit (the record is
 * the record); it logs and moves on.
 */
async function deliverClientReport(householdId: string, payload: { report?: string[]; photoIds?: string[] }) {
  const projected = projectClientReport(householdId, payload);
  if (!projected) return;
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  const clients = await db
    .select({ email: authUser.email, name: authUser.name })
    .from(householdRoleAssignment)
    .innerJoin(authUser, eq(authUser.id, householdRoleAssignment.userId))
    .where(and(
      eq(householdRoleAssignment.householdId, householdId),
      eq(householdRoleAssignment.role, "client"),
    ));
  // Every interpolated value below is a string a person typed. Escaped,
  // because `${...}` is concatenation and not markup-aware: an ampersand
  // in a house name or a "<" in a sentence otherwise reaches a member's
  // inbox as broken markup.
  const sentences = projected.report.map((s) => `<p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#26241f;margin:6px 0">${escapeHtml(s)}</p>`).join("");
  for (const client of clients) {
    try {
      await sendMail({
        to: client.email,
        // NOT escaped, deliberately: a subject line is plain text, so
        // escaping would print "Fitz &amp; Byrne" to the member. The
        // household name never reaches this email's MARKUP; only the
        // sentences do, and those are escaped above.
        subject: `This week's visit at ${hh?.name ?? "your household"}`,
        html: `<div style="max-width:560px;margin:0 auto"><h2 style="font-family:Georgia,serif;color:#1c3d2e">This week&rsquo;s visit</h2>${sentences}<p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6b6b6b">${projected.photoCount} photo(s) attached &middot; photo-supported report &middot; Well Kept</p></div>`,
      });
    } catch (err) {
      console.error("[visit-report] delivery failed (visit stays applied):", err instanceof Error ? err.message : err);
    }
  }
}

/**
 * REQ-061: corporate is alerted on every visit close for a household under
 * WATCH or LIFE-EVENT — the homes that need eyes. The alert carries the
 * three sentences plus whether a life-change signal fired; corporate roles
 * assigned to the household receive it. Best-effort, same as the client
 * report.
 */
async function alertCorporateOnWatch(
  householdId: string,
  payload: { report?: string[]; lifeChangeSignal?: boolean },
) {
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  if (!hh || (hh.statusTag !== "WATCH" && hh.statusTag !== "LIFE-EVENT")) return;
  const corp = await db
    .select({ email: authUser.email, role: householdRoleAssignment.role })
    .from(householdRoleAssignment)
    .innerJoin(authUser, eq(authUser.id, householdRoleAssignment.userId))
    .where(eq(householdRoleAssignment.householdId, householdId));
  const recipients = corp.filter((c) => c.role === "corporate_admin" || c.role === "corporate_ops");
  const sentences = (payload.report ?? []).map((s) => `<p style="font-family:Georgia,serif;font-size:15px;line-height:1.5;color:#26241f;margin:5px 0">${escapeHtml(s)}</p>`).join("");
  const signal = payload.lifeChangeSignal
    ? `<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#8c2f22;font-weight:700">⚑ Life-change signal flagged this visit — review same day.</p>`
    : "";
  for (const c of recipients) {
    try {
      await sendMail({
        to: c.email,
        subject: `[${hh.statusTag}] Visit closed — ${hh.name}`,
        html: `<div style="max-width:560px;margin:0 auto"><p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.1em;color:#b08d2a;font-weight:700">${escapeHtml(hh.statusTag)} HOUSEHOLD · VISIT CLOSED</p><h2 style="font-family:Georgia,serif;color:#1c3d2e">${escapeHtml(hh.name)}</h2>${signal}${sentences}<p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6b6b6b">Open the fleet board to review. Well Kept</p></div>`,
      });
    } catch (err) {
      console.error("[watch-alert] delivery failed:", err instanceof Error ? err.message : err);
    }
  }
}

const TYPES = new Set([
  "visit.submit", "dot.create", "signal.route",
  // Input spine build 1: the visit-page capture surfaces drain here too,
  // so every capture path works in airplane mode, not only the wizard.
  // corporate_ops still uses the online forms; the sink's role set is
  // unchanged (AJ option 2).
  "flag.create", "flag.look", "flag.close",
  "deferral.resolve", "pausedDecision.resolve", "prompt.outcome",
]);
// AJ decision (founder, 2026-07-28, option 2): corporate_admin may
// submit visit commands when covering a visit; actorRole on the audit
// trail attributes it honestly. corporate_ops deliberately not included.
const FIELD_ROLES = new Set(["house_manager", "backup_hm", "corporate_admin"]);

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
  // REQ-003: field roles are staff — the offline-drain sink requires the
  // second factor too, so a stolen HM session can't inject visit data.
  const { staffMfaCleared } = await import("@/lib/totp");
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });
  const result = await applyVisitCommand({
    idempotencyKey: body.idempotencyKey,
    type: body.type,
    payload: { ...body.payload, householdId: principal.householdId, submittedBy: principal.userId, submittedByRole: principal.role },
  });
  if (body.type === "visit.submit" && !result.conflict) {
    const p = body.payload as { report?: string[]; photoIds?: string[]; lifeChangeSignal?: boolean };
    await deliverClientReport(principal.householdId, p);
    await alertCorporateOnWatch(principal.householdId, p);
  }
  return NextResponse.json(result);
}
