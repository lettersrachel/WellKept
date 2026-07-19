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
| **Staff second factor (TOTP)** | `@wellkept/totp` + `lib/totp` + `/mfa` + route-group guards | RFC 6238 (17 tests, incl. RFC vectors); staff sessions can't reach a staff surface until a code clears; per-session step-up; clients unaffected; brute-force throttled 8/5min |
| **TOTP recovery (self-service backup codes)** | `user_backup_code` + `/mfa/recovery-codes` | 10 single-use codes issued at enrollment, shown once (only SHA-256 hashes stored); redeemable at the challenge; remaining count surfaced. Removes the sole-admin lockout risk |
| **TOTP recovery (admin reset)** | `resetTotp` action + People & access panel | corporate_admin clears secret + backup codes + kills sessions; audited `totp_reset`; re-enroll on next sign-in |
| Session revocation from corporate | `forceSignOut` action | corporate_admin deletes a user's `auth_session` rows; audited `sessions_revoked` |
| Secrets in managed store, not in code | Vercel env / Railway vars | prod refuses dev AUTH_SECRET / missing KMS key at boot |
| Security headers (HSTS, nosniff, frame-DENY, referrer, permissions) | `next.config.ts` | verified on prod |
| CSP enforcing, per-request nonce | `src/middleware.ts` | `script-src` nonce + `strict-dynamic`; verified on prod (101/101 scripts nonced, 0 violations) |
| Dependency audit gate | CI `gates` job (`pnpm audit`) | caught the drizzle SQLi + Playwright advisory before merge |
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

## Auth model note (REQ-003)

The spec phrases staff auth as "email + password + TOTP". We keep the
**passwordless magic link as the first factor** (proves control of the
email, no password to phish or custody) and add **TOTP as the second
factor** for every staff role. Magic link + authenticator is genuine
two-factor and avoids a password store entirely — a deliberate,
documented reading of the requirement, recorded in
[ADR-003](adr/003-staff-second-factor.md). Clients remain magic-link only.

## Known gaps (for the pen review)

1. **No 401 path** — unauthenticated API hits return 403, not 401. Cosmetic
   taxonomy gap; does not leak.
2. **Rate limits fail open** on Redis trouble (availability choice). The
   unguessable magic-link token remains the boundary; acceptable, documented.
3. **KMS is LocalKms with a KEK in an env var.** Production must move to a
   managed KMS (AWS KMS/CloudHSM) with rotation; the swap is a re-wrap
   migration (documented in the vault package). Until then, `WK_KMS_KEY`
   loss = vault data unrecoverable — custody it in a password manager. The
   TOTP secrets are sealed under this same KEK.
4. **SAST** not yet in CI (dependency `pnpm audit` gate is). Add a static
   analyzer before real household data.
5. **No WebAuthn/passkey factor yet** — TOTP + backup codes cover the pilot;
   a phishing-resistant hardware factor is the natural next step.

## Data-handling guardrails (ADR-001)

- No real S3 values enter the app before the vault sprint (done) AND this
  pen review (pending) — both required by guardrail 2.
- Real household data only with that household's written consent (guardrail
  3, WK-SOP-019). This is process, not code.
- Paper remains the pilot's system of record until a written ADR supersedes.
