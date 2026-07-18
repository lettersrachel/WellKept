import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { playbookField, auditEvent, household } from "@wellkept/schema";
import { revealS3, type AuditEntry } from "@wellkept/permissions";
import { db } from "@/lib/db";
import { getPrincipal } from "@/lib/session";
import { vaultOpen } from "@/lib/vault";

/**
 * REQ-034 / REQ-005: the s3 reveal. The principal comes from the Auth.js
 * session + household_role_assignment (never the client), the decision from
 * the permission core, and the audit row is written BEFORE the value leaves
 * the server — a failed audit write aborts the reveal. Until sprint 5+10
 * (ADR-001 guardrail 2) s3 rows hold no real values; the endpoint returns
 * the vault-pending placeholder. NDA households flow through opts.ndaMode.
 */
export async function POST(req: NextRequest) {
  const { fieldId } = (await req.json().catch(() => ({}))) as { fieldId?: string };
  if (!fieldId) return NextResponse.json({ ok: false, reason: "missing fieldId" }, { status: 400 });

  const rows = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  const f = rows[0];
  if (!f) return NextResponse.json({ ok: false, reason: "unknown field" }, { status: 404 });

  const principal = await getPrincipal(f.householdId);
  if (!principal) return NextResponse.json({ ok: false, reason: "not authenticated" }, { status: 403 });

  // REQ-006: NDA households tighten s3 for backup HMs until familiarization.
  const [hh] = await db.select().from(household).where(eq(household.id, f.householdId));
  const ndaMode = Boolean(hh?.isNda) && !principal.ndaApproved;

  const entries: AuditEntry[] = [];
  const result = revealS3(
    { role: principal.role, user: principal.userId, householdId: f.householdId },
    { id: f.id, name: f.name, sensitivity: f.sensitivity, value: f.value },
    (e) => entries.push(e),
    { ndaMode },
  );
  if (!result.ok) return NextResponse.json(result, { status: 403 });

  const entry = entries[0]!;
  try {
    await db.insert(auditEvent).values({
      id: randomUUID(),
      householdId: f.householdId,
      actorUser: principal.userId,
      actorRole: entry.role,
      kind: entry.kind === "corporate_view" ? "s3_corporate_view" : "s3_reveal",
      fieldId: f.id,
      detail: { field: entry.field, at: entry.at },
    });
  } catch {
    // The log is not optional: no audit row, no value.
    return NextResponse.json({ ok: false, reason: "audit write failed: reveal refused" }, { status: 500 });
  }

  // The value comes from the encrypted vault (REQ-013), decrypted only
  // after the permission decision and only after the audit row committed.
  // No vault item yet -> the vault-pending placeholder.
  const vaultValue = await vaultOpen(f.id);
  return NextResponse.json({
    ok: true,
    value: vaultValue ?? "vault-pending",
    expiresInSeconds: result.expiresInSeconds,
  });
}
