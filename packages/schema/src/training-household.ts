/**
 * training-household.ts : seed the Training Household (pnpm db:training).
 *
 * WK-DEV-010 v1.1 section 10: a permanently seeded SYNTHETIC household that
 * behaves like a real one, for February training, every future hire, and the
 * demo instance. Entirely fictional; never real household data (the
 * Fernbrook DEMO / Smoke Test Fixture rule applies here too).
 *
 * Re-running RESETS the training content: fields, work items, decisions,
 * the attention record, and the incident upsert back to their opening
 * state, so each trainee starts from the same board. Fixed UUIDs make
 * every write idempotent. This script writes the database directly,
 * bypassing the queue and the outbox, the demo-content posture; the rows
 * exist so training starts complete, and no events are emitted for them.
 *
 * What the seed builds NOW (the section 10 list, buildable half):
 *   - realistic asset and vendor registry records (rooms live in the
 *     playbook fields; the registry has no room kind)
 *   - access and quiet constraints (playbook fields)
 *   - a STALE household fact: the trash-day field carries a 2025
 *     provenance date and the vendor registry contradicts it (the hauler
 *     changed days in June 2026); the trainee is meant to notice
 *   - a stranger-visible s2 allergy field (the safety exception a
 *     covering stranger must see) and an s3 slot left vault-pending so
 *     reveal-flow training seals a synthetic value through the app
 *   - a vendor appointment (future work item) and a LATE vendor (overdue
 *     work item) with its attention record pre-raised in the exact shape
 *     the sweep would write
 *   - a standing decision (accepted, A2, hom audience) and one decision
 *     OUTSIDE authority (pending, A4, founder audience, figure-free)
 *   - a safety near-miss incident, open
 *   - a normal visit close (an applied visit.submit command)
 *   - the backup-HOM scenario: training-backup holds backup_hm, so
 *     stranger mode applies to that identity by role
 *
 * STUBBED until their phase (listed here so nobody hunts for them):
 *   - the offline visit: device-side by nature; exercised live in
 *     training on an airplane-mode device, not seedable as a row
 *   - the disputed outcome and the ServiceEvent late-vendor lifecycle:
 *     Phase 4, the vendor-repair slice after the go/no-go
 *   - the intentional AI misclassification: Tier M, gated on the future
 *     two-key entry (WK-DEV-009 v1.1)
 *   - TrainingState itself (per user, role, workflow): Phase 7
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  household, playbookField, authUser, householdRoleAssignment, registryEntry,
  workItem, attentionRecord, decisionRecord, incidentReport, visitCommand,
} from "./tables.ts";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

// Fixed ids: the whole seed keys on these, so every run converges.
const HH = "01997700-0000-7000-8000-000000000001";
const FIELD = (n: number) => `01997700-0000-7000-8000-0000000001${String(n).padStart(2, "0")}`;
const REG = (n: number) => `01997700-0000-7000-8000-0000000002${String(n).padStart(2, "0")}`;
const WORK_LATE = "01997700-0000-7000-8000-000000000301";
const WORK_APPT = "01997700-0000-7000-8000-000000000302";
const ATTN_LATE = "01997700-0000-7000-8000-000000000311";
const DEC_STANDING = "01997700-0000-7000-8000-000000000401";
const DEC_OUTSIDE = "01997700-0000-7000-8000-000000000402";
const INCIDENT = "01997700-0000-7000-8000-000000000501";
const VISIT = "01997700-0000-7000-8000-000000000601";

await db.insert(household).values({
  id: HH, name: "The Training Household", tier: "family_ops",
  statusTag: "STEADY", isFixture: true,
}).onConflictDoNothing();

// Training identities. Email is the stable key (the load-seed pattern);
// the unique (user, household) index makes assignments idempotent.
const IDENTITIES = [
  { email: "training-hom@wellkept.demo", name: "Training HOM", role: "house_manager" as const },
  { email: "training-backup@wellkept.demo", name: "Training Backup HOM", role: "backup_hm" as const },
  { email: "training-corporate@wellkept.demo", name: "Training Corporate", role: "corporate_admin" as const },
];
const userId: Record<string, string> = {};
for (const acct of IDENTITIES) {
  await db.insert(authUser).values({ id: randomUUID(), email: acct.email, name: acct.name })
    .onConflictDoNothing({ target: authUser.email });
  const [user] = await db.select().from(authUser).where(eq(authUser.email, acct.email));
  userId[acct.role] = user!.id;
  await db.insert(householdRoleAssignment).values({
    id: randomUUID(), userId: user!.id, householdId: HH, role: acct.role,
  }).onConflictDoNothing();
}
const hom = userId.house_manager!;
const corporate = userId.corporate_admin!;

// The Trainors: Marta and Sam, two adults, one cat. No children, so no
// child-data surface enters the training set.
type FieldRow = {
  id: string; section: number; name: string; value: string;
  sensitivity: "s1" | "s2" | "s3"; flag: "none" | "CRITICAL" | "CAUTION" | "DELIGHT";
  strangerVisible: boolean; provenanceDate: Date; note: string;
};
const F = (n: number, section: number, name: string, value: string,
  opts: Partial<Omit<FieldRow, "id" | "section" | "name" | "value">> = {}): FieldRow => ({
  id: FIELD(n), section, name, value,
  sensitivity: opts.sensitivity ?? "s1", flag: opts.flag ?? "none",
  strangerVisible: opts.strangerVisible ?? false,
  provenanceDate: opts.provenanceDate ?? new Date("2026-07-06T15:00:00Z"),
  note: opts.note ?? "",
});

const FIELDS: FieldRow[] = [
  F(1, 1, "Household summary paragraph (drafted after intake, client-readable)",
    "Marta and Sam Trainor, two adults and Pickle the cat. Marta records audio in the garden studio most weekday mornings; Sam travels Tuesday through Thursday most weeks. The house runs on quiet mornings, a well-stocked pantry, and the studio never being disturbed while the red light is on."),
  // The safety exception: the one s2 a covering stranger must see.
  F(2, 1, "Allergies: every person, every severity (food, medication, environmental, insect)",
    "Marta: shellfish, SEVERE. EpiPen in the entry console drawer, second in her studio desk. Sam: none known. Pickle: no known food issues.",
    { sensitivity: "s2", flag: "CRITICAL", strangerVisible: true }),
  // Access constraints.
  F(3, 7, "Access: how the HOM enters",
    "Side door off the carport. Lockbox on the hose bib holds the spare; code in the app secure field. Front door stays deadbolted, it is not the entry.",
    { flag: "CAUTION" }),
  // The s3 slot: value NEVER lands here; sealing a synthetic value through
  // the app's vault flow is a training station.
  F(4, 7, "Alarm: codes and key locations (app secure field)",
    "", { sensitivity: "s3", note: "vault-pending: seal a synthetic code here during reveal-flow training" }),
  // Quiet constraints.
  F(5, 6, "Quiet constraints and working hours",
    "Marta records weekday mornings until noon: no vacuum, no laundry, nothing against the studio's shared wall while the red light over the studio door is on. Loud work lands after 12:30 or on Sam's travel days."),
  // THE STALE FACT: 2025 provenance, contradicted by the hauler registry
  // entry below (service day changed June 2026). Deliberate; the trainee
  // is meant to catch it against the registry.
  F(6, 6, "Waste: trash, recycling, compost days and bin rules",
    "Trash out Monday night for Tuesday pickup; recycling alternates. Bins back in by Tuesday evening.",
    { provenanceDate: new Date("2025-09-12T15:00:00Z") }),
  F(7, 4, "Each pet: species, temperament, room rules",
    "Pickle: gray tabby, 7. Indoor only, door-darter, checks every open box. Studio is Pickle-free while recording; she claws the acoustic panels.",
    { flag: "CAUTION" }),
  F(8, 6, "Parking: where the HOM parks, vendor rules",
    "HOM parks in the carport's right bay. Vendors at the curb, never blocking the neighbor's shared drive."),
];
for (const f of FIELDS) {
  await db.insert(playbookField).values({
    id: f.id, householdId: HH, section: f.section, name: f.name, value: f.value,
    note: f.note, sensitivity: f.sensitivity, provenance: "asked",
    provenanceDate: f.provenanceDate, confirmed: true, flag: f.flag,
    strangerVisible: f.strangerVisible,
  }).onConflictDoUpdate({
    target: playbookField.id,
    set: { value: f.value, note: f.note, sensitivity: f.sensitivity,
      provenance: "asked", provenanceDate: f.provenanceDate, confirmed: true,
      flag: f.flag, strangerVisible: f.strangerVisible, name: f.name,
      section: f.section, tombstonedAt: null, updatedAt: new Date() },
  });
}
console.log(`training household: ${FIELDS.length} playbook fields reset`);

// Assets and vendors (the registry's half of "room and asset records").
const REGISTRIES = [
  { id: REG(1), kind: "appliance" as const, label: "Furnace", detail: { location: "basement", model: "synthetic 80k BTU" },
    installedAt: new Date("2018-10-01T00:00:00Z"), maintenanceIntervalMonths: 12, lastServicedAt: new Date("2025-10-20T00:00:00Z"), sensitivity: "s1" as const },
  { id: REG(2), kind: "appliance" as const, label: "Water heater", detail: { location: "basement", installYear: 2021 },
    installedAt: new Date("2021-03-01T00:00:00Z"), lifespanMonths: 144, sensitivity: "s1" as const },
  { id: REG(3), kind: "vendor" as const, label: "Valley Hauling: trash and recycling", detail: { service: "waste", note: "service day changed to FRIDAY in June 2026; bins out Thursday night" }, sensitivity: "s1" as const },
  { id: REG(4), kind: "vendor" as const, label: "Peak Mechanical: HVAC", detail: { service: "hvac", rhythm: "fall and spring service" }, sensitivity: "s2" as const },
];
for (const r of REGISTRIES) {
  await db.insert(registryEntry).values({ householdId: HH, ...r }).onConflictDoNothing();
}
console.log("training household: registry entries in place");

// The late vendor (overdue, open) and the vendor appointment (upcoming).
// Reset restores the full opening state and must satisfy the work_item
// CHECKs: open status with the resolution triple absent.
const WORK: Array<{ id: string; title: string; detail: string; dueDate: string }> = [
  { id: WORK_LATE, title: "Peak Mechanical: reglaze studio window, vendor missed the confirmed window",
    detail: "Confirmed for the week of Aug 11; no show, no call. Needs rescheduling and a note on the vendor record.", dueDate: "2026-08-14" },
  { id: WORK_APPT, title: "Peak Mechanical: fall furnace service, confirmed appointment",
    detail: "Confirmed window Sep 3, 9 to noon. Access per the side-door protocol; studio quiet rule applies until 12:30.", dueDate: "2026-09-03" },
];
for (const w of WORK) {
  await db.insert(workItem).values({
    id: w.id, householdId: HH, title: w.title, detail: w.detail,
    kind: "vendor", source: "corporate", dueDate: w.dueDate,
  }).onConflictDoUpdate({
    target: workItem.id,
    set: { title: w.title, detail: w.detail, dueDate: w.dueDate, status: "open",
      blockedReason: null, resolution: null, resolvedAt: null, resolvedBy: null,
      updatedAt: new Date() },
  });
}

// The attention record the sweep WOULD raise for the late vendor,
// pre-written in the sweep's exact shape so training starts complete even
// where no worker runs; a later sweep pass conflicts on the one-per-source
// index and writes nothing. Reset reopens it (ack pair and resolution
// triple whole-or-absent, per the CHECKs).
await db.insert(attentionRecord).values({
  id: ATTN_LATE, householdId: HH,
  reason: "Work item past its due date: Peak Mechanical: reglaze studio window, vendor missed the confirmed window",
  sourceKind: "work_item", sourceId: WORK_LATE, audience: "hom",
  urgency: "soon", deadline: "2026-08-14",
}).onConflictDoUpdate({
  target: [attentionRecord.sourceKind, attentionRecord.sourceId],
  set: { status: "open", acknowledgedAt: null, acknowledgedBy: null,
    resolution: null, resolvedAt: null, resolvedBy: null, updatedAt: new Date() },
});
console.log("training household: late vendor, appointment, and attention record reset");

// The standing decision (A2, hom audience, accepted) and the one OUTSIDE
// authority (A4, founder audience, pending, figure-free by rule: no
// amounts anywhere near this repo).
await db.insert(decisionRecord).values({
  id: DEC_STANDING, householdId: HH,
  question: "May the HOM restock the standing supply list without a per-visit ask?",
  recommendation: "Yes: the list is stable and the client asked for fewer pings.",
  alternatives: ["Ask each visit", "Batch a weekly confirmation"],
  evidence: ["Client stated preference at intake", "Supply list unchanged for three months"],
  authorityClass: "A2", audience: "hom", routedBy: corporate,
  outcome: "accepted", outcomeNote: "Standing approval; revisit if the list changes.",
  decidedAt: new Date("2026-08-10T16:00:00Z"), decidedBy: hom,
}).onConflictDoUpdate({
  target: decisionRecord.id,
  set: { outcome: "accepted", outcomeNote: "Standing approval; revisit if the list changes.",
    decidedAt: new Date("2026-08-10T16:00:00Z"), decidedBy: hom, expiredAt: null,
    updatedAt: new Date() },
});
await db.insert(decisionRecord).values({
  id: DEC_OUTSIDE, householdId: HH,
  question: "The Trainors ask to add their lake cabin to the same membership. Multi-property terms are not written anywhere; whose call is this?",
  recommendation: "Hold: outside HOM and corporate authority as written; the founder sets multi-property policy before anyone answers.",
  alternatives: ["Decline outright", "Improvise terms at corporate level"],
  evidence: ["No multi-property provision exists in the standards library", "WK-APP-006 lists multi-property as an unbuilt batch group"],
  authorityClass: "A4", audience: "founder", routedBy: corporate,
}).onConflictDoUpdate({
  target: decisionRecord.id,
  set: { outcome: null, outcomeNote: null, decidedAt: null, decidedBy: null,
    expiredAt: null, updatedAt: new Date() },
});
console.log("training household: standing decision and outside-authority decision reset");

// The safety exception: a near miss, open, reported by the HOM from a visit.
await db.insert(incidentReport).values({
  id: INCIDENT, householdId: HH, kind: "near_miss", severity: "medium",
  occurredAt: new Date("2026-08-19T14:30:00Z"), reportedBy: hom, reportedVia: "hm_visit",
  description: "Space heater in the studio running on a daisy-chained extension cord, cord warm to the touch behind the curtain. Unplugged, moved to the wall outlet, client texted the same afternoon.",
}).onConflictDoUpdate({
  target: incidentReport.id,
  set: { status: "open", resolutionNote: null, resolvedBy: null, resolvedAt: null,
    preventableByPrompt: null, updatedAt: new Date() },
});

// A normal close: one applied visit.submit, the demo-content pattern.
await db.insert(visitCommand).values({
  id: VISIT, type: "visit.submit", householdId: HH, status: "applied", reason: null,
  payload: {
    householdId: HH,
    startedAt: "2026-08-19T13:00:00Z",
    photoIds: ["studio-door.jpg", "pantry.jpg"],
    report: [
      "Pantry restocked from the standing list; Pickle supervised and was compensated in chin scratches.",
      "Studio untouched until 12:30 per the red-light rule; window glazing still awaiting the vendor.",
      "Logged a near miss about the studio space heater cord; details in the incident register.",
    ],
  },
}).onConflictDoNothing();
console.log("training household: incident reset and normal close in place");

await pool.end();
