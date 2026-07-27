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

The fixture carries `is_fixture=true`: excluded from fleet counts,
economics totals, and the weekly digest; rendered dimmed + tagged where it
appears; `archive-demo-data.mjs` exempts it by column and REFUSES to run
if no live fixture exists. It is not a client and never will be. Before
go-live the demo households serve; after go-live the fixture is the only
safe target.

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
5. An s3 reveal → audit row present in `audit_event`
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
    numbers; its ABSENCE is intentional and means no retirement flag)
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
- **A magic link that never arrives can still return the success page** —
  the failing Resend send has been observed returning the normal
  `/verify-request` redirect. Retry once before debugging; check the
  Resend dashboard's delivery log before blaming the app.

## Not covered here (later tiers)

Vault/KMS sprint before real S3 data; TestFlight for the mobile app; rate
limiting + backups + monitoring; the pilot's paper-parallel protocol
(ADR-001) — the app mirrors visits, paper remains the record.
