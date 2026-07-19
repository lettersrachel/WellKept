"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { household, playbookField, clientEdit, auditEvent, strangerTest, gesture, dot } from "@wellkept/schema";
import { readDecision } from "@wellkept/permissions";
import { db } from "./db";
import { getPrincipal } from "./session";
import { emitFieldChange, outboxFieldEvent } from "./field-events";
import { vaultWrite } from "./vault";
import { isClientEditable } from "./client-allowlist";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Corporate sets the household status tag (REQ-041); every change audited. */
export async function setStatusTag(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) return;
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") return; // fail closed
  const tag = String(formData.get("statusTag") ?? "");
  const VALID = ["ONBOARDING-90", "STEADY", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION"] as const;
  if (!(VALID as readonly string[]).includes(tag)) return;
  const prior = await db.select().from(household).where(eq(household.id, householdId));
  if (!prior[0]) return;
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
  if (!editId || (decision !== "approved" && decision !== "declined")) return;
  const rows = await db.select().from(clientEdit).where(eq(clientEdit.id, editId));
  const edit = rows[0];
  if (!edit || edit.status !== "pending") return;
  const principal = await getPrincipal(edit.householdId);
  if (principal?.role !== "corporate_admin") return;
  if (decision === "approved") {
    const frows = await db.select().from(playbookField).where(eq(playbookField.id, edit.fieldId));
    const f = frows[0];
    if (!f) return;
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
      await outboxFieldEvent(tx, event);
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
  if (!fieldId || !value) return;
  const rows = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  const f = rows[0];
  if (!f || f.sensitivity !== "s3") return; // the vault accepts s3 only
  const principal = await getPrincipal(f.householdId);
  if (principal?.role !== "corporate_admin") return; // fail closed
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
  if (!householdId || !idea) return;
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") return;
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
  if (!gestureId || (gate !== "cultural_fit" && gate !== "hm_notified")) return;
  const [g] = await db.select().from(gesture).where(eq(gesture.id, gestureId));
  if (!g || g.executedAt) return;
  const principal = await getPrincipal(g.householdId);
  if (principal?.role !== "corporate_admin") return;
  // HM notification only after cultural fit passed (the gate ORDER is the rule)
  if (gate === "hm_notified" && !g.culturalFitChecked) return;
  await db.update(gesture)
    .set(gate === "cultural_fit" ? { culturalFitChecked: true, updatedAt: new Date() } : { hmNotified: true, updatedAt: new Date() })
    .where(eq(gesture.id, gestureId));
  revalidatePath("/oversight");
  revalidatePath(`/oversight/${g.householdId}`);
}

export async function executeGesture(formData: FormData) {
  const gestureId = String(formData.get("gestureId") ?? "");
  const costCents = Math.round(Number(formData.get("costDollars") ?? 0) * 100);
  if (!gestureId) return;
  const [g] = await db.select().from(gesture).where(eq(gesture.id, gestureId));
  if (!g || g.executedAt) return;
  const principal = await getPrincipal(g.householdId);
  if (principal?.role !== "corporate_admin") return;
  if (!g.culturalFitChecked || !g.hmNotified) return; // both gates or nothing
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
  if (!householdId || !email || !VALID_ROLES.includes(role)) return;
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") return; // only admins provision
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;

  const { authUser, householdRoleAssignment } = await import("@wellkept/schema");
  await db.insert(authUser).values({ id: randomUUID(), email, name: null }).onConflictDoNothing({ target: authUser.email });
  const [user] = await db.select().from(authUser).where(eq(authUser.email, email));
  if (!user) return;
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
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: actor.userId, actorRole: actor.role,
    kind: "role_assigned", detail: { email, role, ndaApproved },
  });
  revalidatePath(`/oversight/${householdId}`);
}

export async function revokeRole(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const householdId = String(formData.get("householdId") ?? "");
  if (!assignmentId || !householdId) return;
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") return;
  const { householdRoleAssignment } = await import("@wellkept/schema");
  const [row] = await db.select().from(householdRoleAssignment).where(eq(householdRoleAssignment.id, assignmentId));
  if (!row || row.householdId !== householdId) return;
  if (row.userId === actor.userId) return; // never revoke your own admin here (lockout guard)
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
  if (!dotId || !fieldId || !value) return;
  const { dot, playbookField } = await import("@wellkept/schema");
  const [d] = await db.select().from(dot).where(eq(dot.id, dotId));
  if (!d || d.promotedFieldId) return;
  const actor = await getPrincipal(d.householdId);
  if (actor?.role !== "corporate_admin") return;
  const [f] = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  if (!f || f.householdId !== d.householdId) return;
  if (f.sensitivity === "s3") return; // s3 goes through the vault, never a dot merge

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
    await outboxFieldEvent(tx, event);
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
  if (!householdId || !targetUserId) return;
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") return;
  if (targetUserId === actor.userId) return; // don't sign yourself out here
  const { authSession } = await import("@wellkept/schema");
  const killed = await db.delete(authSession).where(eq(authSession.userId, targetUserId)).returning({ t: authSession.sessionToken });
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: actor.userId, actorRole: actor.role,
    kind: "sessions_revoked", detail: { targetUserId, count: killed.length },
  });
  revalidatePath(`/oversight/${householdId}`);
}
