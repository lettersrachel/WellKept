# Security posture & hardening status

Sprint-10 direction (WK-DEV-001 REQ-070/071). This is the running record of
controls in place and the gaps a formal pen review must still close. Not a
substitute for that review — it is the map into it.

## Controls in place (verified)

| Control | Where | Evidence |
|---|---|---|
| Field-level authz, server-side, fail-closed | `@wellkept/permissions` (100% branch) + every route/action | 18 unit tests + the authz probe below |
| **Authorization probe matrix** | `tooling/security/authz-probe.mjs` | 5 roles × 7 surfaces + payload safety = 36 assertions, all fail-closed |
| Client payload safety (no s2/s3 to client) | `assertClientPayloadSafe` in the page data path | probe asserts 0 leaks in rendered client HTML |
| S3 vault: envelope AES-256-GCM, KMS-wrapped key | `@wellkept/vault` (6 tests) | full pg_dump contains zero plaintext |
| S3 reveal: audit-before-value, per-user rate cap | `/api/reveal` | 40/hr then 429 (bulk-exfil guard); audit row precedes decrypt |
| Sign-in throttle (IP + email) | `/signin/action` + `lib/rate-limit` | 5/hr/email then `?error=rate-limited`, verified in prod |
| Secrets in managed store, not in code | Vercel env / Railway vars | prod refuses dev AUTH_SECRET / missing KMS key at boot |
| Security headers (HSTS, nosniff, frame-DENY, referrer, permissions) | `next.config.ts` | verified on prod |
| CSP (report-only) | `next.config.ts` | collecting violations before enforcing |
| Append-only audit of every s3 read + field write | `audit_event` | REQ-005; surfaced as the change log |
| No wildcard grants; one role per person per household | `household_role_assignment` unique | provisioning UI + probe |
| NDA mode tightens backup-HM s3 | permission core `ndaMode` | unit + reveal path |

## Running the probe

```sh
cd tooling/security && pnpm install
BASE=http://localhost:3001 DATABASE_URL=... node authz-probe.mjs   # exit 0 = all pass
```

Point `BASE` at production for a live check (mints and cleans up its own
sessions; requires the DB URL to seed them). Wire into CI once a
long-lived preview DB exists.

## Known gaps (for the pen review)

1. **CSP is report-only and permits `unsafe-inline`.** Next inlines styles
   and a bootstrap script; tightening to enforcing needs nonce plumbing.
   Collect real violation reports first, then lock down.
2. **No 401 path** — unauthenticated API hits return 403, not 401. Cosmetic
   taxonomy gap; does not leak.
3. **Rate limits fail open** on Redis trouble (availability choice). The
   unguessable magic-link token remains the boundary; acceptable, documented.
4. **Staff auth is magic-link, not password+TOTP** (REQ-003). The spec wants
   TOTP for staff roles; magic link is the client affordance. Scheduled.
5. **KMS is LocalKms with a KEK in an env var.** Production must move to a
   managed KMS (AWS KMS/CloudHSM) with rotation; the swap is a re-wrap
   migration (documented in the vault package). Until then, `WK_KMS_KEY`
   loss = vault data unrecoverable — custody it in a password manager.
6. **No dependency scanning / SAST in CI yet.** Add `pnpm audit` gate + a
   scanner before real household data.
7. **Session revocation from corporate (REQ-003)** not yet built — sessions
   expire but can't be force-killed by an admin.

## Data-handling guardrails (ADR-001)

- No real S3 values enter the app before the vault sprint (done) AND this
  pen review (pending) — both required by guardrail 2.
- Real household data only with that household's written consent (guardrail
  3, WK-SOP-019). This is process, not code.
- Paper remains the pilot's system of record until a written ADR supersedes.
