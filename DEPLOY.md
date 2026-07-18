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

Then point your domain (e.g. `app.wellkept.com`) at the Vercel project.

## 3. Worker (Railway / Render / Fly — any Docker host)

Deploy from the repo with `services/worker/Dockerfile` (build context =
repo root). Env: `DATABASE_URL`, `REDIS_URL` (same values as above).
One instance is plenty; commands are idempotent so restarts are safe.

Seed the trigger library once: `DATABASE_URL=... pnpm --filter @wellkept/worker seed:rules`

## 4. Smoke checklist (after first deploy)

1. `https://app.yourdomain.com/api/health` → `{"ok":true,"db":"up"}`
2. `/signin` → request a link for your own email → it arrives via Resend →
   clicking lands you per your role assignment
3. As corporate: approve any pending client edit on a bound field → the
   worker host's logs show the field-change job → the anticipation panel
   gains items
4. `/dev/last-email` → 404 (dev-only page is gated in production)
5. An s3 reveal → audit row present in `audit_event`

## Not covered here (later tiers)

Vault/KMS sprint before real S3 data; TestFlight for the mobile app; rate
limiting + backups + monitoring; the pilot's paper-parallel protocol
(ADR-001) — the app mirrors visits, paper remains the record.
