/** REQ-022 allowlist: clients self-serve only travel dates, contact
 * changes, and preference/date notes — everything else changes through
 * the HM conversation. Enforced server-side in proposeEdit; the client
 * UI mirrors it by hiding the affordance. */
const CLIENT_EDITABLE_PATTERNS = [
  /travel/i, /important-dates/i, /contact/i, /mobile, email/i, /preference/i,
  /standing orders/i, /mailing list/i, /household summary/i, /sizes registry/i,
];

export function isClientEditable(fieldName: string): boolean {
  return CLIENT_EDITABLE_PATTERNS.some((p) => p.test(fieldName));
}
