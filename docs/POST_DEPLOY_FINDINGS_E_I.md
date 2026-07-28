# Post-deploy round two: sessions E and I findings
> Dated verification record. Historical evidence, not living copy: findings
> are as of the stated date. Excluded from style sweeps (the W-13 em-dash
> rule applies to living documents, not this record). Do not edit for style.

Run 2026-07-27 against main `d0fa350`, read-only, per
[POST_DEPLOY_SESSIONS_2.md](POST_DEPLOY_SESSIONS_2.md). Evidence per claim;
nothing fixed; the founder decides what follows. The review's two framing
corrections are accepted and recorded: a shared transaction would be WORSE
(decrypt failure would roll the audit row back — the unsafe direction), and
session A verified the sole writer where the invariant hangs on the sole
caller. This session closes that hole.

---

## Session E. Decrypt callers

**Verdict: the audited reveal route is the only path that decrypts
household vault values and returns them to anyone. Two justified
exceptions exist, neither reaches a user, and one has a disclosure gap
worth a packet sentence.**

**Q1 — the primitives.** Three layers: `decrypt(key, box)` (raw AES-GCM,
`packages/vault/src/index.ts:36`), `openValue(kms, wrappedKey, box)`
(KEK-unwrap then decrypt, `index.ts:75`), and `vaultOpen(fieldId)` (DB row
fetch then openValue, `apps/web/src/lib/vault.ts:60`).

**Q2/Q3 — every caller, repo-wide, classified:**

| Caller | Layer | Classification |
|---|---|---|
| `/api/reveal` route (`route.ts:76`) | `vaultOpen` | **The audited path — the ONLY caller of vaultOpen.** |
| `lib/totp.ts:53` (`openSecret`) | `openValue` | **Justified exception.** Decrypts the user's OWN vault-sealed TOTP secret to verify their 2FA code. Different data class (staff authentication credential, not household s3); never a household value; a reveal row would be wrong here. Feeds session I's inventory. |
| `packages/schema/rewrap-kek.ts:53` (`verifyOpen`) | raw `decrypt` | **Justified exception, with a disclosure gap.** The rotation drill decrypts EVERY vault value in memory to prove round-trip (result discarded via `void`, never printed or stored). It is administrative plaintext access without reveal rows. Correct as designed — a rewrap is not a reveal — but no document accounts for it. Suggested packet sentence: "key rotation verifies every secured value decrypts correctly; the values pass through server memory during the operation and are neither displayed nor logged as reveals." |
| `packages/vault/vault.test.ts` | all | Test-only, in-memory KMS, no database connection possible. |

**Other `vault_item` touchers, none decrypting:** `data.ts:256`
(getStewardship — COUNT only, the client trust ceremony's "how many items
are secured"); `erase-household.mjs:103,151` (COUNT then DELETE —
**deletes blind**, answering the review's specific question: it never
reads ciphertext, not even to log what it removes); `dump-seed.ts` (no
vault material by design, G-27); schema definitions and tests. Dev-gated
routes: none touch the vault. Fixture/seed scripts: none touch the vault.

**Q4 — disclosure coverage.** The TOTP exception needs no client-facing
disclosure (staff credential, staff document territory — session I). The
rewrap exception needs the one packet sentence above; the privacy notice's
"who sees it" section remains accurate because no PERSON sees anything
during a rewrap.

**Q5 — attempted vs successful reveals, evidentially.** No status or
outcome field exists: the audit row commits before the decrypt, carries
`{field, at}`, and is never updated (append-only). A row for a
failed-decrypt reveal is indistinguishable from a successful one. Adding
the distinction would touch: the reveal route (a completion record — either
a second row kind like `s3_reveal_failed`, keeping append-only, or a
detail field written only on the failure path before the response), the
drill-in's audit-line renderer, and one packet sentence. Not built, per
the brief. Worth noting the exposure is narrow: a decrypt failure requires
vault corruption or a wrong KEK, both of which are themselves
incident-grade events.

**Q6 — G-33's disposition, decided.** CLOSED AS UNREPRODUCIBLE
MIS-OBSERVATION. Grounds: one writer in the tree, firing only on explicit
client action; no render, refresh, or retry path exists (session A + this
session); the observation came from the same day that produced multiple
screen-reports later retracted against the database; no logs were running.
Reopen condition, explicit: any recurrence observed WITH a log stream
running gets investigated immediately as unaccounted-for. The register
entry should move from "neither open nor closed" to closed-with-reopen-
condition.

---

## Session I. The staff data surface

**Headline confirmed: the audit trail is the largest staff record and has
been since the first commit — `time_entry` is the smallest part of the
surface.** Inventory of everything the system records about a staff
member, as input to the G-13 disclosure (which the founder writes):

| Record | What is captured | Kept | Who can see it | Performance-inference potential |
|---|---|---|---|---|
| `audit_event` | every consequential action, by name and role: reveals, field writes, tag changes, incident logging/resolution, consent recording, membership events | append-only, permanent | corporate (per-household drill-in trail) | **HIGH, today** — a per-person activity reconstruction is one query |
| `prompt_outcome` | every prompt answer with judgment dimensions: acted/dismissed, was it news, why dismissed, lead time | permanent | corporate (aggregated in rule health) | **HIGH, today** — user-attributed by design (`rule_health.minUsers` proves it); a per-user act rate is a trivial query; NO surface computes one, and capture sessions 5–7 explicitly forbid building ranking surfaces without their own review |
| `time_entry` | categorized hours, start/end, per household | permanent | corporate (30-day card) | **HIGH with small change** — hours-by-person is one GROUP BY |
| `visit` + `visit_command` | authored reports (three sentences), timing, life-change signals, submittedBy | permanent | corporate; client sees the report content | moderate — writing quality and cadence are visible |
| `dot` | verbatim observations, heardBy | permanent | corporate + field | low-moderate |
| `stranger_test` | backup-HM first-visit friction notes, coveredBy, PASSED flag | permanent | corporate | **moderate-high — this is already a scored record of a staff member's visit** |
| `incident_report` | reportedBy, resolvedBy | append-only, permanent | corporate + field can log | moderate (incident involvement counts) |
| `cost_entry` / `membership_event` / consent | recordedBy attribution | permanent | corporate | low |
| `visit_photo` | uploadedBy | bytes purge on the 90-day window; tombstone permanent | corporate + assigned staff | low |
| `household_role_assignment` | role, NDA flag | deleted on revoke (history survives only in audit_event) | corporate | low |
| `auth_session` / sign-in | session existence, sign-in method | until revoked | corporate can force sign-out | low (no login-time analytics surface) |
| `user_totp` | the TOTP secret itself, VAULT-SEALED (session E) + enrollment state | until reset | nobody (decrypted only to verify codes) | none |
| `user_backup_code` | hashes only | until used/reset | nobody | none |
| `device_pairing` / `push_subscription` | paired device, browser push endpoint (a device identifier) | until unpaired | corporate (existence) | none |
| `notification` | what the system told them, read state | permanent | the user | low |

**Three facts the disclosure must state to be honest,** per the review's
"half honest" standard: (1) the audit trail is permanent, attributed, and
append-only — nothing a staff member does in the system is unattributed or
deletable; (2) prompt outcomes record judgment calls in a form that COULD
support performance inference today, and no surface performs it, and
building one is explicitly gated on its own review (capture sessions 5–7
out-of-scope list); (3) no staff-data retention policy exists anywhere —
the disclosure has to state one or state that records persist for the
employment relationship plus a period counsel sets.

---

## Decisions this round leaves with the founder (from the brief, restated)

1. **Session H (referral split):** the reviewer's reasoning is sound —
   clearing the channel biases acquisition history toward retained
   households while the note is the personal part. Recommend: confirm the
   split (retain `referral_source`, clear `referral_note`).
2. **Mileage × erasure (G-46 × G-40):** destination fields would exist to
   survive scrutiny AND usually name the erased household's address.
   Genuinely counsel's question; recommend adding it to the packet at the
   sitting rather than deciding first.
3. **Session F (destructive-flag verification):** feasibility answered —
   the script is executable-only, so the rollback-test route requires a
   refactor to make its logic importable; the Neon-branch route needs no
   code change. Recommend: **Neon branch, at the custody sitting**, where
   a throwaway branch already exists for the rewrap drill — one branch
   serves both drills, and the one-authorized-exception rule stays narrow.
