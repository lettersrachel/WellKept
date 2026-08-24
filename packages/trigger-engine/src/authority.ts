/**
 * The authority-class machinery (Implementation Handoff section 14,
 * built under WK-DEV-007 section 3). Six classes, A0 observe through A5
 * never-autonomous; the single-consent rule stands above all of them
 * (every suggestion that ever reaches a human is confirmed
 * individually, no select-all).
 *
 * THE CAP: AUTHORITY_CAP is set here in configuration and enforced in
 * code. Nothing above A0/observe emits outside the shadow log, period.
 * Raising the cap is a TWO-KEY decision recorded in the WK-QA-018
 * register first; the raise is then a reviewed commit to this constant
 * citing that entry. No setting row, flag, model output, or payload can
 * raise it at runtime, which is why it is a constant and not a knob.
 */
export const AUTHORITY_CLASSES = ["A0", "A1", "A2", "A3", "A4", "A5"] as const;
export type AuthorityClass = (typeof AUTHORITY_CLASSES)[number];

export const AUTHORITY_DESCRIPTIONS: Record<AuthorityClass, string> = {
  A0: "Observe: detect and record a possible signal only.",
  A1: "Prepare: research, summarize, draft or organize.",
  A2: "Reversible low-risk execute, only where policy explicitly authorizes.",
  A3: "Human authorization: prepare fully, an authorized human confirms.",
  A4: "Elevated authorization: designated higher authority and stronger context.",
  A5: "Never autonomous: the system may support, never decide or execute alone.",
};

export const AUTHORITY_CAP: AuthorityClass = "A0";

export class AuthorityCapExceeded extends Error {
  constructor(proposed: AuthorityClass) {
    super(
      `authority class ${proposed} exceeds the cap ${AUTHORITY_CAP}: nothing above ` +
      `${AUTHORITY_CAP}/observe emits outside the shadow log. Raising the cap is a ` +
      `two-key register entry first, then a reviewed change to AUTHORITY_CAP citing it.`,
    );
    this.name = "AuthorityCapExceeded";
  }
}

export const classIndex = (c: AuthorityClass) => AUTHORITY_CLASSES.indexOf(c);

/** Throws unless the proposed class is within the cap. Every path that
 * emits ANYTHING beyond the shadow log calls this first. */
export function assertWithinCap(proposed: AuthorityClass): void {
  if (classIndex(proposed) > classIndex(AUTHORITY_CAP)) throw new AuthorityCapExceeded(proposed);
}
