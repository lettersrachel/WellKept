import { assertDeclaredClientKeys } from "@wellkept/permissions";

/**
 * G-78 at a mail boundary. What a member receives here is three sentences
 * and a photo count, so that is what gets built, checked and sent, rather
 * than the whole visit payload being handed to a composer that happens to
 * read two fields off it today.
 *
 * `CLIENT_REPORT_KEYS` is the declared list; the projection is built key
 * by key from the payload; `assertDeclaredClientKeys` then refuses
 * anything undeclared. The report contract is `[string, string, string]`
 * in packages/close-flow, enforced there by the close-flow STATE MACHINE,
 * which runs client-side. This route is a POST behind auth and the second
 * factor and validates no payload shape at all, so a command that never
 * passed through that state machine reaches here unchecked. Asserting the
 * three sentences here enforces an existing written contract at the
 * boundary that matters; it invents no new rule.
 *
 * FAILURE POSTURE (founder ruling, 27 August 2026): refuse the SEND, log
 * loudly, let the visit stand. `applyVisitCommand` has already committed
 * by the time this runs, so throwing would hand the HOM a false failure
 * and make the queue retry a landed write. The record is the record.
 */
export const CLIENT_REPORT_KEYS = ["report", "photoCount"] as const;

export type ClientReportProjection = { report: string[]; photoCount: number };

/**
 * Pure result. The projector decides and logs; the CALLER does the I/O,
 * so the decision stays synchronous and testable without a database and
 * the refusal reason is available to whoever must record it.
 */
export type ClientReportDecision =
  | { ok: true; projection: ClientReportProjection }
  | { ok: false; why: string };

/**
 * Refuse-and-log, deliberately not throwing. Returns null when the payload
 * cannot be sent safely.
 *
 * The log alone was G-81: a refusal nobody could see, on a member-facing
 * thing that did not happen, which a member cannot distinguish from a
 * quiet week. FOUNDER RULING, 27 August 2026: wire it, narrowly. The
 * caller raises an `attention_record` for the corporate queue.
 *
 * NARROW MEANS NARROW. One trigger condition: a client-facing send THIS
 * SYSTEM REFUSED TO MAKE. Not delivery failures, not bounces, not vendor
 * errors, and no adjacent event class merely because it fits the same
 * plumbing. A broader capture-router ruling does not exist yet, and this
 * does not stand in for one.
 */
export function projectClientReport(
  householdId: string,
  payload: { report?: string[]; photoIds?: string[] },
): ClientReportDecision {
  const refuse = (why: string): ClientReportDecision => {
    console.error(
      `[visit-report] SEND SUPPRESSED for household ${householdId}: ${why}. ` +
      "The visit stands and the record is unaffected; no client email was sent. " +
      "The caller routes this to the corporate queue (G-81).",
    );
    return { ok: false, why };
  };

  const report = payload.report;
  if (!Array.isArray(report)) return refuse("report is not an array");
  if (report.length !== 3) {
    return refuse(`report carries ${report.length} sentences, and the close-flow contract is exactly 3`);
  }
  if (!report.every((sentence) => typeof sentence === "string" && sentence.trim() !== "")) {
    return refuse("a report sentence is empty or not a string");
  }

  const projection: ClientReportProjection = {
    report,
    photoCount: Array.isArray(payload.photoIds) ? payload.photoIds.length : 0,
  };
  try {
    assertDeclaredClientKeys([projection], CLIENT_REPORT_KEYS, "client visit report");
  } catch (err) {
    return refuse(err instanceof Error ? err.message : String(err));
  }
  return { ok: true, projection };
}
