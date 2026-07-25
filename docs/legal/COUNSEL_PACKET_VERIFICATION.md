# Counsel packet verification report — 2026-07-25

Run of `COUNSEL_VERIFICATION_SESSION.md` against main (69b6631), read-only.
Verdicts: CONFIRMED / WRONG / OVERSTATED / UNVERIFIABLE, with evidence.
The packet is NOT edited (session hard rule 1); suggested wording only.

## Section 2 — the erasure tool (`apps/web/scripts/erase-household.mjs`)

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Deletes vault rows + per-record wrapped keys | **CONFIRMED** | `DELETE FROM vault_item` — `key_ref` (the wrapped key) is a column of the deleted row. Nuance: the underlying data key is per-HOUSEHOLD, wrapped per row; deleting all rows removes every wrapped copy |
| 2 | Blanks free text across the record | **CONFIRMED** | UPDATEs across dot, visit, visit_command, registry_entry, gesture, stranger_test, client_edit, season_observation, prompt_pack_item, prompt_outcome.note |
| 3 | Purges photo image bytes | **CONFIRMED** | `SET data='', purged_at=now()`; hold-honouring variant by default |
| 4 | Audit preserved by default; detail optionally scrubbed | **CONFIRMED** | audit_event untouched except optional `--scrub-audit-detail` → `{"erased":true}` (line ~155) |
| 5 | Incidents preserved by default; erasable by flag | **CONFIRMED** | `--erase-incidents` gates the description/resolution blanking |
| 6 | Refuses while an open incident exists | **CONFIRMED** | open-incident count checked FIRST, dry run included; `process.exit(2)` (line ~85) |
| 7 | Holds honoured by default; explicit override flag | **CONFIRMED** | `--override-holds` switches between two UPDATE statements; default excludes `retention_hold=true` |
| 8 | "Both the refusal and any override are written into the audit trail" | **OVERSTATED — half wrong** | OVERRIDES: yes — the final audit entry records `overrideHolds`, `despiteOpenIncidents`, and the open-incident count (line ~167), but only on `--commit`. REFUSALS: **no** — the refusal path prints to stderr and exits 2 (lines ~81-85) writing NOTHING. A refused erasure leaves no database trace. *Suggested wording:* "Any override is recorded in the erasure's audit entry. A refusal stops the tool before anything is written, including an audit row — the refusal itself is visible only in the operator's terminal." (Whether a refusal SHOULD leave an audit row is a fair follow-up question for counsel/founder.) |
| 9 | Dry run default; explicit commit | **CONFIRMED** | `--commit` flag; dry run prints the plan and exits 0 |
| 10 | Master key persists; nothing rotates or destroys it | **CONFIRMED** | The tool never touches `WK_KMS_KEY`; rotation is a separate tool (`db:rewrap-kek`) not invoked by erasure |

## Section 3 — recovery window

**CONFIRMED, architecture not guess.** Vault keys are STORED (wrapped), not
derived: `vault_item.key_ref` holds the household data key wrapped by the
env KEK (`apps/web/src/lib/vault.ts` — `LocalKms` over `WK_KMS_KEY`;
`packages/vault/src/index.ts` seal/wrap). A PITR restore reconstitutes rows
whose `key_ref` the still-live KEK unwraps. The packet's description is
exactly right.

## Section 4 — photo retention

**CONFIRMED, floor ENFORCED not documented.** `runPhotoRetention`
(`services/worker/src/index.ts`): reads `app_setting` `photo_retention`,
`if (!Number.isFinite(days) || days < 7) return 0` — a nonsense or sub-floor
window purges nothing. Tombstone survives (`purged_at` stamped, row kept;
GET serves 410). Holds exempt (`retention_hold=false` in the WHERE).

## Section 5 — purge schedule

**CONFIRMED scheduled/unattended**: the purge runs inside the daily
`registry-sweep` job (`upsertJobScheduler("registry-sweep-daily",
{pattern:"0 9 * * *"})`, worker index). **What stops it:** the worker
process being down, or its Redis queue being unavailable — which is the
case TODAY (Upstash paused until Aug 1), so at this moment the purge is
built but not running anywhere. **Hold-override removal difficulty: a
flag, not load-bearing** — deleting the `--override-holds` branch removes
one CLI constant and one of two UPDATE variants; nothing else references it.
If counsel recommends removal (packet §5c), it is a ten-line change.

## Section 6 — consent states

**CONFIRMED, two states only.** `household.consent_signed_at /
consent_doc_version / consent_recorded_by`; the only writer is
`recordHouseholdConsent` (corporate_admin, audited), which sets values and
never clears them. No withdrawal state, no un-set path, anywhere in the
tree. Re-recording overwrites with the prior value kept in the audit trail.

## Section 8 — subprocessors: THE PREDICTED MISS IS REAL

**The five-vendor list is INCOMPLETE. Sentry is a sixth vendor.**
`@sentry/node` runs in BOTH the web app (`apps/web/src/instrumentation.ts`)
and the worker (`services/worker/src/index.ts`), gated on `SENTRY_DSN` —
which LAUNCH §2.1 records as live in production. Configured to minimise:
`sendDefaultPii: false`, `tracesSampleRate: 0`, and the worker deliberately
never attaches `job.data`. What Sentry still receives: error messages,
stack traces, and job labels — and an unanticipated exception whose MESSAGE
embeds a value (a DB error quoting a row, a validation error echoing input)
would carry household-derived text to Sentry. *Suggested packet fix:* add
Sentry as vendor six ("error monitoring; configured to exclude personal
data by default; residual risk is error text that quotes a value") and ask
counsel whether it needs listing in the notice's subprocessor section.
(It does, in my non-lawyer opinion.)

**Two further data flows the packet does not mention (report item 3 —
undisclosed flows):**

1. **CPSC recall lookups** (`services/worker/src/cpsc.ts` line 88): the
   weekly job sends each appliance's captured MODEL or LABEL as a query
   parameter to `saferproducts.gov` (US CPSC). No household identifier
   rides along, but the string itself originates in a household record.
   Low sensitivity, government endpoint, HTTPS — but it is household-
   derived data leaving the system and the packet says nothing about it.
2. **Browser push gateways** (`apps/web/src/lib/push.ts`): web-push
   notifications transit Google/Mozilla/Apple push services. Payloads are
   END-TO-END ENCRYPTED to the subscriber's browser keys (`p256dh`/`auth`
   per RFC 8291 — the gateway sees ciphertext and the endpoint), and
   payload titles DO contain household names ("Load signal: {name}").
   Encrypted in transit through a third party ≠ processed by them, but
   counsel should know the path exists.

## Context section — refused categories

**OVERSTATED as written.** "The software refuses to hold" implies
enforcement. There is NO code that detects or blocks government IDs, card
numbers, or health data in field values — no validation, no pattern check,
anywhere. The true mechanism is (a) the drafts ASK clients not to provide
them ("We ask clients **not** to provide…", privacy-notice.md) and (b) the
intake instrument simply has no fields requesting them. *Suggested
wording:* "The product is not designed to hold these: no field requests
them and both client-facing documents instruct clients not to provide
them. This is policy and product design, not automated enforcement — a
client who types a card number into a free-text field will not be stopped
by software."

## Context section — sensitive tier ordering

**CONFIRMED, including the ordering.** `/api/reveal/route.ts`: role check →
TOTP step-up (`staffMfaCleared`) → rate limit → permissions decision → then
the audit row is inserted INSIDE a try/catch whose failure path returns
"audit write failed: reveal refused" (line ~70) — and only after a
successful audit insert does `vaultOpen` decrypt (line ~76). The audit row
is written before the value leaves the server, and an unwritable audit log
blocks reveals entirely. The packet may state this stronger: the log is not
just written first, it is load-bearing.

## Observed but out of scope

- The dev-gated `/api/dev/trigger-pass` correctly 404s in production but
  is UNAUTHENTICATED in dev — fine for its purpose, worth remembering if a
  dev stack ever holds a copy of real data (it must not, per ADR-001).
- The erasure tool's final audit entry uses a zero-uuid sentinel for
  `actor_user`; if counsel ever wants operator attribution on erasures,
  the tool would need to take an operator identity argument.

## Bottom line for the founder checklist

Packet claims: 15 CONFIRMED, 2 OVERSTATED (claim 8's refusal-audit half;
the "refuses to hold" wording), 0 WRONG, 0 UNVERIFIABLE — plus one missing
vendor (Sentry) and two unmentioned outbound flows (CPSC lookups, push
gateways). Fix those four in rev 3 of the packet and the "descriptions of
the software are accurate" sentence becomes true as written.
