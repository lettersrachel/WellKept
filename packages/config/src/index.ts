/**
 * Brand is one configuration value (adopted law, 3 September 2026
 * package intake, merged at Q-0b: the company name, sending domain,
 * app display name and credential wording resolve from ONE place, and
 * nothing member-facing hardcodes the company name).
 *
 * The name decision lands 25 September 2026. Until then these are
 * exactly the strings the surfaces carried before extraction; changing
 * any value here is a founder decision, and brand-config.test.ts pins
 * companyName so the change is a reviewed edit to both files, never a
 * drive-by. The env override AUTH_EMAIL_FROM keeps working at every
 * call site; emailFromFallback is only the fallback it always was.
 */

const companyName = "Well Kept";

/** The provider sandbox address the from-fallback has always used. */
const sendingAddress = "onboarding@resend.dev";

export const BRAND = {
  companyName,
  /** The privacy notice's entity line, verbatim. */
  legalEntityName: "Well Kept Home Operations Management LLC",
  appDisplayName: companyName,
  sendingAddress,
  emailFromFallback: `${companyName} <${sendingAddress}>`,
} as const;

/**
 * FIXED and independent of the company name (adopted law, same
 * section): the 25 September name decision does not touch these. No
 * member-facing surface renders them today; they live here so the one
 * place exists before a surface does.
 */
export const CREDENTIAL_NAMES = {
  hom: "Household Operations Manager",
  certifiedLevelI: "Certified Household Operations Manager, Level I",
  certifiedLevelII: "Certified Household Operations Manager, Level II",
} as const;
