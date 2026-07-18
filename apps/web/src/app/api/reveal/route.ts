import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { playbookField, auditEvent } from "@wellkept/schema";
import { revealS3, type AuditEntry } from "@wellkept/permissions";
import { db } from "@/lib/db";
import { getRole, DEMO_USERS } from "@/lib/session";

/**
 * REQ-034 / REQ-005: the s3 reveal. The decision comes from the permission
 * core; the audit row is written BEFORE the value leaves the server, and a
 * failed audit write aborts the reveal ("no sink, no reveal" carried through
 * to the database). Until sprint 5+10 (ADR-001 guardrail 2), s3 rows hold no
 * real values; the endpoint returns the vault-pending placeholder.
 */
export async function POST(req: NextRequest) {
  const role = await getRole();
  const { fieldId } = (await req.json().catch(() => ({}))) as { fieldId?: string };
  if (!fieldId) return NextResponse.json({ ok: false, reason: "missing fieldId" }, { status: 400 });

  const rows = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  const f = rows[0];
  if (!f) return NextResponse.json({ ok: false, reason: "unknown field" }, { status: 404 });

  const entries: AuditEntry[] = [];
  const result = revealS3(
    { role, user: DEMO_USERS[role].id, householdId: f.householdId },
    { id: f.id, name: f.name, sensitivity: f.sensitivity, value: f.value },
    (e) => entries.push(e),
  );
  if (!result.ok) return NextResponse.json(result, { status: 403 });

  const entry = entries[0]!;
  try {
    await db.insert(auditEvent).values({
      id: randomUUID(),
      householdId: f.householdId,
      actorUser: entry.user,
      actorRole: entry.role,
      kind: entry.kind === "corporate_view" ? "s3_corporate_view" : "s3_reveal",
      fieldId: f.id,
      detail: { field: entry.field, at: entry.at },
    });
  } catch {
    // The log is not optional: no audit row, no value.
    return NextResponse.json({ ok: false, reason: "audit write failed: reveal refused" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    value: result.value || "vault-pending", // ADR-001 guardrail 2
    expiresInSeconds: result.expiresInSeconds,
  });
}
