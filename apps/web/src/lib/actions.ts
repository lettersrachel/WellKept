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

/**
 * REQ-003 recovery: reset a user's TOTP second factor (lost/replaced phone).
 * corporate_admin only. Deletes the enrolled secret AND kills the user's
 * sessions, so their next sign-in re-enrolls a fresh authenticator — a lost
 * device can never be a standing hole. Audited.
 */
export async function resetTotp(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  if (!householdId || !targetUserId) return;
  const actor = await getPrincipal(householdId);
  if (actor?.role !== "corporate_admin") return;
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
  await db.transaction(async (tx) => {
    await tx.update(playbookField)
      .set({
        value, note, sensitivity, flag, provenance,
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
    if (valueChanged && sensitivity !== "s3" && value) await outboxFieldEvent(tx, event);
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
  if (!ruleId || !anchorHouseholdId) return;
  const principal = await getPrincipal(anchorHouseholdId);
  if (principal?.role !== "corporate_admin") return; // fail closed
  const { triggerRule } = await import("@wellkept/schema");
  const [rule] = await db.select().from(triggerRule).where(eq(triggerRule.id, ruleId));
  if (!rule) return;
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
  if (!householdId) return;
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") return; // fail closed
  const signedAtRaw = String(formData.get("signedAt") ?? "");
  const docVersion = String(formData.get("docVersion") ?? "").trim().slice(0, 80);
  const signedAt = new Date(signedAtRaw);
  if (!signedAtRaw || Number.isNaN(signedAt.getTime()) || !docVersion) return;
  if (signedAt.getTime() > Date.now()) return; // consent is a fact, not a plan
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  if (!hh) return;
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
  if (!householdId) return;
  const principal = await getPrincipal(householdId);
  if (principal?.role !== "corporate_admin") return; // approval is corporate only, always
  const SCOPES = ["rule", "topic", "person", "field", "all"];
  const REQUESTERS = ["client", "house_manager", "corporate"];
  const scope = String(formData.get("scope") ?? "");
  const target = String(formData.get("target") ?? "").trim().slice(0, 200);
  const requestedBy = String(formData.get("requestedBy") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null; // s2
  if (!SCOPES.includes(scope) || !REQUESTERS.includes(requestedBy)) return;
  if (scope !== "all" && target.length < 2) return; // an empty target excludes nothing
  const { anticipationExclusion } = await import("@wellkept/schema");
  const id = randomUUID();
  await db.insert(anticipationExclusion).values({
    id, householdId, scope, target, reason, requestedBy,
    approvedBy: principal.userId, effectiveFrom: new Date(),
  });
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "exclusion_created", detail: { exclusionId: id, scope, target, requestedBy },
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
  if (!householdId) return;
  const principal = await getPrincipal(householdId);
  if (!principal || !["house_manager", "backup_hm", "corporate_admin", "corporate_ops"].includes(principal.role)) return;
  const KINDS = ["complaint", "breakage", "injury", "near_miss", "other"] as const;
  const SEVERITIES = ["low", "medium", "high"];
  const VIA = ["client_call", "client_email", "hm_visit", "corporate", "other"];
  const kind = String(formData.get("kind") ?? "");
  const severity = String(formData.get("severity") ?? "");
  const reportedVia = String(formData.get("reportedVia") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const occurredRaw = String(formData.get("occurredAt") ?? "");
  const occurredAt = new Date(occurredRaw);
  if (!(KINDS as readonly string[]).includes(kind) || !SEVERITIES.includes(severity) || !VIA.includes(reportedVia)) return;
  if (!description || !occurredRaw || Number.isNaN(occurredAt.getTime())) return;
  if (occurredAt.getTime() > Date.now()) return; // an incident is a fact, not a forecast
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
}

/** Resolving stamps the note and closer; the row itself never changes. */
export async function resolveIncident(formData: FormData) {
  const incidentId = String(formData.get("incidentId") ?? "");
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim().slice(0, 2000);
  if (!incidentId || !resolutionNote) return; // a resolution needs the outcome named
  const { incidentReport } = await import("@wellkept/schema");
  const [inc] = await db.select().from(incidentReport).where(eq(incidentReport.id, incidentId));
  if (!inc || inc.status !== "open") return;
  const principal = await getPrincipal(inc.householdId);
  if (principal?.role !== "corporate_admin") return; // closing is a corporate call
  await db.update(incidentReport)
    .set({ status: "resolved", resolutionNote, resolvedBy: principal.userId, resolvedAt: new Date(), updatedAt: new Date() })
    .where(eq(incidentReport.id, incidentId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: inc.householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "incident_resolved", detail: { incidentId, incidentKind: inc.kind },
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
  if (!photoId) return;
  const { visitPhoto } = await import("@wellkept/schema");
  const [p] = await db.select({ id: visitPhoto.id, householdId: visitPhoto.householdId, purgedAt: visitPhoto.purgedAt })
    .from(visitPhoto).where(eq(visitPhoto.id, photoId));
  if (!p || p.purgedAt) return;
  const principal = await getPrincipal(p.householdId);
  if (principal?.role !== "corporate_admin") return;
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
  if (!photoId) return;
  const { visitPhoto } = await import("@wellkept/schema");
  const [p] = await db.select({ id: visitPhoto.id, householdId: visitPhoto.householdId, purgedAt: visitPhoto.purgedAt })
    .from(visitPhoto).where(eq(visitPhoto.id, photoId));
  if (!p || p.purgedAt) return; // nothing reusable about a purged photo
  const principal = await getPrincipal(p.householdId);
  if (principal?.role !== "corporate_admin") return;
  if (allow) {
    const [hh] = await db.select({ isNda: household.isNda }).from(household).where(eq(household.id, p.householdId));
    if (!hh || hh.isNda) return; // NDA household media is never reusable
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
  if (!exclusionId) return;
  const { anticipationExclusion } = await import("@wellkept/schema");
  const [x] = await db.select().from(anticipationExclusion).where(eq(anticipationExclusion.id, exclusionId));
  if (!x || x.effectiveTo) return;
  const principal = await getPrincipal(x.householdId);
  if (principal?.role !== "corporate_admin") return;
  await db.update(anticipationExclusion).set({ effectiveTo: new Date() }).where(eq(anticipationExclusion.id, exclusionId));
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: x.householdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "exclusion_ended", detail: { exclusionId, scope: x.scope, target: x.target },
  });
  revalidatePath(`/oversight/${x.householdId}`);
  revalidatePath("/visit");
}

export async function createTriggerRule(formData: FormData) {
  const anchorHouseholdId = String(formData.get("anchorHouseholdId") ?? "");
  if (!anchorHouseholdId) return;
  const principal = await getPrincipal(anchorHouseholdId);
  if (principal?.role !== "corporate_admin") return; // fail closed

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
    if (!Number.isInteger(offsetDays) || offsetDays < 0 || offsetDays > 365) return;
    if (!text || text.length < 8 || text.includes("\u2014")) return;
    if (ref && !provisionIdSchema.safeParse(ref).success) return;
    items.push({ offsetDays, text, ...(ref ? { methodRef: ref } : {}) });
  }
  if (!FAMILIES.includes(family)) return;
  if (bindsToFieldName.length < 2 || packName.length < 2 || !/^[a-z0-9-]+$/.test(packName)) return;
  if (items.length < 1 || items.length > 10) return;

  const { triggerRule } = await import("@wellkept/schema");
  const ruleId = randomUUID();
  await db.insert(triggerRule).values({
    id: ruleId, householdId: null, family, bindsToFieldName, enabled: true,
    definition: { packName, items },
  });
  await db.insert(auditEvent).values({
    id: randomUUID(), householdId: anchorHouseholdId, actorUser: principal.userId, actorRole: principal.role,
    kind: "trigger_rule_change", detail: { ruleId, created: true, packName },
  });
  revalidatePath("/oversight/triggers");
}
