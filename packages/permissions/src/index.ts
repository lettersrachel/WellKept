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
export interface PermOpts {
  ndaMode?: boolean;
  /** Stranger-mode ruling (c), 24 Aug 2026: hide every s2 surface except
   * fields explicitly marked stranger_visible; s3 never shows in stranger
   * mode, marker or not. Applied AFTER the role matrix, never instead of
   * it: a stranger projection can only ever narrow what the role sees. */
  strangerMode?: boolean;
}
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
    const d = readDecision(role, (f && f.sensitivity) ?? "", opts); // "" fails closed
    if (d === "denied") continue;
    if (opts.strangerMode && f.sensitivity !== "s1") {
      // The overlay narrows only: s3 is out regardless of any marker (the
      // vault never opens for a stranger), s2 stays only when a human
      // marked it (the allergy a covering stranger must know).
      if (f.sensitivity === "s3" || f.strangerVisible !== true) continue;
    }
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
    if (!f || !SENSITIVITIES.includes(f.sensitivity ?? "")) {
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

/**
 * G-78 (corrected), the shape assertion. `assertClientPayloadSafe` above
 * reads ONE key per row, `sensitivity`, and asserts it is s1. It says
 * nothing about which OTHER keys the row carries, and neither do
 * `assertNoProvisionRows` and `assertNoAnticipationRows`, which recognize
 * the shapes that must never appear and therefore cannot recognize a
 * column invented tomorrow. So all three are blind in the same place, for
 * two different reasons, and a new column reached a member-bound payload
 * by default rather than by decision.
 *
 * This closes that direction: the payload may carry ONLY the keys named
 * in a declared list, and anything else throws. Widening a client payload
 * becomes an affirmative edit to a list a person reads, which is the
 * whole point. It fails closed and it runs in production, so its first
 * real red is worth more than its test (the KEK validation precedent).
 *
 * WHAT IT DOES NOT CATCH, recorded here beside the guard rather than in a
 * later entry, because a guard read without its residue is read as wider
 * than it is:
 *
 *  1. **A staff-only FACT typed into a correctly client-visible column.**
 *     `playbook_field.value` is gated by ROW sensitivity, so an s1 field
 *     is client-visible by design. A HOM who types an internal note into
 *     one publishes it, and this guard sees a permitted key carrying a
 *     permitted-looking string. Nothing else catches it either: not
 *     `assertClientPayloadSafe` (the row really is s1), not the copy
 *     census (free text a person writes is its stated residue), not the
 *     database. It is the same class as the copy guard's free text and it
 *     has no mechanical answer.
 *  2. **The inside of a jsonb column.** The check is per row, top level.
 *     `registry_entry.detail` is ONE permitted key whose contents are
 *     unread, so anything written into that object reaches a member
 *     unexamined.
 *  3. **A value that should have been nulled.** The list governs which
 *     keys may be PRESENT, not what they hold. `getRegistries` nulls five
 *     working-note columns for a client and this guard would not notice
 *     if that stopped happening. A must-be-null half is a real extension
 *     and is deliberately NOT built here, so the reviewed surface stays
 *     exactly the one that was approved.
 */
/**
 * Q-5: keys that may NEVER reach a member, whatever a declared list
 * says. This is the second half of the acknowledgement that the stage
 * assertion must cover ANY client payload rather than rely on absence.
 *
 * `assertNoAnticipationRows` walks the payloads that call it; this set
 * covers the declared-list family (playbook fields, registry entries,
 * the client visit report), which calls a different assertion. Between
 * them every client payload in the tree is reached, and neither depends
 * on a future author remembering which mechanism applies to the surface
 * they are writing.
 *
 * The reason it lives INSIDE the declared-key check rather than beside
 * it: a declared list is a hatch a person may widen in a reviewed
 * change, and the whole point of these keys is that widening is not the
 * available remedy. A forbidden key throws even when it is declared,
 * which is why the message says project it out rather than declare it.
 */
export const FORBIDDEN_CLIENT_KEYS: Readonly<Record<string, string>> = Object.freeze({
  // Four-Stage Application Spec section 5: "Stage tags are internal; no
  // member surface ever displays the schema."
  stage: "the internal pipeline stage tag (Four-Stage spec section 5: stage tags are internal)",
});

export function assertDeclaredClientKeys(
  rows: readonly unknown[],
  allowed: readonly string[],
  label: string,
): true {
  // Preconditions before any row is read. An empty allow-list would
  // accept an empty array and read as a passing guard, which is the
  // vacuous-coverage shape the census guards carry floors against.
  if (!Array.isArray(rows)) {
    throw new Error(`${label}: payload must be an array of rows`);
  }
  if (!Array.isArray(allowed) || allowed.length === 0) {
    throw new Error(`${label}: declared key list is empty; nothing is being checked`);
  }
  const permitted = new Set(allowed);
  // A forbidden key is refused before any row is read, because a list
  // that DECLARES one is already the defect: the row-level check below
  // would then pass it as permitted.
  for (const key of allowed) {
    const reason = FORBIDDEN_CLIENT_KEYS[key];
    if (reason) {
      throw new Error(
        `SEVERE: "${key}" is declared for ${label} and may never reach a member: ${reason}. ` +
        "Project it out at the boundary; declaring it is not the remedy.",
      );
    }
  }
  for (const [i, row] of rows.entries()) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${label}[${i}]: payload row is not an object`);
    }
    for (const key of Object.keys(row)) {
      const forbidden = FORBIDDEN_CLIENT_KEYS[key];
      if (forbidden) {
        throw new Error(
          `SEVERE: forbidden key "${key}" reached a client payload at ${label}[${i}]: ${forbidden}.`,
        );
      }
      if (!permitted.has(key)) {
        throw new Error(
          `SEVERE: undeclared key "${key}" reached a client payload at ${label}[${i}]. ` +
          `If a member may see it, add it to the declared list for ${label} in a reviewed change; ` +
          `if not, project it out at the boundary.`,
        );
      }
    }
  }
  return true;
}

/**
 * The client playbook's field projection, an ALLOW-LIST LITERAL: the page
 * builds each row key by key, so a new column on `playbook_field` cannot
 * reach a member through it whatever this list says. Declared anyway, so
 * the two client payloads are governed the same way and neither depends
 * on a reader knowing which syntax is in use at which call site.
 */
export const CLIENT_PLAYBOOK_FIELD_KEYS = [
  "id", "section", "name", "value", "flag", "sensitivity",
] as const;

/**
 * The client registry projection, a SPREAD WITH A DENY-LIST:
 * `getRegistries` returns `{...row, derivationSource: null, ...}`, so the
 * payload carries EVERY column of `registry_entry` and the five
 * working-note columns arrive present-and-emptied rather than absent.
 * This is the shape the guard exists for. The list is therefore the whole
 * column set as of migration 0058, and a column added tomorrow is an
 * undeclared key that throws.
 *
 * That five of these are nulled for a client is a DIFFERENT mechanism
 * (the founder ruling of 27 August 2026) which this list does not carry
 * and does not replace. A key being declared here means a member's
 * payload may CONTAIN it, never that a member may READ its value.
 */
export const CLIENT_REGISTRY_ENTRY_KEYS = [
  "id", "createdAt", "updatedAt",
  "householdId", "kind", "label", "detail",
  "keyDate", "cadence",
  "installedAt", "lifespanMonths", "maintenanceIntervalMonths", "lastServicedAt",
  "sensitivity", "sourceFieldId", "tombstonedAt",
  // 0058, the systems walk-through.
  "installDate", "installDateGranularity",
  "serialVerbatim", "derivationSource", "derivedYear", "installConfidence",
  "photoPassAt", "askPassAt",
] as const;

/** DEV-004 Section 3 canonical entry-point name; same function. */
export const filterFieldsForRole = filterFields;
