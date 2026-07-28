---
status: living
---
# Well Kept — Pilot launch readiness

What stands between "built and working" and "a real household's data is in it."
Everything the product *does* is done, deployed, and hardened; this list is the
data-safety and operational gates for going live with real people.

**Owners:** 🧑 you (Rachel) · 🤖 me (code/infra I can do) · ⚖️ a decision to make
**Status:** ✅ done · ⏳ in progress · ⬜ not started

---

## 1. Data-safety gates — before ANY real household data

### 1.1 Custody the master key 🧑 ⏳ (lost-laptop half done; recovery half open)
`WK_KMS_KEY` (and `AUTH_SECRET`) are saved in your password manager; the local
plaintext files (`.production-secrets`, `.vercel-env`) were shredded. The key
now lives only in Vercel (running the app) + your manager (safe backup) — so a
lost laptop no longer risks the vault.

- ⚠️ **ADR-005 guardrail (G-17): no real s3 value enters the vault until the
  sealed SECOND custody exists and has been confirmed readable once.** Fill
  the brackets in `adr/005-key-custody.md`, make the sealed copy, and drill
  the re-wrap (`db:rewrap-kek` dry run + one `--commit` on a throwaway Neon
  branch) in the same sitting. Single-custodian custody protects against a
  lost laptop; it does nothing for a lost custodian.

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

### 1.4 Security review — a conscious decision ⚖️ ⬜ (draft below, unsigned)

> **PROPOSED DECISION (drafted 2026-07-27 — not in force until you date and
> initial it):** For a pilot of consenting households known to the founder
> personally, Well Kept accepts the current controls — the 36-check authz
> probe, live payload-guard and floor-bypass assertions in CI, vault
> encryption with audited reveals, enforced CSP, rate limits, and the
> completed self-review that found and fixed a real MFA bypass — in place
> of an independent penetration test. An outside review is REQUIRED before
> onboarding any household beyond the pilot cohort, before any household
> not personally known to the founder, and in any case before the fleet
> reaches five. Signed: ______ Date: ______
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

### 2.4 Decide the off-Neon backup question 🧑⚖️ ⬜ (G-02/G-18; draft below, unsigned)

> **PROPOSED DECISION (drafted 2026-07-27 — not in force until you date and
> initial it):** At pilot scale, NO off-Neon dump. Neon PITR (≥7 days,
> confirmed) plus the restore drill proven in the custody sitting is the
> recovery story, on the reasoning the register itself gives: any off-Neon
> copy also holds vault ciphertext and photos the daily purge cannot
> reach, silently defeating the retention policy counsel is blessing.
> Revisit at five households or the first non-pilot client, whichever
> comes first — and if the answer changes, counsel owns the backup's own
> retention rule (packet item 7). NOTE (post-deploy review): this position
> leans on Neon PITR being sufficient, and the §1.2 restore drill that
> demonstrates that is still pending — SIGN AFTER THE DRILL, not before.
> Signed: ______ Date: ______
Neon PITR is currently the ONLY copy of every playbook, vault row, audit
event, incident, and photo in the business. Whether that is adequate at
pilot scale (with the §1.2 restore drill proven) or whether you also want a
periodic dump you control is a **continuity decision, yours** — with the
stated complication that any off-Neon copy also holds vault ciphertext and
photos the daily purge can't reach. Either answer is defensible; decide it
here, on purpose. IF the answer is yes, counsel then owns the backup's own
retention rule (the pointer stays in the §3 packet).

### 2.3 Health signal 🤖 ✅
`/api/health` reports DB up/down (already live and green). `/api/build-id`
reports the running build (the G-37 skew heartbeat's server half).

### 2.5 Two five-minute chores 🧑 ⬜ (from the 2026-07-27 run)
- **Rename the dormant Vercel project** `well-kept-web` →
  `wellkept-pr-builds` (project → Settings → General). It is kept ON
  PURPOSE as the only pre-merge production-build check (G-35) — the rename
  stops it posing as production during the next incident.
- **Add the DMARC record** at your DNS host: TXT at `_dmarc` with
  `v=DMARC1; p=none; rua=mailto:lettersrachel@gmail.com` — monitoring
  only, improves sign-in email inbox placement over time (G-30's tail).

---

## 3. Process / legal — not code

Starting-point drafts are in [`docs/legal/`](legal/README.md), written to match
exactly what the software collects. **They need a lawyer's review before use**
(especially retention / right-to-erasure and which privacy laws apply).

- ⏳ 🧑⚖️ Household consent per home — draft: `legal/household-consent.md`.
- ⏳ 🧑⚖️ Staff confidentiality — draft: `legal/staff-confidentiality.md`
  (the `nda_approved` flag records it in People & access).
- ⏳ 🧑⚖️ Privacy notice — draft: `legal/privacy-notice.md`. The deletion
  rights it describes are now EXECUTABLE (🤖 built 2026-07-25):
  `apps/web/scripts/erase-household.mjs` — dry-run by default, run twice on
  purpose — crypto-shreds the vault, purges photo bytes, blanks every piece
  of free text, tombstones the structure, and keeps the audit trail and
  incident records unless counsel directs further (`--erase-incidents`,
  `--scrub-audit-detail`). Counsel's part remains: decide when erasure
  applies vs what must be retained, and write the notice's retention/erasure
  section to match what the tool actually does.
- ⬜ 🧑 Name a data-recovery / incident owner (who restores, who's called) —
  and route Sentry alerts somewhere a person actually sees them. One page:
  detect, assess, notify, record (gap register G-08).
- ⬜ 🧑⚖️ The counsel packet, in one engagement — ASSEMBLED as
  [`legal/COUNSEL_PACKET.md`](legal/COUNSEL_PACKET.md) (2026-07-25): hand
  counsel that file plus the three drafts; each attachment states what the
  software does today and the specific question. The seven, for reference:
  (1) erasure-tool
  semantics vs the notice's deletion language, (2) the 90-day photo window,
  (3) the consent doc, (4) the Neon PITR window as the true floor on erasure
  latency (G-04), (5) the five subprocessor DPAs — Vercel, Neon, Upstash,
  Railway, Resend (G-09), (6) the breach-notification commitment the privacy
  notice still carries in brackets — what Virginia requires by way of timing
  and content (G-19, the legal half of G-08), and (7) only if §2.4 decided
  yes: the off-Neon backup's retention rule (G-02/G-18).
- ⬜ 🧑⚖️ Key custody (G-01, the register's most serious item): fill the
  brackets in `adr/005-key-custody.md` — second custodian, sealed mechanism,
  retrieval condition — and make the sealed copy exist. An afternoon.
- ✅ 🤖 Incident & complaint register — **built 2026-07-25** (founder
  approved the recommendation): `incident_report`, a dedicated append-only
  table, not a registry kind. Kinds complaint · breakage · injury ·
  near-miss · other, with severity, channel, who logged it, and a
  resolution note when closed; rows never delete, every entry and
  resolution audited. Logged from the household drill-in (field roles can
  log too — they witness incidents); open incidents show red on the fleet
  board so nothing festers invisibly.
- ⏳ 🧑⚖️ Photo lifecycle — **mechanism built 2026-07-25** (founder approved
  the 90-day recommendation): a daily job purges image BYTES past the
  rolling window (`app_setting` key `photo_retention`, default 90 days —
  change the number there, no deploy needed); the row survives as the
  tombstone, a purged photo serves 410, and a corporate hold (red border,
  drill-in) exempts a photo tied to an open incident or dispute. Remaining,
  yours + counsel: bless the 90-day number and disclose location + window +
  who-can-see in the privacy notice's "visit records" row before real
  photos accumulate.
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
4. **Log every intake hour as you go** (time category: `intake`, on the
   visit surface or the drill-in) — intake cost is capturable exactly once,
   during onboarding, and it is the number the unit-economics model needs
   most (G-45).
5. Revoke anyone instantly from the same panel (**Sign out** + **Revoke**;
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
