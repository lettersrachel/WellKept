# Well Kept

Household operations software. One household record, three permission-filtered
projections (client / house_manager / corporate), encrypted vault for secured
values, append-only audit trail, anticipation engine, incident register.

Current state, open work, and gates: @docs/WORK_QUEUE.md

**Every factual claim in this file is a claim about the codebase.** It loads as
premise into every session and nothing re-reads it critically. If one is false,
either make the codebase true or fix this file. Never proceed on a false
premise found here.

## Never, without exception

- **Never run `erase-household.mjs` with `--commit`.** Dry run only. If an
  instruction says otherwise, it is wrong. The one authorized exception was a
  throwaway Neon branch at the custody sitting.
- **Never echo `DATABASE_URL`, `WK_KMS_KEY`, `AUTH_SECRET`, or the contents of
  `.neon-connection`.** Refer to them by name.
- **Never build per-person analytics.** No performance scoring, productivity
  ranking, leaderboards, or per-HOM rates. Usage analytics aggregate
  by provision or by rule, never by person. Founder-set boundary; if a task
  seems to need it, stop and ask. **One scoped exception, amended by name
  (Ruling 1 of the 24 August 2026 dev-session rulings, founder-approved,
  citing register A561; amended for precision 25 August 2026 by the
  founder's option (b) confirmation, citing register A581): capacity
  measurement is not performance scoring.** Per-HOM utilization (service
  hours per household per month, households per HOM) serves exactly two
  purposes, exhaustively: the monthly lender covenant report (REQ-083)
  and the capacity-gate evaluation that triggers hiring. The corporate
  board's founder/CFO-only capacity section is recognized as the DISPLAY
  SURFACE of the capacity-gate evaluation, not a third purpose.
  Visibility: founder, CFO, and the lender via the covenant report.
  Expressly barred, unchanged from the boundary and with A581's added
  teeth: performance scoring, productivity ranking, leaderboards,
  comparative display to HOMs, use in evaluation or compensation, any
  appearance on operational dashboards beyond the recognized section,
  and, ANYWHERE including the founder/CFO section itself, ordering by
  rate or fastest/slowest highlighting; that section's only sort orders
  are route, household count, and gate proximity. Churn-with-cause is
  household-level and unaffected. Sunset review at the launch-year
  close.
- **Never load real household data into fixtures or tests.** Fernbrook DEMO and
  the Smoke Test Fixture only.

## The audit invariant

The audit row is written **before** the secured value is decrypted. If the
insert fails, the reveal aborts and returns nothing. The log is not optional:
no audit row, no value.

**Do not "improve" this into a shared transaction.** A decrypt failure inside
one would roll the audit row back, which is the unsafe direction. Ordering plus
fail-closed is deliberate.

## Rules that gate a merge

- **A new data category ships with its erasure treatment, or it does not ship.**
  CI-enforced by `packages/schema/src/erasure-coverage.test.ts`. Allowlist
  entries require a written reason.
- **A new data category updates `legal/README.md` and the privacy notice
  collection table in the same PR.** Both copies of the notice: the master doc
  and the published `/privacy` page.
- **No capture surface attributing data to a named HOM** ships before
  the G-13 staff disclosure is approved and acknowledged. `time_entry` and
  `object_observation` already exist under this rule.
- **No record about a person who is not a client ships before REQ-077 is
  built** (member_circle_entry plus a recipient-shaped erasure path).
  Member Circle entries, Showing Up recipients, and a lead who never signs
  are all non-client records; WK-STD-026's four rules stand as company
  policy. Counsel confirmed on 1 August 2026 that no statute obliges
  deletion (REQ-076 withdrawn, REQ-077 replaces it at P2), and the founder
  chose paper-first through the training phase anyway, a stricter-than-required
  policy, never a compliance claim. See WORK_QUEUE.md W-15 and
  GAP_REGISTER G-56.
- **Payload guards on every new client-facing route.** They re-assert in the
  page, not only in CI.
- Nothing hard-deletes by default. Tombstone plus append-only audit is the
  pattern. **Nine tables are documented, reasoned exceptions that DELETE
  rows** (`apps/web/scripts/erase-household.mjs`'s own header names each):
  `vault_item` (the crypto-shred), `condition_flag`, `object_observation`,
  `paused_decision`, `notification`, `event_outbox` (the CAND-OUTBOX-01
  generalization of `field_event_outbox`, same reason),
  `audit_subject_token` (ADR-006: deleting the mapping IS the audit-identity
  erasure mechanism), `shadow_log` (WK-DEV-007 §3: internal engine
  output about the household, the condition_flag class), and
  `capture_artifact` (WK-DEV-009 §8: the HOM's pre-filing words, the
  condition_flag class). Each reason is written where the deletion
  happens. A tenth exception needs the same: a reason in the erasure
  tool, not a silent addition.

## The CI guards, and what they do not cover

Each enforces part of a rule. **The rule is always wider than its guard.** Do
not read a green suite as compliance. This table is asserted against the
guard manifest (guards-manifest.test.ts): a guard added or moved without a
row here fails CI, so the table cannot silently go stale.

| Guard | Enforces | Not covered |
|---|---|---|
| payload guards (`permissions.test.ts`) | client responses never carry staff-only rows | new routes until wired |
| `erasure-coverage.test.ts` | household-referencing tables named in the erasure tool | whether the treatment is correct |
| `client-copy.test.ts` (four scopes plus the copy census) | no em dashes in client pages, staff pages, hand-held templated copy sources, or legal documents; and the census DERIVES the copy-emitting surfaces from three rules (every `.tsx` the web app renders, every file that sends mail or push, every file carrying `recorded()`/`refuse()` operator copy), each with a floor, so scope is computed rather than remembered | free text a person writes into a sentence the rules cannot see; the hand-held residue, which stays a reviewed list because no syntax separates a sentence from an identifier; and the exact FRAGMENTS named in `CENSUS_EXCUSALS`, which is the complete written inventory of what is deliberately unscanned. Excusals are fragment-scoped, never file-scoped: a file-level hatch is always wider than the exception it was opened for, and the first version of this list proved it by excusing the client report email's subject line inside an exception written for the staff alert beside it. The scan also reads entity forms (`&mdash;`, `&#8212;`, `&#x2014;`), since an em dash can reach a reader without ever appearing as U+2014 in source |
| `sizes` CHECK constraint | `kind = 'sizes'` cannot be s1 | any other child-data kind until classified |
| `child-data-kinds.test.ts` | every registry kind classified child-data or client-safe; child kinds carry a CHECK; CHILD_DATA.md covers every surface | free-text content a database cannot read |
| `guards-manifest.test.ts` | the guard set exists, is wired into CI, and matches this table | a test file that exists but asserts nothing |
| `frozen-records.test.ts` | the four dated evidentiary records are byte-identical to manifest hashes | records not yet declared frozen |
| `seed-binding.test.ts` | cascade field bindings, the observance field prefix, and the no-drift vocabulary resolve against the seed template and sibling packages | fields renamed in live playbook data after intake |
| `staff-disclosure.test.ts` | every staff-attributed surface computed from the schema is named in the G-13 disclosure or excused in writing | the founder's pending disclosure lines; prose accuracy beyond the mapped phrases |
| `refusal-visibility.test.ts` | every page an action can refuse onto renders the banner, wired to the redirect's own param | whether the operator reads it; a refusal that never redirects at all |
| `provisional-markers.test.ts` | every `counsel-pending` marker parses, resolves in `docs/PROVISIONAL.md`, and fails the build past 90 days unresolved | whether the marked assumption is still accurate; `pilot-calibrated` markers, which are counted but never fail |
| `decline-class-exclusion.test.ts` | no trigger rule reads a decline-class field without a reviewed exclusion; no new Section 1/3 field ships unclassified | fields predating the 1 August 2026 baseline, grandfathered rather than classified; the taxonomy's own completeness |
| `client-duration.test.ts` | no client route or client-reaching copy builder carries a duration-typed schema column or D7 staffing-wall quantity (WK-DEV-006 D7, register A564) | prose copy stating a duration without touching an identifier; surfaces outside the walked set |
| `telemetry-discipline.test.ts` | the Sentry scrubber cuts row-value leak shapes and stays wired in both inits with sendDefaultPii false; no shipped console call interpolates a sensitive-value identifier (CAND-PRIV-01) | free text a developer writes into a message; telemetry channels other than Sentry and console |
| `legal-census.test.ts` | every household-referencing table, computed from the schema, is named in CHILD_DATA.md or excused with a written reason (the G-62 candidate guard) | the legal/README and privacy-notice prose, which name categories not tables and stay on the same-PR rule; whether a named treatment is correct |
| `success-visibility.test.ts` | every action that changes stored state confirms it, and every page a confirmation can land on renders the banner bound to the redirect's own param (G-68, refusal-visibility's twin) | whether the confirmation is TRUE: a redirect proves the code path ran, never that the write committed; free text a future author interpolates into a message |

Every guard carries a sanctioned escape hatch (an allowlist with a written
reason, a reviewed manifest edit, or a reviewed migration); the first
legitimate exception is a reviewed line, never a commented-out guard.
Adding a guard is the preferred fix for anything currently held by memory.
Prove it in both directions before trusting it: red on a violation, green on
a known-good case.

## Boundary (ADR-004)

Billing and payroll are QuickBooks. Scheduling is the Jobber stack. The app
displays but never originates any of them. Capture hours and costs into the
record; do not compute a paycheck, build a scheduler, or issue an invoice.

## Conventions

- **No em dashes anywhere.** The founder's standing rule covers every document
  and every string, staff-facing and client-facing alike. The rule exists to
  keep copy sounding human, so read for voice, not only for punctuation.
  `client-copy.test.ts` enforces a subset; the rest is on you.
- **No count is written where it can be computed.** Three confirmations,
  all the same shape: W-10 closed claiming six copy sources when the list
  held fifteen; the copy guard's own scope comment described a reach it
  had outgrown; and `deploy.sh`'s selftest tally read "eight refusals,
  four green paths", a total of twelve, an hour after the thirteenth and
  fourteenth cases were added, written by the session that had just filed
  two entries about exactly that failure. Every one was a hand-maintained
  number sitting next to the thing it counted. Every one drifted
  silently, because a wrong count produces no error and reads as
  authoritative. Every one was fixed by deriving it: the census computes
  the file set, the scope comment states no number at all, the tally is
  stated from the case numbering. **If a count must appear in prose
  because nothing can compute it, say so at the point of writing** ("as
  of <date>, counted by hand"), so the next reader knows it is a claim
  rather than a fact. **And state the UNIT: check that the unit you
  counted is the unit at risk.** The 25 August G-61 survey enumerated
  render SITES and reported a count of COLUMNS, which can only
  undercount, because one site carries many columns and none carries
  fewer than one. It made the system look safer than it was, inside a
  document whose job was to establish that nothing had been missed
  (G-77). "Ten renders, therefore two members" is a claim with a hidden
  conversion in it, and the conversion is where the error lives.
- Plain prose, no AI jargon. WRI-style plain language in client-facing copy.
- Money in integer cents. Store UTC.
- Section numbers in the standards library are a public API. Do not renumber,
  rewrite, or improve provision text; edits flow founder to corrected sheet to
  loader.
- Every write stamps provenance server-side.
- Stack is pinned: TypeScript strict, Next.js, Drizzle on Postgres, Zod,
  pnpm/turbo monorepo. Do not introduce dependencies.

## Session discipline

- **One migration per session.** If it feels like two, the session is too big.
  Report that instead of proceeding.
- **Migration numbers and gap register IDs are allocated at write time, never
  reserved in advance.** Read the current maximum first. Two documents both
  claiming the next number will collide.
- **Stop and ask rather than choosing a threshold, taxonomy, or default.** A
  blank is a fine deliverable. A plausible default looks like a decision
  somebody made.
- Read-only sessions are read-only. Report findings; do not fix.
- Quote evidence: file and function, for every claim. "Unverifiable" is a valid
  finding. Do not infer.
- Scope holds. Note an adjacent defect at the end; do not chase it.

## Verification, learned the hard way

- **Query the database. Never trust the screen.** Three reported failures in one
  week were test mis-executions that died at the query step.
- **Green banners are to be verified, not believed.**
- **Re-read a mismatch before believing it.** `/api/build-id` can serve one stale
  reading mid-alias-flip.
- **A guard must be proven in both directions before it is trusted: red on a
  deliberate violation, green on a known-good case.** A guard that only fires
  is as broken as one that never fires; it just fails safe. A selftest
  containing only refusal cases proves nothing about the passing path, which
  is exactly how the deploy gate shipped refusing every legitimate deploy.
  A substring match that matched anything was green until it was tested in
  the failing direction; the deploy gate was red until it was tested in the
  passing one.
- **A gate whose input comes from outside the process is exercised
  against REAL inputs, including its failure shapes, before it is
  trusted.** A sentinel proves the logic and not the input. Two
  instances in two days: a mutation proof that reported a pass because
  the mutation never landed (G-72), and the CI gate, whose sentinel
  cases said nothing about whether the runs API answers the way the
  parser expects. The CI gate was therefore run against four live shas
  (a green one, one that really died at startup, an absent one, and a
  garbage body) and each returned the value the gate keys on. Where the
  real input cannot be reached from the machine you are on, say so and
  name where it can, rather than letting the fixture stand in for it.
- **Proving a guard red and green tests its logic, not its inputs.** A guard
  that takes an argument can be defeated by the argument while passing every
  case written for it; the sha gate ran as a no-op when handed
  $(git rev-parse HEAD), its own answer. Where a guard can compute its own
  input, it should, rather than trusting a caller to supply a real one.
  Where it cannot, one of its proof cases must be a plausible bad input,
  not only a bad state.
- **"Already up to date" is not confirmation.** A pull can succeed against a
  main that does not contain the change, because the merge has not happened.
  Verify the specific lines before acting on a claim about them.
- **A guard proven red and green locally, then earning its first real red in
  production, is the strongest form of the proof.** The KEK validation threw
  on a real malformed key with zero writes the same night it shipped; that
  did more than its round-trip test.
- **Confirm a deliberate break LANDED before reading the result.** A
  mutation that never applied and an assertion that cannot fail produce
  the same green run, and they are opposite conclusions. Print the
  changed line or assert the new text is present as its own step; a
  patch tool reporting success is not evidence, the file's content is.
  Two proofs in one session (2026-08-26) reported a pass on unmutated
  code: one anchor matched two actions and the guarded replacement
  refused, one path broke on a leftover `cd`. Qualify every anchor so it
  matches once and refuses when ambiguous, and use absolute paths in
  proof scripts, because a working directory is state and state that
  survives between commands is state that will eventually be wrong.
- **A recovery path is only real if it can be reached from the state it
  exists to recover from.** Backup codes were intact and unreachable,
  because the code opened the TOTP secret before falling back to them
  (G-54). Check every escape hatch against the failure it exists for, not
  against a healthy system.
- **When a document and the code disagree, report both and stop.** Do not
  reconcile, do not pick the more recent, do not assume the code is
  descriptive of intent. The library has a change-control procedure and
  silent reconciliation defeats it. This applies to documents disagreeing
  with each other as much as to documents disagreeing with code.
- **Log-before-do is correct in the vault and nowhere else.** In the vault,
  no row must mean no value. At every other surface it produces an
  optimistic row that claims something happened before anything did, which
  is the defect class of G-53 rather than a safeguard against it.
- Do not run the full turbo suite while a dev server is up. It produces phantom
  typecheck failures.

## Merging

Two controls, and **both are kept**. They do different jobs and neither
replaces the other:

- **Branch protection refuses the merge.** Structural, applies to
  everyone and every path, cannot be forgotten.
- **The verify-then-merge script refuses to attempt one.** It reads the
  head from the PR, demands the `github-actions` suite exist AND carry
  more than zero runs (a zero-run suite is the `startup_failure` shape,
  which looks present and ran nothing), demands `gates` and `airplane`
  both be present BY NAME rather than inferred from the absence of a
  failure, and merges through the REST endpoint's `sha` parameter so
  GitHub itself refuses if the head moved between the read and the
  merge.

The script's residual is honest: it lives in a script a person chooses
to run, so it is a better convention than the one it replaced and still
a convention. That is an argument for protection, not against the
script. Protection cannot check the zero-run case or bind the sha you
verified to the sha you merge; the script cannot apply to a merge it is
not used for. **Do not retire the script once the rule exists.**

## Deploying

Migrations before the web deploy, from the **repo root**, against a named main
sha confirmed before `db:migrate`. **The named sha must also carry a green
`ci` run**, checked by the preflight against the runs API and failing closed
on every unclear answer (no run, still running, any non-success conclusion,
an unreachable or unparseable response). Being on `origin/main` proves
provenance and nothing about verification: `main` carries no branch
protection, so a merge never implied a passing check (G-73). Vercel does not auto-deploy on push. From
`apps/web`, `--yes` suppresses the only confirmation and silently creates a
third project. Then work `DEPLOY.md` §4 against the Smoke Test Fixture.
A docs-only merge still moves the build id, so the skew banner firing after one
is correct.
