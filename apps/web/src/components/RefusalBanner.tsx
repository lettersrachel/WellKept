import type { RefusalReason } from "@/lib/actions";

/**
 * G-29: the visible half of a refused action.
 *
 * A server action that guards with a bare `return` is indistinguishable
 * from a broken button — the operator cannot tell "the system declined
 * this" from "the system is down". That ambiguity cost the 2026-07-27
 * smoke run three false failures. Actions now redirect with `?refused=`,
 * and this renders the reason.
 *
 * Every message says what the system did NOT do, because the operator's
 * real question after a dead click is "did anything change?".
 */
const REFUSALS: Record<RefusalReason, string> = {
  "bad-input":
    "That form arrived incomplete or invalid, so nothing was changed. Check the fields and try again.",
  forbidden:
    "Your role on this household does not permit that action, so nothing was changed. Roles are per household — you may hold a different one here than elsewhere.",
  "not-pending":
    "That item was already handled — someone else reviewed it, or the page you clicked from was out of date. Nothing was changed.",
  missing:
    "The record behind that action no longer exists, so nothing was changed. Reload the page to see the current state.",
  "gate-unmet":
    "A required precondition is not satisfied yet, so nothing was changed. The gate order is policy, not a UI suggestion.",
  "self-target":
    "That action refuses to target your own account, so nothing was changed. Ask another corporate admin if it is genuinely intended.",
};

export function RefusalBanner({ reason }: { reason?: string }) {
  if (!reason) return null;
  const message = REFUSALS[reason as RefusalReason];
  // An unknown reason still surfaces — a refusal we forgot to describe is
  // still a refusal, and silence is the bug this component exists to kill.
  return (
    <div className="card" role="status" style={{ borderColor: "#8B2E2E", marginBottom: 12 }}>
      <strong>Action refused.</strong>{" "}
      {message ?? `The action was refused (${reason}) and nothing was changed.`}
    </div>
  );
}
