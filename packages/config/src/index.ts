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

/**
 * The backup retention window, as stated to members in the privacy notice.
 *
 * Founder ruling, 5 September 2026, on gap register G-128: the retention floor
 * is stated to members as what it is, naming the window. Deletion is complete
 * and immediate at the application layer, and the database backups still carry
 * the information for a bounded period afterwards; recovery from one is a
 * controlled and audited act.
 *
 * **NULL, AND DELIBERATELY SO.** The window depends on the database plan
 * (LAUNCH.md records it as "at least 7 days" and says the figure depends on the
 * plan), so the actual value is a founder-side fact this repository does not
 * hold. **A plausible number here would read exactly like a verified one** and
 * would be a claim to members about how long their deleted information exists,
 * which is the worst possible place for a guess.
 *
 * While it is null the privacy notice renders the whole true paragraph and
 * OMITS the clause that names the window. Nothing false ships, nothing
 * placeholder-shaped ships, and the sentence is incomplete rather than wrong.
 * Set it to the value from the Neon plan (for example "30 days") and the clause
 * appears. The master notice at `docs/legal/privacy-notice.md` carries the same
 * blank for counsel.
 */
export const BACKUP_RETENTION_WINDOW: string | null = null;
