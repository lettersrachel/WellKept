// implements REQ-004, REQ-013, REQ-034 (matrix per WK-APP-003 S2)
/**
 * The Well Kept permission core.
 *
 * Implements the WK-APP-003 Section 2 visibility matrix, the single splitter
 * that turns one household record into three interfaces. This module is
 * policy, not plumbing: per WK-DEV-004, changes here require founder
 * sign-off and the test suite must hold 100% branch coverage.
 *
 * The matrix (WK-APP-003 S2):
 *   sensitivity  client     hm / backup_hm        corporate_ops / admin / cfo_readonly
 *   s1           visible    visible               visible
 *   s2           hidden     visible               visible
 *   s3           hidden     in-context only,      visible, fully audited
 *                           logged reveal
 *
 * Everything fails closed: unknown role, unknown sensitivity, or missing
 * arguments deny. The client payload can never carry an s2 or s3 value;
 * assertClientPayloadSafe is the automated payload test (US-05) and should
 * run in CI on every build.
 *
 * ES module with JSDoc types; drops into the monorepo's packages/permissions
 * as-is or converts mechanically to .ts.
 */

export const ROLES = Object.freeze([
  "client",
  "house_manager",
  "backup_hm",
  "corporate_ops",
  "corporate_admin",
  "cfo_readonly",
]);

export const SENSITIVITIES = Object.freeze(["s1", "s2", "s3"]);

const CORPORATE_ROLES = new Set(["corporate_ops", "corporate_admin", "cfo_readonly"]);

/**
 * Core read decision for a single field.
 * @param {string} role
 * @param {string} sensitivity
 * @param {{ndaMode?: boolean}} [opts] NDA households (REQ-006) tighten s3 for
 *   backup HMs: no reveal until familiarization, so backup_hm is denied s3.
 * @returns {"visible"|"reveal_only"|"denied"}
 */
export type Decision = "visible" | "reveal_only" | "denied";
export interface PermOpts { ndaMode?: boolean }
export function readDecision(role: string, sensitivity: string, opts: PermOpts = {}): Decision {
  if (!ROLES.includes(role)) return "denied";
  if (!SENSITIVITIES.includes(sensitivity)) return "denied"; // fail closed
  if (sensitivity === "s1") return "visible";
  if (role === "client") return "denied";
  if (sensitivity === "s2") return "visible"; // hm, backup, corporate
  // s3 from here; role validity was proven at the top, client already denied,
  // so only corporate and field roles remain.
  if (CORPORATE_ROLES.has(role)) return "visible"; // fully audited upstream
  if (role === "backup_hm" && opts.ndaMode) return "denied"; // REQ-006
  return "reveal_only"; // house_manager, backup_hm
}

/**
 * Filter a household's fields for a role's session payload.
 * s3 values are NEVER inlined for field roles: the record ships with a
 * placeholder and reveal happens through revealS3 (in context, logged).
 * @param {string} role
 * @param {Array<object>} fields seed-schema field records
 * @param {{ndaMode?: boolean}} [opts]
 * @returns {Array<object>} safe copies; input is never mutated
 */
export interface FieldRecord { id?: string; name?: string; sensitivity?: string; value?: unknown; [k: string]: unknown }
export function filterFields(role: string, fields: FieldRecord[], opts: PermOpts = {}): FieldRecord[] {
  if (!Array.isArray(fields)) return [];
  const out = [];
  for (const f of fields) {
    const d = readDecision(role, f && f.sensitivity, opts);
    if (d === "denied") continue;
    if (d === "reveal_only") {
      out.push({ ...f, value: null, vault: true });
    } else {
      out.push({ ...f });
    }
  }
  return out;
}

/**
 * In-context s3 reveal (REQ-034, US-14). Returns the value and writes the
 * audit entry (REQ-005: user, role, timestamp, household, field) through the
 * caller-supplied sink. No sink, no reveal: the log is not optional.
 * @param {{role:string,user:string,householdId:string}} session
 * @param {object} field
 * @param {(entry:object)=>void} auditSink
 * @param {{ndaMode?: boolean, now?: () => string}} [opts]
 * @returns {{ok:true,value:*,expiresInSeconds:number}|{ok:false,reason:string}}
 */
export interface Session { role: string; user: string; householdId: string }
export interface AuditEntry { user: string; role: string; householdId: string; field?: string; fieldId?: string; at: string; kind: string }
export type RevealResult = { ok: true; value: unknown; expiresInSeconds: number } | { ok: false; reason: string };
export function revealS3(session: Session | null, field: FieldRecord | null, auditSink: ((e: AuditEntry) => void) | undefined, opts: PermOpts & { now?: () => string } = {}): RevealResult {
  if (!session || !session.role || !session.user || !session.householdId) {
    return { ok: false, reason: "incomplete session" };
  }
  if (!field || field.sensitivity !== "s3") {
    return { ok: false, reason: "not a vault field" };
  }
  if (typeof auditSink !== "function") {
    return { ok: false, reason: "no audit sink: reveal refused" };
  }
  const d = readDecision(session.role, "s3", opts);
  if (d === "denied") return { ok: false, reason: "role denied" };
  const now = (opts.now || (() => new Date().toISOString()))();
  auditSink({
    user: session.user,
    role: session.role,
    householdId: session.householdId,
    field: field.name,
    fieldId: field.id,
    at: now,
    kind: d === "visible" ? "corporate_view" : "in_context_reveal",
  });
  return { ok: true, value: field.value, expiresInSeconds: 60 };
}

/**
 * The payload test (US-05): throws if any s2/s3 content is present in what a
 * client session would receive. Run in CI on every build, not just once.
 * @param {Array<object>} payloadFields
 */
export function assertClientPayloadSafe(payloadFields: FieldRecord[]): true {
  if (!Array.isArray(payloadFields)) {
    throw new Error("payload must be an array of fields");
  }
  for (const f of payloadFields) {
    if (!f || !SENSITIVITIES.includes(f.sensitivity)) {
      throw new Error(`unknown sensitivity in client payload: ${f && f.sensitivity}`);
    }
    if (f.sensitivity !== "s1") {
      throw new Error(
        `SEVERE: ${f.sensitivity} field "${f.name}" reached a client payload`
      );
    }
  }
  return true;
}

/** DEV-004 Section 3 canonical entry-point name; same function. */
export const filterFieldsForRole = filterFields;
