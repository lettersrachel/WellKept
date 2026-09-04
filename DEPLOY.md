# Deploying Well Kept (pilot scale)

Four managed services, all with free/hobby tiers that fit the pilot. Create
the accounts (owner: founder), then the wiring below is mechanical.

| Service | For | You create |
|---|---|---|
| [Neon](https://neon.tech) | Postgres 16 | project → copy the **pooled** connection string |
| [Upstash](https://upstash.com) | Redis (queue) | database → copy the `rediss://` URL |
| [Vercel](https://vercel.com) | apps/web | account linked to the GitHub repo |
| [Resend](https://resend.com) | magic-link email | API key + verify your sending domain |

## 1. Database (Neon)

```sh
export DATABASE_URL='postgres://...neon.tech/wellkept?sslmode=require'  # pooled string
pnpm --filter @wellkept/schema db:migrate
pnpm --filter @wellkept/schema db:seed     # 258-field template + demo accounts
pnpm --filter @wellkept/schema db:demo     # optional: Fernbrook demo content
```

Real-household provisioning (until the admin UI exists) is SQL: insert
`auth_user` (email) + `household_role_assignment` (user, household, role).
ADR-001 guardrail 3: real household data enters only with that household's
written consent. Guardrail 2: no real S3 values before the vault sprint —
the schema and app enforce vault-pending regardless.

## 2. Web app (Vercel)

Project settings:
- **Root Directory**: `apps/web` (framework auto-detects Next.js; pnpm
  workspace is picked up from the repo root automatically)
- **Environment variables**:

| Var | Value |
|---|---|
| `DATABASE_URL` | the Neon pooled string |
| `REDIS_URL` | the Upstash `rediss://` URL |
| `AUTH_SECRET` | `openssl rand -hex 32` — the app REFUSES to boot production on the dev secret |
| `RESEND_API_KEY` | from Resend — production sign-in THROWS without it (a silent unsent link is a lockout) |
| `WK_KMS_KEY` | `openssl rand -base64 32` — vault KEK; production refuses to boot the vault without it |
| `AUTH_EMAIL_FROM` | `Well Kept <signin@yourdomain.com>` (the domain you verified in Resend) |

Then point your domain at the Vercel project — when you have one. As of
2026-07-27 NO custom domain is configured (`vercel domains ls` shows zero);
production is served at the project's `*.vercel.app` alias. Note the team
carries a second, dormant Vercel project (`well-kept-web`, git-connected,
zero env vars, auto-deploys on every push) — the live project is
`wellkept`, the one holding all ten env vars. Don't debug against the
wrong one.

**Deploying.** CORRECTED 4 September 2026 (G-120): the live project's
Ignored Build Step is Behavior Automatic with no override, so it DOES
auto-deploy on push. Every earlier version of this line ("does NOT
auto-deploy; every production deploy is manual") described the effect
of a disconnected GitHub integration, not a setting. Auto-deploy ships
the web build with NO migration step, which is the unsafe skew
direction; the ordered path below is the only one that migrates first,
and it stays the only sanctioned way to ship.
`bash tooling/deploy.sh <sha-from-the-merged-PR>`
runs the whole mechanical sequence as a gate - named-sha check, its own
cd to the repo root, migrate, three-way migration-count assertion,
required-env-presence check (names only, never values; added 2026-07-29
after a rm-then-failed-add left the project with no WK_KMS_KEY),
deploy, expected-project verification, triple build-id read, mechanical
smoke checks - refusing non-zero at the first mismatch. `--selftest`
proves the refusals fire. `--preflight <sha>` is READ-ONLY as of
2026-08-25 (G-63): it verifies the sha, tree, env, and project link,
and REPORTS pending migrations without applying them; before that
date the preflight ran the migration, which is how the 0037-0055
batch reached production ahead of its build. The selftest proves the
write path never fires under preflight. Two invocation rules, both
learned 2026-07-28:

- **Name the sha from the merged PR** (copy the merge commit GitHub
  shows). Never pass `$(git rev-parse HEAD)`: that compares HEAD to
  itself. Since round seven the gate ENFORCES this rather than trusting
  it: it fetches and refuses any sha that is not on `origin/main` (which,
  with branch protection, also means its required checks were green), and
  refuses a dirty working tree, because the deploy ships the tree, not
  the sha. A locally derived sha from an unpushed tree cannot pass.
- **The connection resolves inside the script.** It uses `DATABASE_URL`
  from the environment or reads `.neon-connection` at the repo root,
  after its own cd, so a caller shell sitting in `apps/web` cannot make
  a `$(cat ...)` miss and pass an empty value (the cwd-drift failure,
  second occurrence). Setting `DATABASE_URL=...` inline still works and
  still wins. The manual form remains for reference: from
the REPO ROOT of an up-to-date `main` checkout,
run `npx vercel --prod --yes`. Always the repo root — never from
`apps/web`, even though that is the project's configured Root Directory:
`apps/web` has no `.vercel` link, so `--yes` there suppresses the only
prompt that would have saved you and silently CREATES A THIRD Vercel
project instead of deploying this one (caught live 2026-07-27). After the
deploy, `/api/build-id` must equal the commit you deployed.

## 3. Worker (Railway / Render / Fly — any Docker host)

Deploy from the repo with `services/worker/Dockerfile` (build context =
repo root). Env: `DATABASE_URL`, `REDIS_URL` (same values as above).
One instance is plenty; commands are idempotent so restarts are safe.

Seed the trigger library once: `DATABASE_URL=... pnpm --filter @wellkept/worker seed:rules`

## 4. Smoke checklist (after every deploy; extended 2026-07-25 for the rev-4 surfaces)

**The write-heavy items (3, 6, 7, 9, 11, 13) run against the SMOKE TEST
FIXTURE, never a client household** (G-23 — the incident register is
append-only by design, so a checklist incident on a real household is
permanent; the 2026-07-27 run proved this bites in practice — the operator
naturally acts on whichever drill-in is already open, so every item below
names the fixture explicitly). Setup is one idempotent command (safe to
re-run every deploy; prints the FIXTURE_UUID the checklist needs, and
seeds the checklist's props: a cascade-bound `medication` field with a
pending client edit for item 3, and a visit photo for item 11):

    cd apps/web && DATABASE_URL=... WK_ADMIN_EMAIL=<your corporate login> node scripts/ensure-smoke-fixture.mjs

**If that command REFUSES with a pinned-id mismatch, read this before
doing anything.** Since 2026-08-27 the fixture is resolved by a pinned id
in `tooling/fixture-ids.mjs`, not by its display name (G-71: shared
household names are permitted under R17, so a name lookup agreed with the
record by luck). The script created its household with a random uuid
before that change, so **every database seeded under the old script holds
a DIFFERENT id for the same fixture**, and the pinned value is
production's. The refusal is that divergence, surfaced rather than
compounded. What to do depends entirely on which database you are on:

- **A disposable database (local, or a CI run):** it predates the pin.
  Delete the mismatched household named in the refusal and re-run, and
  the script recreates it at the pinned id. One time only.
- **PRODUCTION: stop.** Either the pin is wrong or the fixture was
  recreated. Re-pin `tooling/fixture-ids.mjs` from the real row. Do NOT
  let anything create a second fixture, which is the failure the refusal
  exists to prevent.

The script never creates a row when a same-named household already
exists at a different id, so a wrong pin cannot compound while you work
this out.

The fixture carries `is_fixture=true`: excluded from fleet counts,
economics totals, and the weekly digest; rendered dimmed + tagged where it
appears; `archive-demo-data.mjs` exempts it by column and REFUSES to run
if no live fixture exists. It is not a client and never will be. Before
go-live the demo households serve; after go-live the fixture is the only
safe target.

**Migration counting (C3, so nobody re-derives it):** migration files
number from `0000`, so "N applied in the database" means files `0000`
through `N-1` — 23 applied = `0000`…`0022`. State counts as "N in the
database, N on disk" and let the filenames carry the rest.

**Step zero, before ANY manual check: hard-refresh every open tab of the
app (Cmd+Shift+R), and again after every redeploy mid-run.** A page loaded
before a deploy carries dead client JS and stale server-action IDs — its
buttons and forms fail with NO feedback, indistinguishable from the silent
no-op gates. This cost the 2026-07-27 run two false failures (G-29).

**Checks 1, 4, and 12 are scripted** — run them first, then work the
manual ones:

    BASE=https://<your-prod-host> DATABASE_URL=... bash tooling/smoke-mechanical.sh

1. `https://app.yourdomain.com/api/health` → `{"ok":true,"db":"up"}`
2. `/signin` → request a link for your own email → it arrives via Resend →
   clicking lands you per your role assignment
3. On the FIXTURE drill-in: approve the seeded pending client edit on the
   `medication` field (the fixture script re-seeds one each run) → a
   `field_write` row lands in `audit_event` → the worker host's logs show
   the field-change job → the fixture's anticipation panel gains meds-day
   items. If the approval visibly does nothing, do NOT count pre-existing
   panel items as a pass: the approval action silently no-ops when the
   edit is no longer pending or your role on that household isn't
   corporate_admin — the `field_write` row is the proof, not the panel
4. Dev-gated surfaces are actually gated — BOTH return 404 in production:
   `/dev/last-email` AND `/api/dev/trigger-pass` (POST). Standing rule:
   every new dev-gated surface gets its own 404 line here (G-15)
5. An s3 reveal → audit row present in `audit_event`. Until the fixture's
    sealed s3 value exists this proves the AUDIT path only (the reveal
    returns the vault-pending placeholder; discovered 2026-07-28 with zero
    vault_item rows in the whole database). Once the fixture value is
    sealed, the same check is a true vault round-trip: expect the fake
    alarm-code value, not vault-pending. The KEK itself is now validated
    at BOOT (instrumentation.ts), so a mis-encoded WK_KMS_KEY fails the
    deploy's smoke checks instead of the vault sprint.
6. A household drill-in shows the **Household consent card** — red
   NO-CONSENT banner on any household without a recorded consent
7. On the FIXTURE drill-in: log a test incident (kind `other`, low) → it
   appears open on the drill-in, and the fleet board's dimmed fixture row
   gains "· 1 open (checklist 13b resolves it)". (Fixtures are excluded
   from the main table, so the Queues-column red flag can NEVER appear
   for the fixture — that flag is for client households only.) LEAVE IT
   OPEN — item 13a needs it; it's resolved at 13b
8. **CEO previews**: drill-in → View as client and View as HM both render
   (the client preview running without error IS the live payload-guard
   pass); the switcher banner flips all three ways
9. Create a topic exclusion on a test household → confirm the excluded
   text stops appearing in newly generated prompts; end the exclusion
10. Both briefing surfaces show the "Last year at this time" section (its
    empty-state note counts — recall is dark until a year of history)
11. On the FIXTURE drill-in: the seeded visit photo shows the Hold and
    Reuse toggles (you hold corporate_admin there by the fixture script's
    grant — on households where your role is house_manager the toggles
    are correctly absent, which is authorization working, not a defect);
    toggling each writes an audit row
12. `app_setting` rows exist in production with intended values:
    `photo_retention` (`{"days":90}`) and `rule_health`
    (`{"actRateFloor":0.25,"minHouseholds":3,"minUsers":2}`) — insert
    them if absent; a missing key is a missing knob, defaults only cover
    code paths that read them. (`rule_health` may later gain an optional
    `informativeRateFloor` — Session A, founder sets it after real pilot
    numbers; its ABSENCE is intentional and means no retirement flag.)
    `visit_reconciliation` is FOUNDER-SET (2026-07-28, `{"gapDays":10}`):
    the script asserts its presence and shape but never repairs it — the
    value is the founder's, and turning it off is `{"gapDays":null}`,
    never a deleted row, so an absent row means a lost knob and fails.
13. The erasure tool, twice, against the household carrying item 7's
    still-open incident (G-15 — the guard must FIRE, not just exist):
    a. Dry-run it now → the tool must REFUSE with the open-incident
       message (exit 2). A build where it prints a plan instead has lost
       the G-03 guard.
    b. Resolve item 7's incident with a note (flag clears on the fleet
       board), dry-run again → now read the plan it prints (counts, hold
       handling). Do NOT `--commit`
14. `/oversight/triggers` shows the health line on every rule (the
    denominator is the 3 seeded cascades, not the six trigger families;
    zeros are fine pre-pilot)

Sharp edges the 2026-07-27 run paid for (symptoms → causes):

- **A page that ends abruptly** (cards you know exist just aren't there,
  Cmd+F finds nothing, no error anywhere) is a serverless function killed
  at its time ceiling MID-STREAM — the browser keeps whatever HTML
  arrived. Nothing throws; Vercel logs `responseStatusCode: -1`. The
  oversight pages now export `maxDuration = 60` for headroom, but a slow
  dependency (that day: an over-quota Upstash Redis inflating every
  request) can still do this. Suspect the infrastructure before the
  feature.
- **After every deploy, refresh open tabs** (and tell any active user to)
  — a tab loaded before the deploy carries dead client JS and stale
  server-action IDs: buttons that do nothing, forms that silently no-op.
  Since 2026-07-27 the app also detects this itself (G-37): a stale page
  overlays a red "refresh now" banner within a minute or on tab refocus,
  via `/api/build-id`. The manual refresh stays as belt-and-braces.
- **`/api/build-id` can serve one stale reading mid-alias-flip** — a curl
  fired within seconds of the deploy can catch the old build while the
  alias switches, reporting a mismatch for a deploy that succeeded. A
  false negative here opens a diagnostic round into a non-problem (the
  G-38 shape). Re-read a mismatch once, a few seconds later, before
  believing it; only a mismatch that persists is real.
- **A deploy order is only executable against a named main sha.** Three
  times in the 2026-07-27 runs, the commit a deploy expected was still in
  an unmerged PR when the order was read; migrating on the first pull
  would have left the database ahead of (or behind) the code the deploy
  shipped. Rule both directions: whoever orders a deploy names the merge
  commit; whoever runs it confirms `git log --oneline -1` shows that sha
  BEFORE `db:migrate` — the migrate-then-deploy coupling is exactly where
  a premature pull turns into code querying tables that do not exist.
- **`npx vercel --yes` from an unlinked directory creates a NEW project**
  rather than failing — the flag exists to skip confirmations, and the
  confirmation it skips is "set up and deploy this directory?". Deploy
  from the repo root only (§2). This fired for real on 2026-07-28: a
  deploy chained after a `cd packages/schema` used for a migration check
  silently created a third project. The rule is narrower than "check the
  directory": **a `cd` inside a chained command persists into everything
  after it**, so a deploy gets its OWN invocation with an explicit
  `cd` to the repo root, never appended to a chain that moved elsewhere.
  Cleanup note: `vercel project rm <name>` prompts even with
  `--non-interactive`; pipe `y` to it. Verify the target holds only the
  stray deployment before removing.
- **A docs-only merge still moves the build id** — the G-37 skew banner
  keys on the commit sha, so any deploy of any merge makes parked tabs
  prompt for a refresh, code change or not. Correct behaviour; don't
  read it as a failed deploy.
- **A magic link that never arrives can still return the success page** —
  the failing Resend send has been observed returning the normal
  `/verify-request` redirect. Retry once before debugging; check the
  Resend dashboard's delivery log before blaming the app.

## Not covered here (later tiers)

Vault/KMS sprint before real S3 data; TestFlight for the mobile app; rate
limiting + backups + monitoring; the pilot's paper-parallel protocol
(ADR-001) — the app mirrors visits, paper remains the record.
