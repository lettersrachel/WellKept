# ADR-003: Staff second factor is magic-link + TOTP, not password + TOTP

Date: 2026-07-19 | Status: Accepted | Context: REQ-003

## Decision

Staff roles (everything except plain `client`) must clear a **TOTP second
factor** in addition to the magic-link sign-in before reaching any staff
surface. We do **not** introduce a password. The two factors are:

1. **Magic link** — proves control of the enrolled email (something you have:
   the inbox). This already existed and stays the first factor for everyone.
2. **TOTP** — proves possession of an enrolled authenticator (something you
   have: the seeded device). New, and required only for staff.

The spec (REQ-003) phrases staff auth as "email + password + TOTP". We read
the intent as *strong multi-factor auth for staff* and deliver it without a
password, because a passwordless first factor is stronger operationally.

## Why not a password

- **Nothing to phish or reuse.** A password is the weakest link in most
  breaches (reuse, phishing, weak choices). A magic link has none of those
  failure modes.
- **No password store to protect.** No hashing scheme to get wrong, no reset
  flow to abuse, no credential-stuffing surface.
- **Same factor *types* as the spec's goal.** "Two independent factors, one
  of them a rotating code" is exactly what magic-link + TOTP delivers.

## How it works

- `@wellkept/totp` — pure RFC 6238/4226 (SHA-1, 6 digits, 30s, ±1 window),
  zero-dependency, tested against the RFC vectors.
- Secret storage — `user_totp`, one row per user. The secret is stored ONLY
  sealed (AES-256-GCM under the vault's KMS envelope); a DB dump never yields
  a working seed. `confirmed_at` is null until a first live code proves the
  enrollment.
- Step-up marker — `auth_session.mfa_satisfied_at`. Per **session**, not per
  user, so signing out or an admin revoking the session also drops the MFA
  state. Set once a code clears; read by the guard.
- Enforcement — `enforceStaffMfa()` runs in the `(corporate)` and `(hm)`
  route-group layouts (the choke point for every staff page). A staff session
  without `mfa_satisfied_at` is redirected to `/mfa`, which enrolls (first
  time) or challenges (already enrolled). Clients and signed-out requests pass
  through untouched.
- Brute-force throttle — 8 attempts / 5 min / user over the existing Redis
  limiter.
- Recovery — two layers. Self-service: 10 single-use **backup codes** issued
  at enrollment (`user_backup_code`, only SHA-256 hashes stored; shown once at
  `/mfa/recovery-codes`), redeemable in place of a TOTP at the challenge. This
  removes the sole-`corporate_admin` lockout (no peer to reset them). Admin:
  `resetTotp` from People & access clears the secret + codes + sessions
  (audited `totp_reset`), forcing fresh enrollment.

## Consequences

- A stolen inbox alone no longer grants staff access; a stolen laptop with a
  live session still needs nothing more, so session revocation
  (`forceSignOut`) remains the offboarding lever.
- **Dev/demo:** `WK_DEV_SKIP_MFA=1` bypasses the factor — but only when
  `NODE_ENV !== 'production'`. On Vercel (`NODE_ENV=production`) the bypass is
  dead code; the factor cannot be switched off on the live product.
- **Future:** WebAuthn/passkeys (phishing-resistant hardware) are the natural
  next step; the per-session marker and route-group guard are unchanged by it.
