# Well Kept — Pilot launch readiness

What stands between "built and working" and "a real household's data is in it."
Everything the product *does* is done, deployed, and hardened; this list is the
data-safety and operational gates for going live with real people.

**Owners:** 🧑 you (Rachel) · 🤖 me (code/infra I can do) · ⚖️ a decision to make
**Status:** ✅ done · ⏳ in progress · ⬜ not started

---

## 1. Data-safety gates — before ANY real household data

### 1.1 Custody the master key 🧑 ✅ DONE
`WK_KMS_KEY` (and `AUTH_SECRET`) are saved in your password manager; the local
plaintext files (`.production-secrets`, `.vercel-env`) were shredded. The key
now lives only in Vercel (running the app) + your manager (safe backup) — so a
lost laptop no longer risks the vault.

### 1.2 Confirm backups & know the restore path 🧑 ⏳
Neon keeps point-in-time-recovery history, but the window depends on your plan
(Free ≈ 24h; paid plans up to 7–30 days). For a pilot you want a comfortable
window.

- Neon dashboard → project **late-block-08313029** → Settings → **History
  retention**. Confirm it's at least **7 days**; bump the plan if it's 24h.
- Do one **restore drill** on a throwaway branch (Neon → Branches → "Restore" to
  a timestamp) so the recovery path is proven, not theoretical.

### 1.3 Quarantine demo data at go-live 🤖 ✅ script ready
Production currently holds demo households (Fernbrook, Chen-Williams, Field
Test Home) and the demo cast (jordan, kelly, lisa, devon…). Nothing hard-deletes
(soft-archive via `archived_at`).

- `scripts/archive-demo-data.mjs` is ready. Run it **at go-live** (not before —
  you're still using Field Test Home). It archives the demo households and lists
  the demo accounts to revoke. Dry-run by default; `--commit` to apply.

### 1.4 Security review — a conscious decision ⚖️ ⬜
ADR-001 gates real *sensitive* (s3) values on a review. What exists: the full
authz probe (36 checks), a self-review that found+fixed a real MFA-bypass, CSP
enforced, vault encryption, rate limits, audited reveals. What's missing: an
*independent* pen test.

- For a **small, consenting** pilot you may accept the current controls +
  self-review — but decide that on purpose and write it down.
- Before scaling past a household or two, get an outside review.

### 1.5 Client consent captured where the system can see it 🧑⚖️ ⏳
ADR-001 guardrail 3 makes the household's written consent the precondition
for any real data. Staff have `nda_approved`; the household record now has
its counterpart: 🤖 **built 2026-07-25** — a Household consent card on the
corporate drill-in records that consent was signed, when, and which doc
version (audited; corrections re-record).

- Remaining, yours: counsel reviews `legal/household-consent.md`, the
  household signs, you file the paper and record it on the card. Until the
  card shows a signed consent, no real data for that household.

---

## 2. Operational readiness — before it's load-bearing

### 2.1 Error monitoring 🤖 ✅
Sentry captures server + worker errors (never household data — error + job
label only). Live on Vercel and Railway; verified by throwing a real error in
production and confirming capture. Watch it at sentry.io. **Uptime:** the
Railway worker pings the live `/api/health` every 5 min from outside Vercel and
pages Sentry on a non-200/unreachable — a true external outage check.

### 2.2 Confirm paid tiers won't sleep 🧑 ⬜
Free tiers can throttle or pause mid-visit. Confirm billing on: **Neon**,
**Upstash** (Redis), **Railway** (worker), **Resend** (mail). A paused Redis or
worker degrades quietly.

### 2.3 Health signal 🤖 ✅
`/api/health` reports DB up/down (already live and green).

---

## 3. Process / legal — not code

Starting-point drafts are in [`docs/legal/`](legal/README.md), written to match
exactly what the software collects. **They need a lawyer's review before use**
(especially retention / right-to-erasure and which privacy laws apply).

- ⏳ 🧑⚖️ Household consent per home — draft: `legal/household-consent.md`.
- ⏳ 🧑⚖️ Staff confidentiality — draft: `legal/staff-confidentiality.md`
  (the `nda_approved` flag records it in People & access).
- ⏳ 🧑⚖️ Privacy notice — draft: `legal/privacy-notice.md`. **Do not publish
  as-is:** it describes deletion rights the code cannot execute (the system
  tombstones via `archived_at`, never hard-deletes — REQ-071 deletion is not
  built). Counsel must reconcile the tombstone model with any right to
  erasure, and the notice's retention section must match what the code
  actually does — or an erasure path gets built first.
- ⬜ 🧑 Name a data-recovery / incident owner (who restores, who's called).
- ⬜ ⚖️ Incident & complaint register — decide where a client complaint, a
  breakage, an injury, or a near-miss is recorded. Today no such record
  exists anywhere: dots are HM observations, stranger tests are friction —
  neither is a complaint. In a dispute this is the single most important
  record in the business. **Recommended (2026-07-25, awaiting your yes):**
  a dedicated in-app `incident_report` table, NOT a registry kind
  (registries are practical data with date sweeps; incidents are s2,
  append-only, legally significant — a different class, modeled on
  `stranger_test`). Kinds: complaint · breakage · injury · near_miss ·
  other; who reported, via what channel, when it happened, severity, a
  resolution note when closed; rows never delete, corrections append.
  Surfaced on the drill-in + a fleet-board count so an open incident is
  never invisible. Small build (~a session) once you say go.
- ⬜ 🧑⚖️ Photo lifecycle, written down — photos of the inside of a client's
  home are the most sensitive artifact held. Reality today: stored inside
  Postgres (`visit_photo`), staff-only + second factor on every read, never
  on the client view. **Recommended (2026-07-25, needs counsel + your
  number):** a 90-day rolling window — long enough to cover any dispute
  about a specific visit and the quarterly review cycle, short enough that
  the archive never becomes an attractive target. Mechanics: a daily job
  purges the image BYTES past the window and stamps the row (id, household,
  uploader, byte count remain as the tombstone — the record survives, the
  picture doesn't), with a hold flag exempting any photo attached to an
  open incident or dispute. Disclose the location, the window, and who can
  see them in the privacy notice's "visit records" row before real photos
  accumulate.
- ✅ ⚖️ Billing / scheduling / payroll seams — ADR-004 **Accepted**
  (2026-07-25): QuickBooks is the system of record for invoicing/collection
  and for payroll-grade time; scheduling stays in the Jobber stack. The app
  displays but never originates any of the three. Operational remainder
  (outside this repo): configure QuickBooks invoicing before the first
  paying household.

---

## 4. Onboarding runbook (how you add real people)

1. Sign in → a household's **People & access** panel → add each person by real
   email + role (client / house_manager / corporate). NDA checkbox as needed.
2. They get a magic-link email (now from **signin@wellkepthomeops.com** — works
   to any address), sign in, and staff set up 2FA once.
3. House managers: after signing in on web, open **/link-device** and pair the
   phone app with the code.
4. Revoke anyone instantly from the same panel (**Sign out** + **Revoke**;
   **Reset 2FA** if they lose their phone).

---

## 5. Explicitly deferred (not blocking a pilot)

Camera photos on mobile (placeholder now) · push notifications · WebAuthn /
passkeys · managed cloud KMS with rotation (password-manager custody in §1.1
covers a small pilot) · scaled corporate console (single-household drill-in +
fleet board today).

---

## The one-line version

Do **§1.1 today** (5 min, protects all vault data). Confirm **§1.2** and
**§2.2** (dashboards). Make the **§1.4** call. Grab a Sentry account for §2.1.
Then run `scripts/archive-demo-data.mjs --commit` and onboard your first
household. Everything else is post-first-household.
