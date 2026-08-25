"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { household, playbookField, clientEdit, auditEvent, strangerTest, gesture, dot, shadowLog, workItem, attentionRecord, decisionRecord, captureArtifact, emitOutboxEvent } from "@wellkept/schema";
import { readDecision } from "@wellkept/permissions";
import { db } from "./db";
import { getPrincipal } from "./session";
import { emitFieldChange, outboxFieldEvent } from "./field-events";
import { vaultWrite } from "./vault";
import { isClientEditable } from "./client-allowlist";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * ADR-006 (G-59, AR's first fix): audit rows never hold a name or an email
 * for a subject who is not the acting user - they hold a token minted
 * here, resolved through audit_subject_token at read time by an
 * authorized viewer. Erasing the subject deletes the mapping row; the
 * audit row survives, append-only, and becomes unlinkable. A new token
 * per event on purpose: deduping per subject would itself be a linkage
 * record.
 */
async function mintAuditSubjectToken(
  householdId: string,
  kind: "email" | "person_ref",
  value: string,
): Promise<string> {
  const { auditSubjectToken } = await import("@wellkept/schema");
  const id = randomUUID();
  await db.insert(auditSubjectToken).values({ id, householdId, kind, value });
  return id;
}

/**
 * G-29: a refused action must SAY it refused.
 *
 * These guards used to `return` silently. A silent return is
 * indistinguishable from a broken button — the operator sees a click that
 * does nothing and cannot tell "the system declined this" from "the system
 * is down". That ambiguity cost the 2026-07-27 smoke run three false
 * failures and two days of misdiagnosis, so refusal is now visible.
 *
 * Convention mirrors the signin routes' `?error=`: redirect back to the
 * surface the operator is standing on, carrying a reason the page renders.
 * `redirect()` throws by design — it must not be called inside a try/catch,
 * and its `never` return type is what lets these replace a bare `return`.
 *
 * Fail-closed behaviour is UNCHANGED: every guard still refuses, and no
 * refusal path writes. Only the operator's feedback changes.
 */
function refuseTo(path: string, reason: RefusalReason): never {
  redirect(`${path}?refused=${reason}`);
}

function refuse(householdId: string | null | undefined, reason: RefusalReason): never {
  refuseTo(householdId ? `/oversight/${householdId}` : "/oversight", reason);
}

/**
 * G-29 completion for dual-surface actions: verdicts land where the
 * operator stands. The allowlist is exact - /visit, or the drill-in of
 * the SAME household the form names; anything else falls back to the
 * drill-in. Never a raw redirect target.
 */
function resolveReturnTo(raw: string, householdId: string): string {
  if (raw === "/visit") return "/visit";
  if (householdId && raw === `/oversight/${householdId}`) return raw;
  // s3.3 contextual entry: a capture made FROM an asset's context page
  // returns to it. Fixed prefix plus a uuid, nothing else; the page
  // itself re-checks tenancy and sensitivity on every render.
  if (/^\/context\/[0-9a-f-]{36}$/i.test(raw)) return raw;
  return householdId ? `/oversight/${householdId}` : "/oversight";
}

/** Success made legible: redirect with what was recorded + a nonce that
 * remounts the form's selects (an uncontrolled select keeps its DOM value
 * across re-renders - G-39). */
function recordedTo(path: string, what: string): never {
  redirect(`${path}?recorded=${encodeURIComponent(what)}&r=${randomUUID().slice(0, 8)}`);
}

/** The reasons a drill-in action can refuse. Keep in sync with REFUSALS in the drill-in page. */
export type RefusalReason =
  | "bad-input"      // the form arrived incomplete or malformed
  | "forbidden"      // the actor lacks the role this action requires
  | "not-pending"    // the target was already reviewed/executed by someone else
  | "missing"        // the target row no longer exists
  | "gate-unmet"     // a precondition gate (cultural fit, HM notified) is not satisfied
  | "self-target";   // refused to act on your own account (lockout guard)

/** Corporate sets the household status tag (REQ-041); every change audited. */
export async function setStatusTag(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) refuse(null, "bad-input");
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") refuse(householdId, "forbidden"); // fail closed
  const tag = String(formData.get("statusTag") ?? "");
  const VALID = ["ONBOARDING-90", "STEADY", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION"] as const;
  if (!(VALID as readonly string[]).includes(tag)) refuse(householdId, "bad-input");
  const prior = await db.select().from(household).where(eq(household.id, householdId));
  if (!prior[0]) refuse(householdId, "missing");
  await db.update(household)
    .set({ statusTag: tag as (typeof VALID)[number], updatedAt: new Date() })
    .where(eq(household.id, householdId));
  await db.insert(auditEvent).values({
    id: randomUUID(),
    householdId,
    actorUser: principal.userId,
    actorRole: principal.role,
    kind: "tag_change",
    detail: { from: prior[0].statusTag, to: tag },
  });
  // Notify the household's house managers when corporate raises a WATCH or
  // LIFE-EVENT — they see it in the field app before their next visit.
  if (tag === "WATCH" || tag === "LIFE-EVENT") {
    const { householdRoleAssignment, notification } = await import("@wellkept/schema");
    const { inArray } = await import("drizzle-orm");
    const hms = await db.select({ userId: householdRoleAssignment.userId })
      .from(householdRoleAssignment)
      .where(and(eq(householdRoleAssignment.householdId, householdId), inArray(householdRoleAssignment.role, ["house_manager", "backup_hm"])));
    if (hms.length) {
      const title = tag === "LIFE-EVENT" ? "Life-event set for a household" : "Household moved to WATCH";
      const body = tag === "LIFE-EVENT"
        ? `${prior[0].name}: corporate set LIFE-EVENT. Prompts are held; lead with care, not asks.`
        : `${prior[0].name}: corporate set WATCH. Extra attention on your next visit.`;
      await db.insert(notification).values(
        hms.map((h) => ({ id: randomUUID(), userId: h.userId, householdId, kind: `tag:${tag}`, title, body })),
      );
      // Best-effort lock-screen push to any installed PWAs (no-op without VAPID).
      const { sendPushToUser } = await import("./push");
      await Promise.all(hms.map((h) => sendPushToUser(h.userId, { title, body, url: "/visit" }).catch(() => {})));
    }
  }
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${householdId}`);
}

/** REQ-022: a client edit lands in review state; it never touches the field directly. */
export async function proposeEdit(formData: FormData) {
  const fieldId = String(formData.get("fieldId") ?? "");
  const proposed = String(formData.get("proposedValue") ?? "").trim();
  if (!fieldId || !proposed) return;
  const rows = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  const f = rows[0];
  if (!f) return;
  const principal = await getPrincipal(f.householdId);
  if (principal?.role !== "client") return;
  // The client can only propose on fields the client can see. Policy, not UI.
  if (readDecision("client", f.sensitivity) !== "visible") return;
  if (!isClientEditable(f.name)) return; // REQ-022 allowlist, fail closed
  await db.insert(clientEdit).values({
    id: randomUUID(),
    householdId: f.householdId,
    fieldId,
    proposedValue: proposed,
  });
  revalidatePath("/playbook");
}

/** HM-role review is the spec (REQ-022); corporate_admin covers it in the web demo
 * until the mobile app exists. Approval merges the value and audits the write. */
export async function reviewEdit(formData: FormData) {
  const editId = String(formData.get("editId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!editId || (decision !== "approved" && decision !== "declined")) refuse(null, "bad-input");
  const rows = await db.select().from(clientEdit).where(eq(clientEdit.id, editId));
  const edit = rows[0];
  if (!edit) refuse(null, "missing");
  // The case that bit the smoke run: the edit was already reviewed (often by
  // a second click, or a stale page re-submitting), so this call is a no-op.
  if (edit.status !== "pending") refuse(edit.householdId, "not-pending");
  const principal = await getPrincipal(edit.householdId);
  if (principal?.role !== "corporate_admin") refuse(edit.householdId, "forbidden");
  if (decision === "approved") {
    const frows = await db.select().from(playbookField).where(eq(playbookField.id, edit.fieldId));
    const f = frows[0];
    if (!f) refuse(edit.householdId, "missing");
    const event = {
      householdId: f.householdId, fieldId: f.id, fieldName: f.name,
      section: f.section, newValue: edit.proposedValue, changedAt: new Date().toISOString(),
    };
    // Field write + audit + outbox event commit atomically (durable trigger
    // delivery); the immediate inline pass runs after the transaction.
    await db.transaction(async (tx) => {
      await tx.update(playbookField)
        .set({ value: edit.proposedValue, provenance: "client_written", provenanceDate: new Date(), confirmed: true, updatedAt: new Date() })
        .where(eq(playbookField.id, f.id));
      await tx.insert(auditEvent).values({
        id: randomUUID(), householdId: edit.householdId, actorUser: principal.userId, actorRole: principal.role,
        kind: "field_write", fieldId: f.id, oldValueHash: sha256(f.value), newValueHash: sha256(edit.proposedValue),
        detail: { via: "client_edit_approval", editId },
      });
      await outboxFieldEvent(tx, event, { actor: principal.userId, sensitivity: f.sensitivity === "s1" ? "s1" : "s2" });
    });
    await emitFieldChange(event);
  }
  await db.update(clientEdit)
    .set({ status: decision, reviewedBy: principal.userId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientEdit.id, editId));
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${edit.householdId}`);
  revalidatePath("/playbook");
}

/**
 * REQ-013: store an s3 value in the encrypted vault. corporate_admin only
 * (the HM capture path is the mobile app's later sprint). The plaintext
 * goes ONLY through @wellkept/vault sealing — playbook_field stays empty
 * and the audit row carries a hash, never the value.
 */
export async function setVaultValue(formData: FormData) {
  const fieldId = String(formData.get("fieldId") ?? "");
  const value = String(formData.get("vaultValue") ?? "").trim();
  if (!fieldId || !value) refuse(null, "bad-input");
  const rows = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  const f = rows[0];
  if (!f) refuse(null, "missing");
  if (f.sensitivity !== "s3") refuse(f.householdId, "bad-input"); // the vault accepts s3 only
  const principal = await getPrincipal(f.householdId);
  if (principal?.role !== "corporate_admin") refuse(f.householdId, "forbidden"); // fail closed
  await vaultWrite(f.householdId, fieldId, value);
  await db.insert(auditEvent).values({
    id: randomUUID(),
    householdId: f.householdId,
    actorUser: principal.userId,
    actorRole: principal.role,
    kind: "vault_write",
    fieldId,
    newValueHash: sha256(value),
  });
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${f.householdId}`);
}

/**
 * REQ-033: stranger mode. A backup HM's friction notes route to the
 * record as a Stranger Test row — the household's legibility to a
 * stranger is a measured, logged property, not a vibe.
 */
export async function logStrangerTest(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const notesRaw = String(formData.get("frictionNotes") ?? "").trim();
  const passed = formData.get("passed") === "yes";
  if (!householdId) return;
  const principal = await getPrincipal(householdId);
  if (!principal || (principal.role !== "backup_hm" && principal.role !== "house_manager")) return;
  if (!passed && !notesRaw) return; // a failed test needs the friction named
  await db.insert(strangerTest).values({
    id: randomUUID(),
    householdId,
    coveredBy: principal.userId,
    frictionNotes: notesRaw ? notesRaw.split("\n").filter(Boolean) : [],
    passed,
  });
  revalidatePath("/visit");
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${householdId}`);
}

/** REQ-042 gate order is policy, not UI: queue -> cultural fit -> HM notified -> execute. */
export async function queueGesture(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const idea = String(formData.get("idea") ?? "").trim();
  const sourceDotId = String(formData.get("dotId") ?? "");
  if (!householdId || !idea) refuse(householdId || null, "bad-input");
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") refuse(householdId, "forbidden");
  await db.insert(gesture).values({
    id: randomUUID(),
    householdId,
    triggerSource: sourceDotId ? `dot:${sourceDotId}` : "corporate",
    idea,
  });
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${householdId}`);
}

export async function gestureGate(formData: FormData) {
  const gestureId = String(formData.get("gestureId") ?? "");
  const gate = String(formData.get("gate") ?? "");
  if (!gestureId || (gate !== "cultural_fit" && gate !== "hm_notified")) refuse(null, "bad-input");
  const [g] = await db.select().from(gesture).where(eq(gesture.id, gestureId));
  if (!g) refuse(null, "missing");
  if (g.executedAt) refuse(g.householdId, "not-pending");
  const principal = await getPrincipal(g.householdId);
  if (principal?.role !== "corporate_admin") refuse(g.householdId, "forbidden");
  // HM notification only after cultural fit passed (the gate ORDER is the rule)
  if (gate === "hm_notified" && !g.culturalFitChecked) refuse(g.householdId, "gate-unmet");
  await db.update(gesture)
    .set(gate === "cultural_fit" ? { culturalFitChecked: true, updatedAt: new Date() } : { hmNotified: true, updatedAt: new Date() })
    .where(eq(gesture.id, gestureId));
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${g.householdId}`);
}

export async function executeGesture(formData: FormData) {
  const gestureId = String(formData.get("gestureId") ?? "");
  const costCents = Math.round(Number(formData.get("costDollars") ?? 0) * 100);
  if (!gestureId) refuse(null, "bad-input");
  const [g] = await db.select().from(gesture).where(eq(gesture.id, gestureId));
  if (!g) refuse(null, "missing");
  if (g.executedAt) refuse(g.householdId, "not-pending");
  const principal = await getPrincipal(g.householdId);
  if (principal?.role !== "corporate_admin") refuse(g.householdId, "forbidden");
  if (!g.culturalFitChecked || !g.hmNotified) refuse(g.householdId, "gate-unmet"); // both gates or nothing
  await db.update(gesture)
    .set({ executedAt: new Date(), costCents: Number.isFinite(costCents) ? costCents : null, updatedAt: new Date() })
    .where(eq(gesture.id, gestureId));
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${g.householdId}`);
}

/**
 * REQ-002/006: corporate provisioning. corporate_admin assigns a person
 * (by email — created if new) a single role at one household, optionally
 * NDA-approved. No wildcard grants (REQ-001): one row per person per
 * household. Self-service for the founder — replaces the SQL-insert path.
 */
export async function assignRole(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const ndaApproved = formData.get("ndaApproved") === "on";
  const VALID_ROLES = ["client", "house_manager", "backup_hm", "corporate_ops", "corporate_admin", "cfo_readonly"];
  if (!householdId || !email || !VALID_ROLES.includes(role)) refuse(householdId || null, "bad-input");
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") refuse(householdId, "forbidden"); // only admins provision
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) refuse(householdId, "bad-input");

  const { authUser, householdRoleAssignment } = await import("@wellkept/schema");
  await db.insert(authUser).values({ id: randomUUID(), email, name: null }).onConflictDoNothing({ target: authUser.email });
  const [user] = await db.select().from(authUser).where(eq(authUser.email, email));
  if (!user) refuse(householdId, "missing");
  // One role per (user, household): update in place if the row exists.
  const existing = await db.select().from(householdRoleAssignment)
    .where(and(eq(householdRoleAssignment.userId, user.id), eq(householdRoleAssignment.householdId, householdId)));
  if (existing[0]) {
    await db.update(householdRoleAssignment)
      .set({ role: role as typeof existing[0]["role"], ndaApproved, createdAt: new Date() })
      .where(eq(householdRoleAssignment.id, existing[0].id));
  } else {
    await db.insert(householdRoleAssignment).values({
      id: randomUUID(), userId: user.id, householdId, role: role as "client", ndaApproved,
    });
  }
  // G-59: the assignment target's email never enters the audit row - the
  // token resolves to it while the subject's mapping exists, and stops
  // resolving the day it is erased. actorUser stays a plain id: the actor
  // is deliberately never anonymized (ADR-006's scope note).
  const subjectToken = await mintAuditSubjectToken(householdId, "email", email);
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: actor.userId, actorRole: actor.role,
    kind: "role_assigned", detail: { subjectToken, role, ndaApproved },
  });
  revalidatePath(`/oversight/${householdId}`);
}

export async function revokeRole(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const householdId = String(formData.get("householdId") ?? "");
  if (!assignmentId || !householdId) refuse(householdId || null, "bad-input");
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") refuse(householdId, "forbidden");
  const { householdRoleAssignment } = await import("@wellkept/schema");
  const [row] = await db.select().from(householdRoleAssignment).where(eq(householdRoleAssignment.id, assignmentId));
  if (!row || row.householdId !== householdId) refuse(householdId, "missing");
  if (row.userId === actor.userId) refuse(householdId, "self-target"); // never revoke your own admin here (lockout guard)
  await db.delete(householdRoleAssignment).where(eq(householdRoleAssignment.id, assignmentId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: actor.userId, actorRole: actor.role,
    kind: "role_revoked", detail: { assignmentId },
  });
  revalidatePath(`/oversight/${householdId}`);
}

/**
 * REQ-046: dot triage. Corporate promotes an observed dot into a real
 * field update — the value merges onto a chosen field, the dot is marked
 * promoted (drops off the open list), and the field write emits a
 * trigger-engine event, so a promotion can cascade into scheduled prompts.
 */
export async function promoteDot(formData: FormData) {
  const dotId = String(formData.get("dotId") ?? "");
  const fieldId = String(formData.get("fieldId") ?? "");
  const value = String(formData.get("value") ?? "").trim();
  if (!dotId || !fieldId || !value) refuse(null, "bad-input");
  const { dot, playbookField } = await import("@wellkept/schema");
  const [d] = await db.select().from(dot).where(eq(dot.id, dotId));
  if (!d) refuse(null, "missing");
  if (d.promotedFieldId) refuse(d.householdId, "not-pending");
  const actor = await getPrincipal(d.householdId);
  if (actor?.role !== "corporate_admin") refuse(d.householdId, "forbidden");
  const [f] = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  if (!f || f.householdId !== d.householdId) refuse(d.householdId, "missing");
  if (f.sensitivity === "s3") refuse(d.householdId, "bad-input"); // s3 goes through the vault, never a dot merge

  const event = {
    householdId: d.householdId, fieldId: f.id, fieldName: f.name,
    section: f.section, newValue: value, changedAt: new Date().toISOString(),
  };
  await db.transaction(async (tx) => {
    await tx.update(playbookField)
      .set({ value, provenance: "observed", provenanceDate: new Date(), confirmed: true, updatedAt: new Date() })
      .where(eq(playbookField.id, f.id));
    await tx.update(dot).set({ promotedFieldId: f.id, updatedAt: new Date() }).where(eq(dot.id, dotId));
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId: d.householdId, actorUser: actor.userId, actorRole: actor.role,
      kind: "field_write", fieldId: f.id, oldValueHash: sha256(f.value), newValueHash: sha256(value),
      detail: { via: "dot_promotion", dotId },
    });
    await outboxFieldEvent(tx, event, { actor: actor.userId, sensitivity: f.sensitivity === "s1" ? "s1" : "s2" });
  });
  await emitFieldChange(event);
  revalidatePath(`/oversight/${d.householdId}`);
}

/**
 * REQ-003: session revocation. corporate_admin force-signs-out a person —
 * deletes every active session for that user (offboarding, or a suspected
 * compromise). Distinct from revokeRole (which removes access rights but
 * leaves a live session valid until expiry).
 */
export async function forceSignOut(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  if (!householdId || !targetUserId) refuse(householdId || null, "bad-input");
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") refuse(householdId, "forbidden");
  if (targetUserId === actor.userId) refuse(householdId, "self-target"); // don't sign yourself out here
  const { authSession } = await import("@wellkept/schema");
  const killed = await db.delete(authSession).where(eq(authSession.userId, targetUserId)).returning({ t: authSession.sessionToken });
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: actor.userId, actorRole: actor.role,
    kind: "sessions_revoked", detail: { targetUserId, count: killed.length },
  });
  revalidatePath(`/oversight/${householdId}`);
}

/**
 * REQ-003 recovery: reset a user's TOTP second factor (lost/replaced phone).
 * corporate_admin only. Deletes the enrolled secret AND kills the user's
 * sessions, so their next sign-in re-enrolls a fresh authenticator — a lost
 * device can never be a standing hole. Audited.
 */
export async function resetTotp(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  if (!householdId || !targetUserId) refuse(householdId || null, "bad-input");
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") refuse(householdId, "forbidden");
  const { userTotp, userBackupCode, authSession } = await import("@wellkept/schema");
  await db.delete(userBackupCode).where(eq(userBackupCode.userId, targetUserId));
  await db.delete(userTotp).where(eq(userTotp.userId, targetUserId));
  await db.delete(authSession).where(eq(authSession.userId, targetUserId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: actor.userId, actorRole: actor.role,
    kind: "totp_reset", detail: { targetUserId },
  });
  revalidatePath(`/oversight/${householdId}`);
}

/**
 * Intake capture (the in-app replacement for the workbook): a field-role
 * user fills a field of their own household during the walk-through. Same
 * atomic write discipline as every other field mutation — field + audit +
 * outbox commit together, inline trigger pass after. Two intake-specific
 * rules: sensitivity never downgrades (importer discipline, fail closed
 * upward), and s3 stays vault-only — the field row never stores the value
 * and NOTHING s3 rides the trigger outbox (event payloads carry plaintext).
 */
export async function captureField(formData: FormData) {
  const fieldId = String(formData.get("fieldId") ?? "");
  if (!fieldId) return;
  const [f] = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  if (!f) return;
  const principal = await getPrincipal(f.householdId);
  if (!principal || !["house_manager", "backup_hm"].includes(principal.role)) return; // fail closed

  const PROV = ["asked", "observed", "verified_by_touch"] as const;
  const SENS = ["s1", "s2", "s3"] as const;
  const FLAGS = ["none", "CRITICAL", "CAUTION", "DELIGHT"] as const;
  const provRaw = String(formData.get("provenance") ?? "");
  const sensRaw = String(formData.get("sensitivity") ?? "");
  const flagRaw = String(formData.get("flag") ?? "none");
  if (!(PROV as readonly string[]).includes(provRaw)) return;
  if (!(SENS as readonly string[]).includes(sensRaw)) return;
  if (!(FLAGS as readonly string[]).includes(flagRaw)) return;
  const provenance = provRaw as (typeof PROV)[number];
  const flag = flagRaw as (typeof FLAGS)[number];
  // Sensitivity only ratchets up: a capture never quietly declassifies.
  const ORDER: Record<string, number> = { s1: 1, s2: 2, s3: 3 };
  const rank = (s: string) => ORDER[s] ?? 3; // unknown marker fails UP
  const sensitivity = (rank(sensRaw) >= rank(f.sensitivity) ? sensRaw : f.sensitivity) as (typeof SENS)[number];

  const note = String(formData.get("note") ?? "").trim();
  // s3: the value NEVER lands on the field row (vault law, REQ-013). If a
  // previously-plain field is being reclassified s3, its plaintext clears.
  const rawValue = String(formData.get("value") ?? "").trim();
  const value = sensitivity === "s3" ? "" : rawValue;

  const event = {
    householdId: f.householdId, fieldId: f.id, fieldName: f.name,
    section: f.section, newValue: value, changedAt: new Date().toISOString(),
  };
  const valueChanged = value !== f.value;
  // Stranger-mode ruling (c): the marker is set by a human at capture,
  // never inferred. It only ever WIDENS the stranger projection for s2
  // (the filter ignores it for s3, and s1 always shows).
  const strangerVisible = formData.get("strangerVisible") === "on";
  await db.transaction(async (tx) => {
    await tx.update(playbookField)
      .set({
        value, note, sensitivity, flag, provenance, strangerVisible,
        provenanceDate: new Date(), provenanceActor: principal.userId,
        confirmed: Boolean(value), updatedAt: new Date(),
      })
      .where(eq(playbookField.id, f.id));
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId: f.householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "field_write", fieldId: f.id, oldValueHash: sha256(f.value), newValueHash: sha256(value),
      detail: { via: "intake_capture" },
    });
    // s3 and no-op saves emit nothing: outbox payloads carry plaintext.
    if (valueChanged && sensitivity !== "s3" && value) await outboxFieldEvent(tx, event, { actor: principal.userId, sensitivity: sensitivity === "s1" ? "s1" : "s2" });
  });
  if (valueChanged && sensitivity !== "s3" && value) await emitFieldChange(event);
  revalidatePath("/intake");
  revalidatePath("/visit");
}

/**
 * REQ-040 economics: corporate_admin sets a household's monthly rate. The
 * value lives in membership_terms (integer cents, DEV-004 S3) and feeds the
 * economics panel's effective-hourly math. Audited like every other write.
 */
export async function setMonthlyRate(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) return;
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") return; // fail closed
  const dollars = Number(String(formData.get("monthlyRate") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(dollars) || dollars < 0 || dollars > 1_000_000) return;
  const cents = Math.round(dollars * 100);
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  if (!hh) return;
  const terms = { ...(hh.membershipTerms as Record<string, unknown> | null ?? {}), monthlyRateCents: cents };
  await db.update(household).set({ membershipTerms: terms, updatedAt: new Date() }).where(eq(household.id, householdId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "rate_change", detail: { monthlyRateCents: cents },
  });
  revalidatePath("/oversight/economics");
}

/**
 * REQ-045 trigger administration. The rule library is versioned corporate
 * content (WK-DEV-005 S4): corporate_admin toggles and creates fleet-level
 * rules; definitions are zod-validated before they touch the table so a
 * malformed rule can never reach the engine. Every change audited.
 * Rules never hard-delete — disable is the retirement path.
 */
export async function setTriggerRuleEnabled(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const anchorHouseholdId = String(formData.get("anchorHouseholdId") ?? "");
  // This action lives on /oversight/triggers, not a drill-in — refuse back
  // to the page the operator is actually standing on.
  if (!ruleId || !anchorHouseholdId) refuseTo("/oversight/triggers", "bad-input");
  const principal = await getPrincipal(anchorHouseholdId);
  if (principal?.role !== "corporate_admin") refuseTo("/oversight/triggers", "forbidden"); // fail closed
  const { triggerRule } = await import("@wellkept/schema");
  const [rule] = await db.select().from(triggerRule).where(eq(triggerRule.id, ruleId));
  if (!rule) refuseTo("/oversight/triggers", "missing");
  await db.update(triggerRule).set({ enabled, updatedAt: new Date() }).where(eq(triggerRule.id, ruleId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: anchorHouseholdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "trigger_rule_change", detail: { ruleId, enabled, packName: (rule.definition as { packName?: string }).packName },
  });
  revalidatePath("/oversight/triggers");
}

/**
 * LAUNCH.md 1.5 / ADR-001 guardrail 3: record that a household's written
 * consent exists — when it was signed and which doc version. The paper
 * remains the artifact; this is the system's sight of it, the client-side
 * counterpart of nda_approved. corporate_admin only; audited; correcting a
 * mistake is re-recording (the audit trail keeps every prior value).
 */
export async function recordHouseholdConsent(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) refuse(null, "bad-input");
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") refuse(householdId, "forbidden"); // fail closed
  const signedAtRaw = String(formData.get("signedAt") ?? "");
  const docVersion = String(formData.get("docVersion") ?? "").trim().slice(0, 80);
  const signedAt = new Date(signedAtRaw);
  if (!signedAtRaw || Number.isNaN(signedAt.getTime()) || !docVersion) refuse(householdId, "bad-input");
  if (signedAt.getTime() > Date.now()) refuse(householdId, "bad-input"); // consent is a fact, not a plan
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  if (!hh) refuse(householdId, "missing");
  await db.update(household)
    .set({ consentSignedAt: signedAt, consentDocVersion: docVersion, consentRecordedBy: principal.userId, updatedAt: new Date() })
    .where(eq(household.id, householdId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "consent_recorded",
    detail: {
      signedAt: signedAt.toISOString(), docVersion,
      prior: hh.consentSignedAt ? { signedAt: hh.consentSignedAt.toISOString(), docVersion: hh.consentDocVersion } : null,
    },
  });
  revalidatePath(`/oversight/${householdId}`);
}

/**
 * A2/REQ-055: a field-role user answers a surfaced prompt. Answering never
 * gates anything; an unanswered prompt is itself data (the strongest noise
 * signal) and is deliberately NOT a row. Append-only: the unique
 * (prompt, user) index makes a second answer a no-op, and no update or
 * delete path exists.
 */
export async function recordPromptOutcome(formData: FormData) {
  const promptId = String(formData.get("promptId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const OUTCOMES = ["acted", "dismissed", "not_applicable", "already_done"] as const;
  if (!promptId || !(OUTCOMES as readonly string[]).includes(outcome)) return;
  const { promptPackItem, promptOutcome } = await import("@wellkept/schema");
  const [item] = await db.select().from(promptPackItem).where(eq(promptPackItem.id, promptId));
  if (!item) return;
  const principal = await getPrincipal(item.householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) return;
  const answeredAt = new Date();
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null; // s2
  // Session A: was_news only means something on acted ("Good catch" true /
  // "Already on it" false); dismiss_reason only on dismissed. Any other
  // combination is dropped to null, never coerced — the metric ignores nulls.
  const wasNewsRaw = String(formData.get("wasNews") ?? "");
  const wasNews = outcome === "acted" && (wasNewsRaw === "true" || wasNewsRaw === "false")
    ? wasNewsRaw === "true" : null;
  const dismissReasonRaw = String(formData.get("dismissReason") ?? "");
  const dismissReason = outcome === "dismissed" && ["wrong", "bad_timing"].includes(dismissReasonRaw)
    ? (dismissReasonRaw as "wrong" | "bad_timing") : null;
  // lead_days: answered_at to the prompt's own target (A2 finding 8 — null
  // for event-driven prompts, and rule health states the sample size).
  let leadDays: number | null = null;
  if (item.targetDate) {
    const target = new Date(`${item.targetDate}T12:00:00Z`);
    leadDays = Math.round((target.getTime() - answeredAt.getTime()) / (24 * 60 * 60 * 1000));
  }
  await db.insert(promptOutcome).values({
    id: randomUUID(),
    householdId: item.householdId,
    promptId: item.id,
    ruleId: item.triggerRuleId,
    provisionRef: null,
    userId: principal.userId,
    role: principal.role, // role at answer time, not current role
    outcome: outcome as (typeof OUTCOMES)[number],
    firedAt: item.firedAt ?? item.fireAt,
    answeredAt,
    targetDate: item.targetDate,
    leadDays,
    note,
    wasNews,
    dismissReason,
  }).onConflictDoNothing({ target: [promptOutcome.promptId, promptOutcome.userId] });
  revalidatePath("/visit");
  revalidatePath("/oversight/triggers");
}

/**
 * A2/REQ-056: create an anticipation exclusion. Anyone can REQUEST one
 * (requested_by records who), but approval is corporate only, always —
 * this action IS the approval, so corporate_admin is the gate. Audited.
 */
export async function createAnticipationExclusion(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) refuse(null, "bad-input");
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") refuse(householdId, "forbidden"); // approval is corporate only, always
  const SCOPES = ["rule", "topic", "person", "field", "all"];
  const REQUESTERS = ["client", "house_manager", "corporate"];
  const scope = String(formData.get("scope") ?? "");
  const target = String(formData.get("target") ?? "").trim().slice(0, 200);
  const requestedBy = String(formData.get("requestedBy") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null; // s2
  if (!SCOPES.includes(scope) || !REQUESTERS.includes(requestedBy)) refuse(householdId, "bad-input");
  if (scope !== "all" && target.length < 2) refuse(householdId, "bad-input"); // an empty target excludes nothing
  const { anticipationExclusion } = await import("@wellkept/schema");
  const id = randomUUID();
  await db.insert(anticipationExclusion).values({
    id, householdId, scope, target, reason, requestedBy,
    approvedBy: principal.userId, effectiveFrom: new Date(),
  });
  // G-59: a person-scoped exclusion's target is a person's name in free
  // text; the audit row carries a token for it, never the name. Other
  // scopes (rule ids, topic tags, field refs) are not personal and keep
  // the plaintext target, which the trail needs to stay useful.
  const auditTarget = scope === "person"
    ? { subjectToken: await mintAuditSubjectToken(householdId, "person_ref", target) }
    : { target };
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "exclusion_created", detail: { exclusionId: id, scope, requestedBy, ...auditTarget },
  });
  revalidatePath(`/oversight/${householdId}`);
  revalidatePath("/visit");
}

/**
 * The incident & complaint register (LAUNCH §3): log a client complaint, a
 * breakage, an injury, or a near-miss. Field roles can log (they witness
 * incidents in the home); corporate logs what arrives by call or email.
 * Append-only in spirit: no edit path — corrections are new incidents or
 * the resolution note. Audited.
 */
export async function createIncident(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) refuse(null, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuse(householdId, "forbidden");
  const KINDS = ["complaint", "breakage", "injury", "near_miss", "other"] as const;
  const SEVERITIES = ["low", "medium", "high"];
  const VIA = ["client_call", "client_email", "hm_visit", "corporate", "other"];
  const kind = String(formData.get("kind") ?? "");
  const severity = String(formData.get("severity") ?? "");
  const reportedVia = String(formData.get("reportedVia") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const occurredRaw = String(formData.get("occurredAt") ?? "");
  const occurredAt = new Date(occurredRaw);
  if (!(KINDS as readonly string[]).includes(kind) || !SEVERITIES.includes(severity) || !VIA.includes(reportedVia)) refuse(householdId, "bad-input");
  if (!description || !occurredRaw || Number.isNaN(occurredAt.getTime())) refuse(householdId, "bad-input");
  if (occurredAt.getTime() > Date.now()) refuse(householdId, "bad-input"); // an incident is a fact, not a forecast
  const { incidentReport } = await import("@wellkept/schema");
  const id = randomUUID();
  await db.insert(incidentReport).values({
    id, householdId, kind: kind as (typeof KINDS)[number], severity, occurredAt,
    reportedBy: principal.userId, reportedVia, description,
  });
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "incident_logged", detail: { incidentId: id, incidentKind: kind, severity, reportedVia },
  });
  revalidatePath(`/oversight/${householdId}`);
  revalidatePath("/oversight");
  recordedTo(`/oversight/${householdId}`, `${kind.replace(/_/g, " ")} incident (open)`);
}

/** Resolving stamps the note and closer; the row itself never changes. */
export async function resolveIncident(formData: FormData) {
  const incidentId = String(formData.get("incidentId") ?? "");
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim().slice(0, 2000);
  if (!incidentId || !resolutionNote) refuse(null, "bad-input"); // a resolution needs the outcome named
  const { incidentReport } = await import("@wellkept/schema");
  const [inc] = await db.select().from(incidentReport).where(eq(incidentReport.id, incidentId));
  if (!inc) refuse(null, "missing");
  if (inc.status !== "open") refuse(inc.householdId, "not-pending");
  const principal = await getPrincipal(inc.householdId);
  if (principal?.role !== "corporate_admin") refuse(inc.householdId, "forbidden"); // closing is a corporate call
  // Session B: the back-link question, answered by the resolver or left
  // blank (skippable — founder decision 2026-07-27). NEVER inferred: an
  // inferred link would manufacture a false-negative stream out of guesses.
  const PREVENTABLE = ["fired_and_ignored", "fired_too_late", "no_prompt_existed", "not_preventable", "unclear"] as const;
  const preventableRaw = String(formData.get("preventableByPrompt") ?? "");
  const preventableByPrompt = (PREVENTABLE as readonly string[]).includes(preventableRaw)
    ? (preventableRaw as (typeof PREVENTABLE)[number]) : null;
  const ruleIdRaw = String(formData.get("relatedRuleId") ?? "");
  const relatedRuleId = /^[0-9a-f-]{36}$/i.test(ruleIdRaw) ? ruleIdRaw : null;
  await db.update(incidentReport)
    .set({
      status: "resolved", resolutionNote, resolvedBy: principal.userId, resolvedAt: new Date(), updatedAt: new Date(),
      preventableByPrompt, relatedRuleId,
    })
    .where(eq(incidentReport.id, incidentId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: inc.householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "incident_resolved", detail: { incidentId, incidentKind: inc.kind, preventableByPrompt },
  });
  revalidatePath(`/oversight/${inc.householdId}`);
  revalidatePath("/oversight");
}

/**
 * Photo lifecycle: toggle a retention hold. A held photo is exempt from the
 * rolling purge until released (open incident or dispute). Audited. A photo
 * already purged can't be held — there is nothing left to hold.
 */
export async function setPhotoRetentionHold(formData: FormData) {
  const photoId = String(formData.get("photoId") ?? "");
  const hold = String(formData.get("hold") ?? "") === "true";
  if (!photoId) refuse(null, "bad-input");
  const { visitPhoto } = await import("@wellkept/schema");
  const [p] = await db.select({ id: visitPhoto.id, householdId: visitPhoto.householdId, purgedAt: visitPhoto.purgedAt })
    .from(visitPhoto).where(eq(visitPhoto.id, photoId));
  if (!p) refuse(null, "missing");
  if (p.purgedAt) refuse(p.householdId, "not-pending");
  const principal = await getPrincipal(p.householdId);
  if (principal?.role !== "corporate_admin") refuse(p.householdId, "forbidden");
  await db.update(visitPhoto).set({ retentionHold: hold }).where(eq(visitPhoto.id, photoId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: p.householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "photo_hold_change", detail: { photoId, hold },
  });
  revalidatePath(`/oversight/${p.householdId}`);
}

/**
 * REQ-006 media-reuse flag: corporate_admin marks a photo reusable beyond
 * the service record (or revokes it). Fails closed on NDA households —
 * their media is never reusable, and the rule lives here, not in the UI.
 * Audited.
 */
export async function setPhotoReuseAllowed(formData: FormData) {
  const photoId = String(formData.get("photoId") ?? "");
  const allow = String(formData.get("allow") ?? "") === "true";
  if (!photoId) refuse(null, "bad-input");
  const { visitPhoto } = await import("@wellkept/schema");
  const [p] = await db.select({ id: visitPhoto.id, householdId: visitPhoto.householdId, purgedAt: visitPhoto.purgedAt })
    .from(visitPhoto).where(eq(visitPhoto.id, photoId));
  if (!p) refuse(null, "missing");
  if (p.purgedAt) refuse(p.householdId, "not-pending"); // nothing reusable about a purged photo
  const principal = await getPrincipal(p.householdId);
  if (principal?.role !== "corporate_admin") refuse(p.householdId, "forbidden");
  if (allow) {
    const [hh] = await db.select({ isNda: household.isNda }).from(household).where(eq(household.id, p.householdId));
    if (!hh) refuse(p.householdId, "missing");
    if (hh.isNda) refuse(p.householdId, "gate-unmet"); // NDA household media is never reusable
  }
  await db.update(visitPhoto).set({ reuseAllowed: allow }).where(eq(visitPhoto.id, photoId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: p.householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "photo_reuse_change", detail: { photoId, reuseAllowed: allow },
  });
  revalidatePath(`/oversight/${p.householdId}`);
}

/** Ending an exclusion sets effective_to — nothing hard-deletes. Audited. */
export async function endAnticipationExclusion(formData: FormData) {
  const exclusionId = String(formData.get("exclusionId") ?? "");
  if (!exclusionId) refuse(null, "bad-input");
  const { anticipationExclusion } = await import("@wellkept/schema");
  const [x] = await db.select().from(anticipationExclusion).where(eq(anticipationExclusion.id, exclusionId));
  if (!x) refuse(null, "missing");
  if (x.effectiveTo) refuse(x.householdId, "not-pending");
  const principal = await getPrincipal(x.householdId);
  if (principal?.role !== "corporate_admin") refuse(x.householdId, "forbidden");
  await db.update(anticipationExclusion).set({ effectiveTo: new Date() }).where(eq(anticipationExclusion.id, exclusionId));
  // G-59: same tokenization as exclusion_created - the ended row's target
  // is a person's name when scope is person, and the trail must not hold
  // it. A fresh token per event, per ADR-006 (dedupe would be linkage).
  const endedTarget = x.scope === "person"
    ? { subjectToken: await mintAuditSubjectToken(x.householdId, "person_ref", x.target) }
    : { target: x.target };
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: x.householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "exclusion_ended", detail: { exclusionId, scope: x.scope, ...endedTarget },
  });
  revalidatePath(`/oversight/${x.householdId}`);
  revalidatePath("/visit");
}

export async function createTriggerRule(formData: FormData) {
  const anchorHouseholdId = String(formData.get("anchorHouseholdId") ?? "");
  if (!anchorHouseholdId) refuseTo("/oversight/triggers", "bad-input");
  const principal = await getPrincipal(anchorHouseholdId);
  if (principal?.role !== "corporate_admin") refuseTo("/oversight/triggers", "forbidden"); // fail closed

  const { provisionIdSchema } = await import("@wellkept/schema");
  const FAMILIES = ["roster_age", "calendar", "threshold", "signal", "relationship", "external"];
  const family = String(formData.get("family") ?? "");
  const bindsToFieldName = String(formData.get("bindsToFieldName") ?? "").trim();
  const packName = String(formData.get("packName") ?? "").trim();
  // items arrive one per line: offsetDays | text | optional provision id.
  // Validated fail-closed before anything reaches the engine: bounded
  // offsets, real provision ids only, no em dashes in prompt text (DEV-005).
  const items: { offsetDays: number; text: string; methodRef?: string }[] = [];
  for (const line of String(formData.get("items") ?? "").split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [days, text, ref] = line.split("|").map((p) => p.trim());
    const offsetDays = Number(days);
    if (!Number.isInteger(offsetDays) || offsetDays < 0 || offsetDays > 365) refuseTo("/oversight/triggers", "bad-input");
    if (!text || text.length < 8 || text.includes("\u2014")) refuseTo("/oversight/triggers", "bad-input");
    if (ref && !provisionIdSchema.safeParse(ref).success) refuseTo("/oversight/triggers", "bad-input");
    items.push({ offsetDays, text, ...(ref ? { methodRef: ref } : {}) });
  }
  if (!FAMILIES.includes(family)) refuseTo("/oversight/triggers", "bad-input");
  if (bindsToFieldName.length < 2 || packName.length < 2 || !/^[a-z0-9-]+$/.test(packName)) refuseTo("/oversight/triggers", "bad-input");
  if (items.length < 1 || items.length > 10) refuseTo("/oversight/triggers", "bad-input");

  const { triggerRule } = await import("@wellkept/schema");
  const ruleId = randomUUID();
  await db.insert(triggerRule).values({
    id: ruleId, householdId: null, family, bindsToFieldName, enabled: true,
    // M: the key is minted from the authored name ONCE, here; any later
    // display rename touches packName only and exclusion matching holds.
    definition: { packName, packKey: packName, items },
  });
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: anchorHouseholdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "trigger_rule_change", detail: { ruleId, created: true, packName },
  });
  revalidatePath("/oversight/triggers");
}

/**
 * Capture session 1: an after-the-fact categorized time entry (founder
 * decision 2026-07-27: no live clock at pilot scale). Field roles log
 * their own time on their household; corporate can log too (intake and
 * admin time are often theirs). ADR-004 holds: this records hours, never
 * pay — no rates, no overtime, nothing payroll-shaped.
 */
export async function createTimeEntry(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  // G-29 completion: this action submits from TWO surfaces (/visit and the
  // drill-in), so its verdicts - refusal AND success - must land on the
  // page the operator is standing on. returnTo is allowlisted, never
  // trusted raw: an HM's refusal must not strand them on a corporate URL.
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const category = String(formData.get("category") ?? "");
  const CATEGORIES = ["delivery", "travel", "intake", "admin", "training"] as const;
  if (!householdId || !(CATEGORIES as readonly string[]).includes(category)) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const start = new Date(String(formData.get("startedAt") ?? ""));
  const end = new Date(String(formData.get("endedAt") ?? ""));
  if (Number.isNaN(+start) || Number.isNaN(+end) || +end <= +start) refuseTo(returnTo, "bad-input");
  const minutes = Math.round((+end - +start) / 60_000);
  if (minutes > 24 * 60) refuseTo(returnTo, "bad-input"); // an entry over a day is a typo, not a shift
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null; // s2
  const { timeEntry } = await import("@wellkept/schema");
  await db.insert(timeEntry).values({
    id: randomUUID(), householdId, userId: principal.userId,
    category: category as (typeof CATEGORIES)[number],
    startedAt: start, endedAt: end, minutes, source: "manual", note,
  });
  revalidatePath(`/oversight/${householdId}`);
  revalidatePath("/visit");
  recordedTo(returnTo, `${category} time, ${minutes} min`);
}

/**
 * Capture session 2: a non-labor cost against a household. Founder
 * decisions 2026-07-27: categories supplies|materials|mileage|other,
 * mileage entered (miles field), never derived from travel time.
 * QuickBooks stays the book of record — this is capture, not accounting.
 */
export async function createCostEntry(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const category = String(formData.get("category") ?? "");
  const CATEGORIES = ["supplies", "materials", "mileage", "other"] as const;
  if (!householdId || !(CATEGORIES as readonly string[]).includes(category)) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  // Money in integer cents (DEV-004 S3); accept "12.50" style input.
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) refuseTo(returnTo, "bad-input");
  const amountCents = Math.round(amount * 100);
  const incurredOn = String(formData.get("incurredOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incurredOn)) refuseTo(returnTo, "bad-input");
  const milesRaw = String(formData.get("miles") ?? "").trim();
  const miles = category === "mileage" && /^\d{1,4}$/.test(milesRaw) ? Number.parseInt(milesRaw, 10) : null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null; // s2
  const { costEntry } = await import("@wellkept/schema");
  await db.insert(costEntry).values({
    id: randomUUID(), householdId, category: category as (typeof CATEGORIES)[number],
    amountCents, incurredOn, recordedBy: principal.userId, miles, note,
  });
  revalidatePath(`/oversight/${householdId}`);
  revalidatePath("/visit");
  recordedTo(returnTo, `${category} cost, $${(amountCents / 100).toFixed(2)}`);
}

/**
 * Capture session 3: the referral channel, recorded once per household
 * (corrections re-record; the audit trail keeps the prior value). Founder
 * taxonomy 2026-07-27. Corporate only - this is commercial data.
 */
export async function setReferralSource(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const source = String(formData.get("referralSource") ?? "");
  const SOURCES = ["client_referral", "professional_referral", "personal_network", "community", "press_or_search", "other"] as const;
  if (!householdId) refuse(null, "bad-input");
  if (!(SOURCES as readonly string[]).includes(source)) refuse(householdId, "bad-input");
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") refuse(householdId, "forbidden");
  const [prior] = await db.select().from(household).where(eq(household.id, householdId));
  if (!prior) refuse(null, "missing");
  const note = String(formData.get("referralNote") ?? "").trim().slice(0, 300) || null; // s2
  await db.update(household)
    .set({ referralSource: source as (typeof SOURCES)[number], referralNote: note, updatedAt: new Date() })
    .where(eq(household.id, householdId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "referral_recorded", detail: { from: prior.referralSource, to: source },
  });
  revalidatePath(`/oversight/${householdId}`);
  redirect(`/oversight/${householdId}?recorded=${encodeURIComponent("referral source")}`);
}

/**
 * Capture session 3: a membership state change as an append-only event.
 * The brief's done-when is enforced here: a cancellation REQUIRES a reason
 * and an initiator. Price in integer cents; tier only meaningful on start
 * and tier_change. ADR-004: records that state changed, never that money
 * moved - QuickBooks bills.
 */
export async function recordMembershipEvent(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const KINDS = ["start", "tier_change", "pause", "resume", "cancel"] as const;
  if (!householdId) refuse(null, "bad-input");
  if (!(KINDS as readonly string[]).includes(kind)) refuse(householdId, "bad-input");
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") refuse(householdId, "forbidden");
  const effectiveOn = String(formData.get("effectiveOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveOn)) refuse(householdId, "bad-input");
  const TIERS = ["essential", "family_ops", "concierge"] as const;
  const tierRaw = String(formData.get("tier") ?? "");
  const tier = (TIERS as readonly string[]).includes(tierRaw) ? (tierRaw as (typeof TIERS)[number]) : null;
  if ((kind === "start" || kind === "tier_change") && !tier) refuse(householdId, "bad-input");
  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = Number.parseFloat(priceRaw);
  const priceCents = Number.isFinite(price) && price > 0 && price <= 1_000_000 ? Math.round(price * 100) : null;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null; // s2
  const initiatedByRaw = String(formData.get("initiatedBy") ?? "");
  const initiatedBy = ["client", "corporate"].includes(initiatedByRaw) ? initiatedByRaw : null;
  // The done-when: cancellations carry a reason, an initiator, and (REQ-083,
  // taxonomy v1 adopted 24 Aug 2026 evening) a structured cause code;
  // other_documented leans on the reason it already requires. Refused
  // visibly, not silently - G-29 applies to new actions too.
  const CAUSES = ["relocated", "ended_by_member", "ended_by_company", "financial", "life_event", "other_documented"] as const;
  const causeRaw = String(formData.get("causeCode") ?? "");
  const causeCode = (CAUSES as readonly string[]).includes(causeRaw) ? (causeRaw as (typeof CAUSES)[number]) : null;
  if (kind === "cancel" && (!reason || !initiatedBy || !causeCode)) refuse(householdId, "gate-unmet");
  const { membershipEvent } = await import("@wellkept/schema");
  // One transaction: an audit row without its event (or vice versa) must be
  // impossible. And success is now as legible as refusal (the 2026-07-27
  // lesson, round two): redirect with ?recorded= so the page SAYS it landed
  // - no green banner, no write, no ambiguity.
  //
  // AQ (1 August 2026): household.tier is read directly by the fleet board
  // and elsewhere, but until now nothing kept it in sync with this event
  // log - a tier_change wrote history and left the denormalised column
  // stale. Kept in the same transaction as the event it tracks, same
  // reasoning as the audit row: the two must never be able to disagree.
  await db.transaction(async (tx) => {
    const eventId = randomUUID();
    await tx.insert(membershipEvent).values({
      id: eventId, householdId, kind: kind as (typeof KINDS)[number],
      effectiveOn, tier, priceCents, reason, initiatedBy, causeCode, recordedBy: principal.userId,
    });
    // REQ-083: a departure is a covenant event. Same transaction as the
    // membership row, same posture as visit.arrival/departure; the payload
    // carries the code and the ids, never a person and never the reason
    // text (which is s2 and stays on the membership row).
    if (kind === "cancel" && causeCode) {
      await emitOutboxEvent(tx, {
        householdId, kind: "household.departure",
        payload: { membershipEventId: eventId, causeCode, effectiveOn },
        occurredAt: new Date(`${effectiveOn}T12:00:00Z`),
        provenance: "action:recordMembershipEvent", objectId: eventId,
        actor: principal.userId, correlationId: eventId,
      });
    }
    if (tier) {
      await tx.update(household).set({ tier, updatedAt: new Date() }).where(eq(household.id, householdId));
    }
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "membership_event", detail: { eventKind: kind, effectiveOn, tier, initiatedBy },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  redirect(`/oversight/${householdId}?recorded=${encodeURIComponent(`membership ${kind}`)}`);
}

/**
 * G-49 (intake-capture review §2): one look at one object. Condition is
 * the rubric's 1-5 scale; fill level is percent 0-100. Repeated rows are
 * the point - the series is the record, so this never updates, only
 * inserts. Staff surfaces only (the series is s2 by nature); refusals and
 * successes are legible per G-29/G-39.
 */
export async function recordObjectObservation(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const registryEntryId = String(formData.get("registryEntryId") ?? "");
  const measure = String(formData.get("measure") ?? "");
  const MEASURES = ["condition", "fill_level"] as const;
  if (!householdId || !/^[0-9a-f-]{36}$/i.test(registryEntryId)) refuseTo(returnTo, "bad-input");
  if (!(MEASURES as readonly string[]).includes(measure)) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = /^\d{1,3}$/.test(valueRaw) ? Number.parseInt(valueRaw, 10) : NaN;
  const inRange = measure === "condition" ? value >= 1 && value <= 5 : value >= 0 && value <= 100;
  if (!Number.isFinite(value) || !inRange) refuseTo(returnTo, "bad-input");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null; // s2
  const { objectObservation, registryEntry } = await import("@wellkept/schema");
  const { isNull } = await import("drizzle-orm");
  // The object must be this household's own live registry entry - an
  // observation against a tombstoned or foreign entry is a bad request,
  // not a write.
  const [entry] = await db.select({ id: registryEntry.id, label: registryEntry.label })
    .from(registryEntry)
    .where(and(eq(registryEntry.id, registryEntryId), eq(registryEntry.householdId, householdId), isNull(registryEntry.tombstonedAt)))
    .limit(1);
  if (!entry) refuseTo(returnTo, "missing");
  await db.insert(objectObservation).values({
    id: randomUUID(), householdId, registryEntryId, measure: measure as (typeof MEASURES)[number],
    value, note, observedAt: new Date(), recordedBy: principal.userId,
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `${measure === "condition" ? "condition" : "fill"} ${value}${measure === "fill_level" ? "%" : "/5"}: ${entry.label}`);
}

/**
 * W-1 (WORK_QUEUE): correct a wrong observation by superseding it, never
 * deleting it. The row stays with who corrected it and when; every read
 * that feeds a display or derivation excludes superseded rows. The audit
 * posture differs from events on purpose: an event happened, an
 * observation is a claim about the world, and a claim can be wrong.
 */
export async function supersedeObjectObservation(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const observationId = String(formData.get("observationId") ?? "");
  if (!householdId || !/^[0-9a-f-]{36}$/i.test(observationId)) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const { objectObservation } = await import("@wellkept/schema");
  const { isNull } = await import("drizzle-orm");
  const [row] = await db.select({ id: objectObservation.id, value: objectObservation.value, measure: objectObservation.measure })
    .from(objectObservation)
    .where(and(eq(objectObservation.id, observationId), eq(objectObservation.householdId, householdId), isNull(objectObservation.supersededAt)))
    .limit(1);
  if (!row) refuseTo(returnTo, "missing"); // absent, foreign, or already superseded
  await db.update(objectObservation)
    .set({ supersededAt: new Date(), supersededBy: principal.userId, updatedAt: new Date() })
    .where(eq(objectObservation.id, observationId));
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `superseded ${row.measure === "condition" ? "condition" : "fill"} ${row.value} (row kept, excluded from the series)`);
}

/**
 * W-5 (STD-016 S5): raise a condition flag. The revisit trigger (a date or
 * a stated condition) is required here AND by the database CHECK - the
 * standard's strongest sentence, enforced twice. An optional registry
 * reference links the flag to an existing series; without one the flag
 * stands on its own subject and location (the standard's caulk example).
 * Staff surfaces only; the concern is s2 by nature.
 */
export async function createConditionFlag(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 120);
  const location = String(formData.get("location") ?? "").trim().slice(0, 120);
  const concern = String(formData.get("concern") ?? "").trim().slice(0, 500);
  const revisitDateRaw = String(formData.get("revisitDate") ?? "").trim();
  const revisitCondition = String(formData.get("revisitCondition") ?? "").trim().slice(0, 200) || null;
  const registryEntryId = String(formData.get("registryEntryId") ?? "").trim();
  if (!householdId || subject.length < 2 || location.length < 2 || concern.length < 4) refuseTo(returnTo, "bad-input");
  if ([subject, location, concern, revisitCondition ?? ""].some((s) => s.includes("\u2014"))) refuseTo(returnTo, "bad-input");
  const revisitDate = /^\d{4}-\d{2}-\d{2}$/.test(revisitDateRaw) ? revisitDateRaw : null;
  // A flag without a revisit trigger is worse than no flag (STD-016).
  if (!revisitDate && !revisitCondition) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const { conditionFlag, registryEntry } = await import("@wellkept/schema");
  let entryId: string | null = null;
  if (registryEntryId) {
    if (!/^[0-9a-f-]{36}$/i.test(registryEntryId)) refuseTo(returnTo, "bad-input");
    const { isNull } = await import("drizzle-orm");
    const [entry] = await db.select({ id: registryEntry.id }).from(registryEntry)
      .where(and(eq(registryEntry.id, registryEntryId), eq(registryEntry.householdId, householdId), isNull(registryEntry.tombstonedAt)))
      .limit(1);
    if (!entry) refuseTo(returnTo, "missing");
    entryId = registryEntryId;
  }
  await db.insert(conditionFlag).values({
    id: randomUUID(), householdId, registryEntryId: entryId, subject, location, concern,
    raisedBy: principal.userId, raisedAt: new Date(), revisitDate, revisitCondition,
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `flagged: ${subject} (${location})`);
}

/**
 * W-5: one look at a flagged condition. Lands in object_observation so the
 * flag's series and (when the flag references an object) the object's
 * series are the same series. Condition only: promotion is rate math and
 * a rate needs numbers.
 */
export async function recordFlagLook(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const flagId = String(formData.get("flagId") ?? "");
  if (!householdId || !/^[0-9a-f-]{36}$/i.test(flagId)) refuseTo(returnTo, "bad-input");
  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = /^\d$/.test(valueRaw) ? Number.parseInt(valueRaw, 10) : NaN;
  if (!Number.isFinite(value) || value < 1 || value > 5) refuseTo(returnTo, "bad-input");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null; // s2
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const { conditionFlag, objectObservation } = await import("@wellkept/schema");
  const [flag] = await db.select({ id: conditionFlag.id, registryEntryId: conditionFlag.registryEntryId, subject: conditionFlag.subject })
    .from(conditionFlag)
    .where(and(eq(conditionFlag.id, flagId), eq(conditionFlag.householdId, householdId), eq(conditionFlag.status, "open")))
    .limit(1);
  if (!flag) refuseTo(returnTo, "missing"); // absent, foreign, or closed
  await db.insert(objectObservation).values({
    id: randomUUID(), householdId, registryEntryId: flag.registryEntryId, conditionFlagId: flag.id,
    measure: "condition", value, note, observedAt: new Date(), recordedBy: principal.userId,
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `condition ${value}/5: ${flag.subject}`);
}

/**
 * AB (W-6 follow-on): a deferral resolves - done, no longer needed, or
 * superseded - by whom and when, never by deletion. The resolved story
 * stays on the client's card ("noticed in March, fixed in May"), which
 * is the attention the feature exists to demonstrate. The
 * resolution_is_whole CHECK backs this at the database.
 */
export async function resolveDeferral(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const deferralId = String(formData.get("deferralId") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  const RESOLUTIONS = ["done", "no_longer_needed", "superseded"] as const;
  if (!householdId || !/^[0-9a-f-]{36}$/i.test(deferralId)) refuseTo(returnTo, "bad-input");
  if (!(RESOLUTIONS as readonly string[]).includes(resolution)) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const { deferral } = await import("@wellkept/schema");
  const { isNull } = await import("drizzle-orm");
  const [row] = await db.select({ id: deferral.id, noticed: deferral.noticed }).from(deferral)
    .where(and(eq(deferral.id, deferralId), eq(deferral.householdId, householdId), isNull(deferral.resolvedAt)))
    .limit(1);
  if (!row) refuseTo(returnTo, "missing"); // absent, foreign, or already resolved
  await db.update(deferral)
    .set({ resolution: resolution as (typeof RESOLUTIONS)[number], resolvedAt: new Date(), resolvedBy: principal.userId, updatedAt: new Date() })
    .where(eq(deferral.id, deferralId));
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `deferral resolved (${resolution.replace(/_/g, " ")}): ${row.noticed}`);
}

/**
 * AD (W-7): a paused decision - research done and then paused, logged
 * with its own revisit trigger so it is not lost to time. INTERNAL,
 * unlike a deferral: the client never sees it, so the capture labels
 * invite working notes rather than client-readable prose. The timing is
 * required here and by the database CHECK, the same structural sentence
 * as the flag and the deferral.
 */
export async function createPausedDecision(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const decision = String(formData.get("decision") ?? "").trim().slice(0, 200);
  const research = String(formData.get("research") ?? "").trim().slice(0, 1000);
  const revisitDateRaw = String(formData.get("revisitDate") ?? "").trim();
  const revisitCondition = String(formData.get("revisitCondition") ?? "").trim().slice(0, 200) || null;
  if (!householdId || decision.length < 4 || research.length < 4) refuseTo(returnTo, "bad-input");
  if ([decision, research, revisitCondition ?? ""].some((s) => s.includes("\u2014"))) refuseTo(returnTo, "bad-input");
  const revisitDate = /^\d{4}-\d{2}-\d{2}$/.test(revisitDateRaw) ? revisitDateRaw : null;
  if (!revisitDate && !revisitCondition) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const { pausedDecision } = await import("@wellkept/schema");
  await db.insert(pausedDecision).values({
    id: randomUUID(), householdId, decision, research, revisitDate, revisitCondition,
    pausedBy: principal.userId, pausedAt: new Date(),
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `paused, with the research on record: ${decision}`);
}

/**
 * AD (W-7): a paused decision resolves the same three ways a deferral
 * does - done, no longer needed, or superseded - by whom and when, never
 * by deletion. The resolution_is_whole CHECK backs this at the database.
 * Nothing resolves automatically when the revisit arrives: the briefing
 * shows it, a person decides (the Misses-panel posture).
 */
export async function resolvePausedDecision(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const pausedDecisionId = String(formData.get("pausedDecisionId") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  const RESOLUTIONS = ["done", "no_longer_needed", "superseded"] as const;
  if (!householdId || !/^[0-9a-f-]{36}$/i.test(pausedDecisionId)) refuseTo(returnTo, "bad-input");
  if (!(RESOLUTIONS as readonly string[]).includes(resolution)) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const { pausedDecision } = await import("@wellkept/schema");
  const { isNull } = await import("drizzle-orm");
  const [row] = await db.select({ id: pausedDecision.id, decision: pausedDecision.decision }).from(pausedDecision)
    .where(and(eq(pausedDecision.id, pausedDecisionId), eq(pausedDecision.householdId, householdId), isNull(pausedDecision.resolvedAt)))
    .limit(1);
  if (!row) refuseTo(returnTo, "missing"); // absent, foreign, or already resolved
  await db.update(pausedDecision)
    .set({ resolution: resolution as (typeof RESOLUTIONS)[number], resolvedAt: new Date(), resolvedBy: principal.userId, updatedAt: new Date() })
    .where(eq(pausedDecision.id, pausedDecisionId));
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `decision resolved (${resolution.replace(/_/g, " ")}): ${row.decision}`);
}

/**
 * W-5: resolution is a state change with a reason and who closed it,
 * never a delete. The close_is_reasoned CHECK backs this at the database.
 */
export async function closeConditionFlag(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  const flagId = String(formData.get("flagId") ?? "");
  const closeReason = String(formData.get("closeReason") ?? "").trim().slice(0, 300);
  if (!householdId || !/^[0-9a-f-]{36}$/i.test(flagId) || closeReason.length < 4) refuseTo(returnTo, "bad-input");
  if (closeReason.includes("\u2014")) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const { conditionFlag } = await import("@wellkept/schema");
  const [flag] = await db.select({ id: conditionFlag.id, subject: conditionFlag.subject }).from(conditionFlag)
    .where(and(eq(conditionFlag.id, flagId), eq(conditionFlag.householdId, householdId), eq(conditionFlag.status, "open")))
    .limit(1);
  if (!flag) refuseTo(returnTo, "missing");
  await db.update(conditionFlag)
    .set({ status: "closed", closedAt: new Date(), closedBy: principal.userId, closeReason, updatedAt: new Date() })
    .where(eq(conditionFlag.id, flagId));
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `flag closed: ${flag.subject}`);
}

/**
 * WK-DEV-007 section 3, the measurement loop: the founder scores a shadow
 * signal true_signal / noise / unknowable, and per-trigger precision
 * accumulates from these rows. The log is visible to founder, CFO, and
 * the developer; SCORING is the founder's, so corporate_admin only (the
 * CFO reads, never writes). A correction is a re-record, the consent
 * pattern: the audit row keeps the prior score.
 */
export async function scoreShadowSignal(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) refuse(null, "bad-input");
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") refuse(householdId, "forbidden"); // fail closed
  const id = String(formData.get("shadowLogId") ?? "");
  const score = String(formData.get("score") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) refuse(householdId, "bad-input");
  if (!["true_signal", "noise", "unknowable"].includes(score)) refuse(householdId, "bad-input");
  const [row] = await db.select().from(shadowLog).where(eq(shadowLog.id, id));
  if (!row || row.householdId !== householdId) refuse(householdId, "missing");
  await db.update(shadowLog)
    .set({ score: score as "true_signal" | "noise" | "unknowable", scoredBy: principal.userId, scoredAt: new Date(), updatedAt: new Date() })
    .where(eq(shadowLog.id, id));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "shadow_scored",
    detail: {
      shadowLogId: id, triggerKey: row.triggerKey, score,
      prior: row.score ? { score: row.score, scoredAt: row.scoredAt?.toISOString() } : null,
    },
  });
  revalidatePath(`/oversight/${householdId}`);
}

/**
 * RFC-PRIM-01 build 1: the WorkItem primitive's service layer. Every
 * mutation through the permission wrapper, every write audited, the
 * lifecycle facts on the outbox (work_item.opened / work_item.resolved,
 * ids and vocabulary only; the title and notes are s2 and stay on the
 * row). Field and corporate roles create and progress; clients never
 * touch it (no client projection exists, held by the payload guard).
 */
const WORK_ROLES = ["house_manager", "backup_hm", "corporate_admin", "corporate_ops"] as const;

export async function createWorkItem(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !(WORK_ROLES as readonly string[]).includes(principal.role)) refuseTo(returnTo, "forbidden");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 1000);
  const kind = String(formData.get("kind") ?? "");
  if (title.length < 4) refuseTo(returnTo, "bad-input");
  if (!["vendor", "followup", "runway", "internal"].includes(kind)) refuseTo(returnTo, "bad-input");
  const dueRaw = String(formData.get("dueDate") ?? "");
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;
  const windowCondition = String(formData.get("windowCondition") ?? "").trim().slice(0, 200) || null;
  const source = principal.role.startsWith("corporate") ? "corporate" : "hm_capture";
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(workItem).values({
      id, householdId, title, detail, kind, source,
      ownerId: principal.userId, dueDate, windowCondition,
    });
    await emitOutboxEvent(tx, {
      householdId, kind: "work_item.opened",
      payload: { workItemId: id, kind, source },
      provenance: "action:createWorkItem", objectId: id, actor: principal.userId,
    });
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "work_item", detail: { workItemId: id, action: "opened", itemKind: kind },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, "work item opened");
}

export async function progressWorkItem(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !(WORK_ROLES as readonly string[]).includes(principal.role)) refuseTo(returnTo, "forbidden");
  const id = String(formData.get("workItemId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) refuseTo(returnTo, "bad-input");
  if (!["block", "reopen", "done", "abandoned"].includes(decision)) refuseTo(returnTo, "bad-input");
  const [row] = await db.select().from(workItem).where(eq(workItem.id, id));
  if (!row || row.householdId !== householdId) refuseTo(returnTo, "missing");
  if (row.status === "done" || row.status === "abandoned") refuseTo(returnTo, "bad-input"); // terminal is terminal
  const note = String(formData.get("note") ?? "").trim().slice(0, 400);
  // The done-when, checked BEFORE the transaction opens: a block carries
  // its reason, and completion carries its evidence, in words.
  if (decision !== "reopen" && note.length < 4) refuseTo(returnTo, "gate-unmet");
  await db.transaction(async (tx) => {
    if (decision === "block") {
      await tx.update(workItem).set({ status: "blocked", blockedReason: note, updatedAt: new Date() }).where(eq(workItem.id, id));
    } else if (decision === "reopen") {
      await tx.update(workItem).set({ status: "open", blockedReason: null, updatedAt: new Date() }).where(eq(workItem.id, id));
    } else {
      await tx.update(workItem).set({
        status: decision as "done" | "abandoned", blockedReason: null,
        resolution: note, resolvedAt: new Date(), resolvedBy: principal.userId, updatedAt: new Date(),
      }).where(eq(workItem.id, id));
      await emitOutboxEvent(tx, {
        householdId, kind: "work_item.resolved",
        payload: { workItemId: id, status: decision },
        provenance: "action:progressWorkItem", objectId: id, actor: principal.userId,
      });
    }
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "work_item", detail: { workItemId: id, action: decision },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `work item ${decision}`);
}

/**
 * RFC-PRIM-01 build 2: attention is acknowledged (I saw this) or
 * resolved (it is answered, in words), whole or absent both ways, both
 * audited. The record informs; resolving it changes NOTHING about the
 * source (the deferral or work item it points at resolves through its
 * own lifecycle) - this closes the noticing, not the work.
 */
export async function acknowledgeAttention(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !(WORK_ROLES as readonly string[]).includes(principal.role)) refuseTo(returnTo, "forbidden");
  const id = String(formData.get("attentionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) refuseTo(returnTo, "bad-input");
  const [row] = await db.select().from(attentionRecord).where(eq(attentionRecord.id, id));
  if (!row || row.householdId !== householdId) refuseTo(returnTo, "missing");
  if (row.acknowledgedAt) refuseTo(returnTo, "bad-input"); // already seen; nothing to re-say
  await db.transaction(async (tx) => {
    await tx.update(attentionRecord)
      .set({ acknowledgedAt: new Date(), acknowledgedBy: principal.userId, updatedAt: new Date() })
      .where(eq(attentionRecord.id, id));
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "attention_record", detail: { attentionRecordId: id, action: "acknowledged" },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, "attention acknowledged");
}

export async function resolveAttention(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !(WORK_ROLES as readonly string[]).includes(principal.role)) refuseTo(returnTo, "forbidden");
  const id = String(formData.get("attentionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) refuseTo(returnTo, "bad-input");
  const note = String(formData.get("note") ?? "").trim().slice(0, 400);
  if (note.length < 4) refuseTo(returnTo, "gate-unmet"); // answered, in words
  const [row] = await db.select().from(attentionRecord).where(eq(attentionRecord.id, id));
  if (!row || row.householdId !== householdId) refuseTo(returnTo, "missing");
  if (row.status === "resolved") refuseTo(returnTo, "bad-input");
  await db.transaction(async (tx) => {
    await tx.update(attentionRecord).set({
      status: "resolved", resolution: note, resolvedAt: new Date(), resolvedBy: principal.userId, updatedAt: new Date(),
    }).where(eq(attentionRecord.id, id));
    await emitOutboxEvent(tx, {
      householdId, kind: "attention_record.resolved",
      payload: { attentionRecordId: id, sourceKind: row.sourceKind },
      provenance: "action:resolveAttention", objectId: id, actor: principal.userId,
      correlationId: row.sourceId,
    });
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "attention_record", detail: { attentionRecordId: id, action: "resolved" },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, "attention resolved");
}

/**
 * RFC-PRIM-01 build 3: a genuine choice, routed and decided. The
 * single-consent rule is structural: this action takes EXACTLY ONE
 * decision per call and no batch path exists. Routing is corporate
 * (the engine joins later through the promotion path); deciding maps
 * the audience to roles. The client audience does not exist until the
 * client freeze lifts (WK-DEV-010 section 5 / WK-DEV-007 section 0).
 */
export async function routeDecision(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const question = String(formData.get("question") ?? "").trim().slice(0, 300);
  const recommendation = String(formData.get("recommendation") ?? "").trim().slice(0, 400);
  const alternativesRaw = String(formData.get("alternatives") ?? "").trim();
  const evidenceRaw = String(formData.get("evidence") ?? "").trim();
  const authorityClass = String(formData.get("authorityClass") ?? "");
  const audience = String(formData.get("audience") ?? "");
  if (question.length < 8 || recommendation.length < 4) refuseTo(returnTo, "bad-input");
  if (!["A0", "A1", "A2", "A3", "A4", "A5"].includes(authorityClass)) refuseTo(returnTo, "bad-input");
  if (!["hom", "corporate", "founder"].includes(audience)) refuseTo(returnTo, "bad-input");
  const alternatives = alternativesRaw ? alternativesRaw.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8) : [];
  const evidence = evidenceRaw ? evidenceRaw.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8) : [];
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(decisionRecord).values({
      id, householdId, question, recommendation, alternatives, evidence,
      authorityClass, audience, routedBy: principal.userId,
    });
    await emitOutboxEvent(tx, {
      householdId, kind: "decision_record.routed",
      payload: { decisionRecordId: id, audience, authorityClass },
      provenance: "action:routeDecision", objectId: id, actor: principal.userId,
    });
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "decision_record", detail: { decisionRecordId: id, action: "routed", audience },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, "decision routed");
}

const DECIDER_ROLES: Record<string, readonly string[]> = {
  hom: ["house_manager", "backup_hm", "corporate_admin"], // AJ option 2: the admin may cover field surfaces
  corporate: ["corporate_admin", "corporate_ops"],
  founder: ["corporate_admin"],
};

export async function decideDecision(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal) refuseTo(returnTo, "forbidden");
  const id = String(formData.get("decisionId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) refuseTo(returnTo, "bad-input");
  if (!["accepted", "declined"].includes(outcome)) refuseTo(returnTo, "bad-input");
  const [row] = await db.select().from(decisionRecord).where(eq(decisionRecord.id, id));
  if (!row || row.householdId !== householdId) refuseTo(returnTo, "missing");
  if (row.outcome || row.expiredAt) refuseTo(returnTo, "bad-input"); // decided is decided; expired is expired
  if (!(DECIDER_ROLES[row.audience] ?? []).includes(principal.role)) refuseTo(returnTo, "forbidden");
  const note = String(formData.get("note") ?? "").trim().slice(0, 400) || null;
  await db.transaction(async (tx) => {
    await tx.update(decisionRecord).set({
      outcome: outcome as "accepted" | "declined", outcomeNote: note,
      decidedAt: new Date(), decidedBy: principal.userId, updatedAt: new Date(),
    }).where(eq(decisionRecord.id, id));
    await emitOutboxEvent(tx, {
      householdId, kind: "decision_record.decided",
      payload: { decisionRecordId: id, outcome },
      provenance: "action:decideDecision", objectId: id, actor: principal.userId,
    });
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "decision_record", detail: { decisionRecordId: id, action: outcome },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `decision ${outcome}`);
}

/**
 * WK-DEV-009 section 8, the Tier D half: "Tell Well Kept". The HOM says
 * what they saw, once, in their own words; the system NEVER asks them
 * for the taxonomy. Until the Tier M gate opens, the router is a human:
 * every artifact lands in the corporate queue and filing is a person's
 * act (raise a work item, or dismiss with the reason in words). No
 * automatic keyword or severity routing exists in v1 by decision: a
 * severity vocabulary is a safety taxonomy, which no engineer picks.
 * Events carry ids only; the HOM's words are s2 and stay on the row.
 */
export async function tellWellKept(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !(WORK_ROLES as readonly string[]).includes(principal.role)) refuseTo(returnTo, "forbidden");
  const kind = String(formData.get("kind") ?? "text");
  // Only text is writable today: voice waits on the voice ruling's Tier M
  // transcription path; photo and scan wait on their capture surfaces.
  if (kind !== "text") refuseTo(returnTo, "gate-unmet");
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  if (content.length < 4) refuseTo(returnTo, "bad-input");
  const visitRaw = String(formData.get("visitCommandId") ?? "");
  const visitCommandId = /^[0-9a-f-]{36}$/i.test(visitRaw) ? visitRaw : null;
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(captureArtifact).values({
      id, householdId, kind: "text", content, capturedBy: principal.userId, visitCommandId,
    });
    await emitOutboxEvent(tx, {
      householdId, kind: "capture_artifact.created",
      payload: { captureArtifactId: id, kind: "text" },
      provenance: "action:tellWellKept", objectId: id, actor: principal.userId,
      correlationId: visitCommandId,
    });
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "capture_artifact", detail: { captureArtifactId: id, action: "captured" },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, "captured; we handle the filing");
}

export async function fileCaptureArtifact(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  // Filing is the human router's act: corporate only.
  if (!principal || !["corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const id = String(formData.get("captureArtifactId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) refuseTo(returnTo, "bad-input");
  if (!["work_item", "dismiss"].includes(decision)) refuseTo(returnTo, "bad-input");
  const [row] = await db.select().from(captureArtifact).where(eq(captureArtifact.id, id));
  if (!row || row.householdId !== householdId) refuseTo(returnTo, "missing");
  if (row.status !== "captured") refuseTo(returnTo, "bad-input"); // filed is filed
  const disposition = String(formData.get("disposition") ?? "").trim().slice(0, 400);
  // The gate, BEFORE the transaction opens: filing carries where it went,
  // and a dismissal carries why, in words.
  if (disposition.length < 4) refuseTo(returnTo, "gate-unmet");
  const now = new Date();
  await db.transaction(async (tx) => {
    let workItemId: string | null = null;
    if (decision === "work_item") {
      // The filed work item is the HOM's capture, and says so: source
      // hm_capture, titled from the HOM's words.
      workItemId = randomUUID();
      await tx.insert(workItem).values({
        id: workItemId, householdId, title: row.content.slice(0, 200),
        detail: `Filed from a Tell Well Kept capture. ${disposition}`.slice(0, 1000),
        kind: "followup", source: "hm_capture", ownerId: principal.userId,
      });
      await emitOutboxEvent(tx, {
        householdId, kind: "work_item.opened",
        payload: { workItemId, kind: "followup", source: "hm_capture" },
        occurredAt: now, provenance: "action:fileCaptureArtifact",
        objectId: workItemId, actor: principal.userId, correlationId: id,
      });
    }
    await tx.update(captureArtifact).set({
      status: decision === "work_item" ? "filed" : "dismissed",
      disposition, workItemId, filedAt: now, filedBy: principal.userId, updatedAt: now,
    }).where(eq(captureArtifact.id, id));
    await emitOutboxEvent(tx, {
      householdId, kind: "capture_artifact.filed",
      payload: { captureArtifactId: id, outcome: decision === "work_item" ? "filed" : "dismissed", workItemId },
      occurredAt: now, provenance: "action:fileCaptureArtifact",
      objectId: id, actor: principal.userId,
    });
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "capture_artifact", detail: { captureArtifactId: id, action: decision, workItemId },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, decision === "work_item" ? "capture filed as a work item" : "capture dismissed");
}

/**
 * WL Gate 1 opener: task definitions are GLOBAL reusable semantics
 * (never member data), authored by corporate only, and PROVISIONAL BY
 * STRUCTURE until the founder's Task Inventory ruling: this action can
 * only create provisional rows, and nothing in the app can flip one;
 * the future Inventory loader flips provisional off by writing the
 * canonical id in the same statement, which the database CHECK demands.
 * Global rows have no household, so no outbox event (the outbox routes
 * on household_id) and no household audit row; the provision posture.
 */
export async function createTaskDefinition(formData: FormData) {
  const returnTo = "/oversight/tasks";
  // Global object, so no per-household principal: the author is the
  // signed-in user's corporate_admin assignment, whichever household
  // carries it (REQ-001: roles are always assignment rows, never a
  // wildcard; holding admin anywhere is the authoring credential for
  // global semantics, the standards-store posture).
  const { getSessionUser } = await import("./session");
  const { getAssignedHouseholds } = await import("./data");
  const user = await getSessionUser();
  const assigned = await getAssignedHouseholds();
  if (!user || !assigned.some((a) => a.role === "corporate_admin")) refuseTo(returnTo, "forbidden");
  const principal = { userId: user.id, role: "corporate_admin" };
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const description = String(formData.get("description") ?? "").trim().slice(0, 600);
  if (name.length < 4) refuseTo(returnTo, "bad-input");
  const { taskDefinition } = await import("@wellkept/schema");
  await db.insert(taskDefinition).values({
    id: randomUUID(), name, description, createdBy: principal.userId,
  }).onConflictDoNothing({ target: taskDefinition.name });
  revalidatePath(returnTo);
  recordedTo(returnTo, `task definition ${name}`);
}

/**
 * WL Gate 1 object 2: configuring how a task manifests in one household
 * is a corporate act (standards-adjacent). One profile per task per
 * household by the unique index; re-configuring updates rhythm and
 * notes in place and reactivates a tombstoned profile. Durations never
 * enter here: estimates are the Estimate Snapshot object's.
 */
export async function configureTaskProfile(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const returnTo = resolveReturnTo(String(formData.get("returnTo") ?? ""), householdId);
  if (!householdId) refuseTo(returnTo, "bad-input");
  const principal = await getPrincipal(householdId);
  if (!principal || !["corporate_admin", "corporate_ops"].includes(principal.role)) refuseTo(returnTo, "forbidden");
  const taskDefinitionId = String(formData.get("taskDefinitionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(taskDefinitionId)) refuseTo(returnTo, "bad-input");
  const cadence = String(formData.get("cadence") ?? "").trim().slice(0, 200) || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);
  const { householdTaskProfile, taskDefinition } = await import("@wellkept/schema");
  const [def] = await db.select().from(taskDefinition).where(eq(taskDefinition.id, taskDefinitionId));
  if (!def || def.tombstonedAt) refuseTo(returnTo, "missing");
  const id = randomUUID();
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(householdTaskProfile).values({
      id, householdId, taskDefinitionId, cadence, notes, configuredBy: principal.userId,
    }).onConflictDoUpdate({
      target: [householdTaskProfile.householdId, householdTaskProfile.taskDefinitionId],
      set: { cadence, notes, active: true, tombstonedAt: null, configuredBy: principal.userId, updatedAt: new Date() },
    }).returning({ id: householdTaskProfile.id });
    await emitOutboxEvent(tx, {
      householdId, kind: "task_profile.configured",
      payload: { taskProfileId: inserted[0]!.id, taskDefinitionId },
      provenance: "action:configureTaskProfile", objectId: inserted[0]!.id,
      actor: principal.userId, correlationId: taskDefinitionId,
    });
    await tx.insert(auditEvent).values({
      id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
      kind: "task_profile", detail: { taskProfileId: inserted[0]!.id, taskDefinitionId, action: "configured" },
    });
  });
  revalidatePath(`/oversight/${householdId}`);
  recordedTo(returnTo, `task profile ${def.name}`);
}
