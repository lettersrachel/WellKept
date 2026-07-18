"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { household, playbookField, clientEdit, auditEvent } from "@wellkept/schema";
import { readDecision } from "@wellkept/permissions";
import { db } from "./db";
import { getRole, DEMO_USERS } from "./session";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function switchRole(formData: FormData) {
  const to = formData.get("role") === "corporate_admin" ? "corporate_admin" : "client";
  const jar = await cookies();
  jar.set("wk_role", to, { httpOnly: true, sameSite: "lax" });
  redirect(to === "corporate_admin" ? "/oversight" : "/playbook");
}

/** Corporate sets the household status tag (REQ-041); every change audited. */
export async function setStatusTag(formData: FormData) {
  const role = await getRole();
  if (role !== "corporate_admin") return; // fail closed
  const householdId = String(formData.get("householdId") ?? "");
  const tag = String(formData.get("statusTag") ?? "");
  const VALID = ["ONBOARDING-90", "STEADY", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION"] as const;
  if (!householdId || !(VALID as readonly string[]).includes(tag)) return;
  const prior = await db.select().from(household).where(eq(household.id, householdId));
  if (!prior[0]) return;
  await db.update(household)
    .set({ statusTag: tag as (typeof VALID)[number], updatedAt: new Date() })
    .where(eq(household.id, householdId));
  await db.insert(auditEvent).values({
    id: randomUUID(),
    householdId,
    actorUser: DEMO_USERS.corporate_admin.id,
    actorRole: role,
    kind: "tag_change",
    detail: { from: prior[0].statusTag, to: tag },
  });
  revalidatePath("/oversight");
}

/** REQ-022: a client edit lands in review state; it never touches the field directly. */
export async function proposeEdit(formData: FormData) {
  const role = await getRole();
  if (role !== "client") return;
  const fieldId = String(formData.get("fieldId") ?? "");
  const proposed = String(formData.get("proposedValue") ?? "").trim();
  if (!fieldId || !proposed) return;
  const rows = await db.select().from(playbookField).where(eq(playbookField.id, fieldId));
  const f = rows[0];
  if (!f) return;
  // The client can only propose on fields the client can see. Policy, not UI.
  if (readDecision("client", f.sensitivity) !== "visible") return;
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
  const role = await getRole();
  if (role !== "corporate_admin") return;
  const editId = String(formData.get("editId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!editId || (decision !== "approved" && decision !== "declined")) return;
  const rows = await db.select().from(clientEdit).where(eq(clientEdit.id, editId));
  const edit = rows[0];
  if (!edit || edit.status !== "pending") return;
  if (decision === "approved") {
    const frows = await db.select().from(playbookField).where(eq(playbookField.id, edit.fieldId));
    const f = frows[0];
    if (!f) return;
    await db.update(playbookField)
      .set({
        value: edit.proposedValue,
        provenance: "client_written",
        provenanceDate: new Date(),
        confirmed: true,
        updatedAt: new Date(),
      })
      .where(eq(playbookField.id, f.id));
    await db.insert(auditEvent).values({
      id: randomUUID(),
      householdId: edit.householdId,
      actorUser: DEMO_USERS.corporate_admin.id,
      actorRole: role,
      kind: "field_write",
      fieldId: f.id,
      oldValueHash: sha256(f.value),
      newValueHash: sha256(edit.proposedValue),
      detail: { via: "client_edit_approval", editId },
    });
  }
  await db.update(clientEdit)
    .set({ status: decision, reviewedBy: DEMO_USERS.corporate_admin.id, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientEdit.id, editId));
  revalidatePath("/oversight");
  revalidatePath("/playbook");
}
