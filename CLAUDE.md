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
  ranking, leaderboards, or per-House-Manager rates. Usage analytics aggregate
  by provision or by rule, never by person. Founder-set boundary; if a task
  seems to need it, stop and ask.
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
- **No capture surface attributing data to a named House Manager** ships before
  the G-13 staff disclosure is approved and acknowledged. `time_entry` and
  `object_observation` already exist under this rule.
- **Payload guards on every new client-facing route.** They re-assert in the
  page, not only in CI.
- Nothing hard-deletes. Tombstone plus append-only audit. The vault crypto-shred
  is the single deliberate exception and it is documented as such.

## The CI guards, and what they do not cover

Each enforces part of a rule. **The rule is always wider than its guard.** Do
not read a green suite as compliance. This table is asserted against the
guard manifest (guards-manifest.test.ts): a guard added or moved without a
row here fails CI, so the table cannot silently go stale.

| Guard | Enforces | Not covered |
|---|---|---|
| payload guards (`permissions.test.ts`) | client responses never carry staff-only rows | new routes until wired |
| `erasure-coverage.test.ts` | household-referencing tables named in the erasure tool | whether the treatment is correct |
| `client-copy.test.ts` (three scopes) | no em dashes in client pages, templated staff/email copy, or legal documents | anything outside the scanned roots and source list |
| `sizes` CHECK constraint | `kind = 'sizes'` cannot be s1 | any other child-data kind until classified |
| `child-data-kinds.test.ts` | every registry kind classified child-data or client-safe; child kinds carry a CHECK; CHILD_DATA.md covers every surface | free-text content a database cannot read |
| `guards-manifest.test.ts` | the guard set exists, is wired into CI, and matches this table | a test file that exists but asserts nothing |

Every guard carries a sanctioned escape hatch (an allowlist with a written
reason, a reviewed manifest edit, or a reviewed migration); the first
legitimate exception is a reviewed line, never a commented-out guard.
Adding a guard is the preferred fix for anything currently held by memory.
Prove it red before trusting it green.

## Boundary (ADR-004)

Billing and payroll are QuickBooks. Scheduling is the Jobber stack. The app
displays but never originates any of them. Capture hours and costs into the
record; do not compute a paycheck, build a scheduler, or issue an invoice.

## Conventions

- **No em dashes anywhere.** The founder's standing rule covers every document
  and every string, staff-facing and client-facing alike. The rule exists to
  keep copy sounding human, so read for voice, not only for punctuation.
  `client-copy.test.ts` enforces a subset; the rest is on you.
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
- **A guard must fire, not merely exist.** Prove a new check red before trusting
  it green. A substring match that matched anything was green until it was
  tested in the failing direction.
- Do not run the full turbo suite while a dev server is up. It produces phantom
  typecheck failures.

## Deploying

Migrations before the web deploy, from the **repo root**, against a named main
sha confirmed before `db:migrate`. Vercel does not auto-deploy on push. From
`apps/web`, `--yes` suppresses the only confirmation and silently creates a
third project. Then work `DEPLOY.md` §4 against the Smoke Test Fixture.
A docs-only merge still moves the build id, so the skew banner firing after one
is correct.
