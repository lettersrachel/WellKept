---
status: living
---
# Decision Rights: confirm or amend

**Preparation batch item 8**, for the 25 September review. One page per tier,
so the pass is a page of yes-or-no rather than a database query.

**GENERATED, not transcribed.** Source:
`docs/intake/2026-09-04-founder-values/decision_rights_by_tier.csv` (frozen intake, adopted 4 September 2026).
Re-run `node tooling/review/decision-rights-sheet.mjs` and this file is
current by construction. **Do not edit it by hand**: an edit here is a second
copy of the values that drifts from the first, which is exactly what generating
it prevents.

## Read this before confirming

**`decision_right` holds ZERO rows today.** Every value below is the intake's
RECOMMENDED DEFAULT, not stored state, so **confirming one is a decision and
not a description**. Nothing in the software reads these yet: the routing half
of Q-5 that would consume them is blocked on Q-6.

**How to mark a row.** Write `Y` to confirm as stated, or write the amended
value in its place. A blank is not a confirmation and the row stays open;
that distinction is the whole reason the column exists.

**One row is marked non-negotiable across tiers** by the intake itself and is
reproduced on every page rather than once, so a tier page is complete on its
own.


---

# Essential

| # | Right | Recommended | Materiality | Y or amended value | Note |
|---|---|---|---|---|---|
| 1 | spend without asking per item USD | **$150** | money_legal |  | Standing vendors only; receipts always |
| 2 | spend without asking monthly cap USD | **$400** | money_legal |  | Cumulative auto-executed spend; inbox proposal above cap |
| 3 | emergency spend to prevent damage USD | **$500** | safety_access |  | Water gas electrical security only; member called immediately after |
| 4 | vendor substitution | **approved substitute only** | convenience |  | FallbackPlan steps permitted without asking |
| 5 | schedule visit shift hours | **4** | convenience |  | HOM may move a visit within this window without asking; outside it is an inbox item |
| 6 | recurring service booking | **confirm each** | convenience |  | Standing pattern = same vendor cadence and price band |
| 7 | accept deliveries and sign | **yes** | convenience |  | Never for controlled items or legal documents |
| 8 | open mail | **no** | money_legal |  | Correspondence handling is Concierge opt-in only |
| 9 | contact school or provider on behalf | **no** | money_legal |  | Never academic medical or disciplinary matters |
| 10 | manage calendar entries | **propose only** | convenience |  | Never move a member-owned commitment |
| 11 | purchase replacements for consumables | **par items only** | convenience |  | Pars per WK-STD-025 |
| 12 | grant vendor access to home | **never unattended** | safety_access |  | Physical access is never automatic; HOM present or member-authorized standing vendor |
| 13 | gift and occasion execution | **propose only** | convenience |  | Family writes the note; HOM makes it frictionless |
| 14 | pet care decisions | **routine only** | safety_access |  | Medical decisions always the member |
| 15 | travel prep | **checklist only** | convenience |  | Bookings always the member unless standing rule |
| 16 | decisions that always require member | **any spend above cap; any new vendor; anything touching a child's school medical or activity enrollment; access changes; anything a neighbor or third party asks; any change to a standing rule** | all |  | Non-negotiable across tiers |
| 17 | authority review cadence | **quarterly** | not set |  | Decision Rights re-confirmed at each quarterly review and after any LIFE-EVENT |

**17 rows.** Blank rows in the fifth column are unconfirmed.

---

# Family Operations

| # | Right | Recommended | Materiality | Y or amended value | Note |
|---|---|---|---|---|---|
| 1 | spend without asking per item USD | **$300** | money_legal |  | Standing vendors only; receipts always |
| 2 | spend without asking monthly cap USD | **$900** | money_legal |  | Cumulative auto-executed spend; inbox proposal above cap |
| 3 | emergency spend to prevent damage USD | **$1,000** | safety_access |  | Water gas electrical security only; member called immediately after |
| 4 | vendor substitution | **approved substitute or established backup** | convenience |  | FallbackPlan steps permitted without asking |
| 5 | schedule visit shift hours | **8** | convenience |  | HOM may move a visit within this window without asking; outside it is an inbox item |
| 6 | recurring service booking | **auto within standing pattern** | convenience |  | Standing pattern = same vendor cadence and price band |
| 7 | accept deliveries and sign | **yes** | convenience |  | Never for controlled items or legal documents |
| 8 | open mail | **no** | money_legal |  | Correspondence handling is Concierge opt-in only |
| 9 | contact school or provider on behalf | **logistics only** | money_legal |  | Never academic medical or disciplinary matters |
| 10 | manage calendar entries | **add logistics events** | convenience |  | Never move a member-owned commitment |
| 11 | purchase replacements for consumables | **par items only** | convenience |  | Pars per WK-STD-025 |
| 12 | grant vendor access to home | **attended or standing vendor with code** | safety_access |  | Physical access is never automatic; HOM present or member-authorized standing vendor |
| 13 | gift and occasion execution | **propose and execute under cap** | convenience |  | Family writes the note; HOM makes it frictionless |
| 14 | pet care decisions | **routine and vet logistics** | safety_access |  | Medical decisions always the member |
| 15 | travel prep | **checklist and holds** | convenience |  | Bookings always the member unless standing rule |
| 16 | decisions that always require member | **same** | all |  | Non-negotiable across tiers |
| 17 | authority review cadence | **quarterly** | not set |  | Decision Rights re-confirmed at each quarterly review and after any LIFE-EVENT |

**17 rows.** Blank rows in the fifth column are unconfirmed.

---

# Concierge

| # | Right | Recommended | Materiality | Y or amended value | Note |
|---|---|---|---|---|---|
| 1 | spend without asking per item USD | **$750** | money_legal |  | Standing vendors only; receipts always |
| 2 | spend without asking monthly cap USD | **$2,500** | money_legal |  | Cumulative auto-executed spend; inbox proposal above cap |
| 3 | emergency spend to prevent damage USD | **$2,500** | safety_access |  | Water gas electrical security only; member called immediately after |
| 4 | vendor substitution | **through vetted bench** | convenience |  | FallbackPlan steps permitted without asking |
| 5 | schedule visit shift hours | **24** | convenience |  | HOM may move a visit within this window without asking; outside it is an inbox item |
| 6 | recurring service booking | **auto within standing pattern** | convenience |  | Standing pattern = same vendor cadence and price band |
| 7 | accept deliveries and sign | **yes** | convenience |  | Never for controlled items or legal documents |
| 8 | open mail | **unless opted in** | money_legal |  | Correspondence handling is Concierge opt-in only |
| 9 | contact school or provider on behalf | **logistics only** | money_legal |  | Never academic medical or disciplinary matters |
| 10 | manage calendar entries | **add logistics events** | convenience |  | Never move a member-owned commitment |
| 11 | purchase replacements for consumables | **par and seasonal** | convenience |  | Pars per WK-STD-025 |
| 12 | grant vendor access to home | **attended or standing vendor with code** | safety_access |  | Physical access is never automatic; HOM present or member-authorized standing vendor |
| 13 | gift and occasion execution | **propose and execute under cap** | convenience |  | Family writes the note; HOM makes it frictionless |
| 14 | pet care decisions | **routine and vet logistics** | safety_access |  | Medical decisions always the member |
| 15 | travel prep | **checklist holds and vendor scheduling** | convenience |  | Bookings always the member unless standing rule |
| 16 | decisions that always require member | **same** | all |  | Non-negotiable across tiers |
| 17 | authority review cadence | **quarterly** | not set |  | Decision Rights re-confirmed at each quarterly review and after any LIFE-EVENT |

**17 rows.** Blank rows in the fifth column are unconfirmed.

---

## What this sheet cannot tell you, said plainly

- **Whether a value is right.** It shows what was proposed and by whom, never
  whether it fits a household.
- **Whether anything enforces it.** Nothing does today.
- **What happens between tiers.** Several rows read `same` on the higher
  tiers in the source; they render as the source wrote them rather than being
  expanded, because expanding one would be interpreting it.
