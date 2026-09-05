import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { playbookField, auditEvent, household } from "@wellkept/schema";
import { revealS3, type AuditEntry } from "@wellkept/permissions";
import { db } from "@/lib/db";
import { getPrincipal } from "@/lib/session";
import { staffMfaCleared } from "@/lib/totp";
import { vaultOpen } from "@/lib/vault";
import { rateLimit } from "@/lib/rate-limit";

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

  // REQ-003: the second factor gates the API too, not just page navigation.
  // A staff session that skipped TOTP must not decrypt the vault by calling
  // this endpoint directly (the layout guard only covers page renders).
  if (!(await staffMfaCleared())) return NextResponse.json({ ok: false, reason: "second factor required" }, { status: 403 });

  // Hardening: a vault reveal is the highest-value action in the system.
  // Cap it per user (bulk exfiltration guard) even for authorized roles —
  // 40/hour is far above any legitimate in-context reveal rhythm. Every
  // attempt is still individually audited below.
  if (!(await // FAIL OPEN, deliberately and narrowly: this is an already-authenticated,
  // already-authorized, already-audited vault reveal, and refusing one
  // because Redis is unreachable would withhold an alarm code from a HOM
  // standing at a door. Blocking is worse than allowing here, which is the
  // exact test the 5 September ruling sets for staying open.
  rateLimit(`reveal:${principal.userId}`, 40, 3600, "open"))) {
    return NextResponse.json({ ok: false, reason: "reveal rate limit reached" }, { status: 429 });
  }

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
  // Q-11l: an authorization refusal is an OUTCOME and is recorded as one.
  // Until now this line returned 403 and wrote nothing, so the trail could say
  // who attempted and never who was TURNED AWAY. A `denied` row stands alone,
  // with no attempt row before it, and that is correct rather than an
  // asymmetry: no decryption was attempted, so there is nothing to have
  // attempted. The audit invariant is untouched, because it governs the path
  // where a value is about to be decrypted; here none ever will be, so a
  // failed write must not turn a refusal into an error.
  if (!result.ok) {
    try {
      await db.insert(auditEvent).values({
        id: randomUUID(),
        householdId: f.householdId,
        actorUser: principal.userId,
        actorRole: principal.role,
        kind: "s3_reveal_outcome",
        fieldId: f.id,
        detail: { field: f.name, ndaMode },
        revealOutcome: "denied",
      });
    } catch {
      console.error(`[reveal] denied-outcome row failed for field ${f.id}; the refusal stands`);
    }
    return NextResponse.json(result, { status: 403 });
  }

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
  //
  // G-53: the row above records that a reveal was AUTHORIZED and ATTEMPTED,
  // written before any decryption (the audit invariant, unchanged). What it
  // cannot say is whether a secret actually reached anyone: on 2026-07-29
  // three identical rows covered one real exposure and two failures (no
  // vault item, and a value sealed under a superseded KEK), so an auditor
  // asking "who has viewed this" was wrong about two of three. The outcome
  // is therefore a SECOND append, after the decrypt resolves.
  //
  // The two writes are deliberately NOT a transaction and the order is not
  // reversed (CLAUDE.md): if this second write fails, the attempt row still
  // stands, so the trail stays conservative - it may claim an exposure that
  // did not happen, never hide one that did.
  // The vocabulary is the founder's four, ruled 5 September 2026 and closed by
  // the 0068 enum: a fifth outcome is a report to her, never an addition. The
  // reasoning lives beside the enum in tables.ts.
  let vaultValue: string | null = null;
  let outcome: "delivered" | "not_found" | "failed";
  try {
    vaultValue = await vaultOpen(f.id);
    outcome = vaultValue === null ? "not_found" : "delivered";
  } catch {
    // Sealed under a different key, or corrupt. Previously this threw and
    // the route answered with an unhandled 500 (the G-54 class).
    outcome = "failed";
  }
  try {
    await db.insert(auditEvent).values({
      id: randomUUID(),
      householdId: f.householdId,
      actorUser: principal.userId,
      actorRole: entry.role,
      kind: "s3_reveal_outcome",
      fieldId: f.id,
      // The outcome is the TYPED column now, not a string in `detail`. Two
      // copies of one fact drift, and the column is the one the CHECK closes.
      detail: { field: entry.field },
      revealOutcome: outcome,
    });
  } catch {
    console.error(`[reveal] outcome row failed for field ${f.id} (${outcome}); the attempt row stands`);
  }
  if (outcome === "failed") {
    return NextResponse.json(
      { ok: false, reason: "the stored value could not be opened (key mismatch or corrupt ciphertext)" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    value: vaultValue ?? "vault-pending",
    expiresInSeconds: result.expiresInSeconds,
  });
}
