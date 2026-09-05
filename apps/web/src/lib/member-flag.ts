/**
 * The member's reading of `field_flag`, in ONE place.
 *
 * Founder ruling, 5 September 2026 (client-side doctrine Part One item 3, the
 * member never sees the machinery): the client playbook rendered the enum
 * verbatim, so a member read `CRITICAL`, `CAUTION` or `DELIGHT` on their own
 * record. CRITICAL becomes "Needs attention", CAUTION becomes "Worth knowing",
 * and DELIGHT reaches a member not at all, because it is the company's word
 * for how it categorises pleasing them.
 *
 * A flag with NO ENTRY reaches the member as nothing: no label, no styling and
 * no grouping. Absence is the default so a flag added tomorrow cannot appear
 * on a member surface by accident.
 *
 * WHY THIS IS A MODULE AND NOT TWO COPIES. The fix first landed only on
 * `(client)/playbook`, and the corporate "preview as client" surface kept
 * rendering the raw enum. Nothing was leaked, since that page is
 * corporate-only, and something worse in its own way happened: **the preview
 * whose entire purpose is to show what the member sees began showing something
 * else.** It is the surface a section 4 check reads to confirm the client
 * projection, so a divergence there is a check that quietly stops checking the
 * thing it names. One map, both readers, and the preview cannot drift from the
 * page again.
 *
 * The HM preview is deliberately NOT a caller: a house manager reads the
 * company's own vocabulary, and translating it there would hide the machinery
 * from the people who operate it.
 *
 * This file is a scanned copy source (`client-copy.test.ts`), because member
 * labels living in a `.ts` would otherwise sit outside the census, which
 * derives from the `.tsx` the app renders. That is the no-scanned-root-covers-it
 * gap, met before it opened rather than after.
 */
export type MemberFlag = { label: string; cls: string };

const MEMBER_FLAG: Record<string, MemberFlag> = {
  CRITICAL: { label: "Needs attention", cls: "flag-attention" },
  CAUTION: { label: "Worth knowing", cls: "flag-know" },
};

export function memberFlag(flag: unknown): MemberFlag | null {
  return (typeof flag === "string" && MEMBER_FLAG[flag]) || null;
}
