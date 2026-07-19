# The Well Kept demo — 10-minute runbook

One household record, three permission-filtered projections. Everything below
runs against live Postgres; nothing is mocked.

## Setup (once, ~1 minute)

```sh
cd ~/dev/wellkept
docker compose up -d          # PG16 + Redis, if not already running
pnpm db:seed && pnpm db:demo  # 258-field record + the Fernbrook family
pnpm --filter @wellkept/web dev                              # port 3001
WK_WORKER_MAIN=1 node services/worker/src/index.ts &         # trigger engine
```

Sign-ins are email magic links; in dev they appear at
**http://localhost:3001/dev/last-email** (newest entry per address, one click
each). Demo identities:

| Email | Role | Surface |
|---|---|---|
| lisa@fernbrook.demo | client | /playbook |
| jordan@wellkept.demo | house_manager | /visit (and the Expo app) |
| rachel@wellkept.demo | corporate_admin | /oversight |
| kelly@wellkept.demo | cfo_readonly | /oversight, view-only |

> **Staff second factor (REQ-003):** the three staff identities (jordan,
> rachel, kelly) hit a one-time TOTP enrollment on first sign-in — add the
> shown key to any authenticator app, enter the code, done. To skip this for
> a fast local demo, start the dev server with `WK_DEV_SKIP_MFA=1` (dev-only;
> it has no effect in production). Clients (lisa) never see it.

Use a different browser (or private window) per identity — one session per
browser.

## The script

**1. Lisa (client) — the warm surface.** Visit report in three sentences with
photo count; the household summary; "Worth knowing" flags (EpiPens, the rear
gate, Rex the dinosaur); captured entries with "Suggest an update." Point out
what is NOT there: no internal notes, no codes, no questionnaire.

**2. Rachel (corporate) — the whole record.** Same household, now with the S2
layer: Mia's allergy detail, the tooth-fairy protocol, the vet file, the
cadence registry. Provenance on every field. The anticipation panel shows
scheduled prompts; open dots feed future gestures.

> **Punchline 1**: put Lisa's and Rachel's screens side by side. "Tooth fairy
> is ACTIVE for Owen" exists on one and is structurally absent from the other —
> filtered server-side, never sent over the wire. (US-05 runs in CI forever.)

**3. The vault.** In Rachel's Full Playbook, find an S3 row (Firearms, Section
1) and click "Reveal (logged)." It shows vault-pending (no real S3 values
until the vault sprint per ADR-001), auto-hides in 60 seconds — and scroll to
the audit trail: the reveal row is already there, with her identity.

> **Punchline 2**: the audit row is written BEFORE the value leaves the
> server. No audit write, no reveal. The log is not optional.

**4. Jordan (HM) — the field surface.** /visit: flags first, the anticipation
radar ("Occasion radar: scan the next 14 days…"), open dots, then the close
flow. Submit is locked until every required step is answered — a state
machine, not a disabled button.

**5. The airplane test.** In Jordan's browser devtools set network offline (or
just kill the dev server): fill the whole visit, submit — it queues to
IndexedDB, "your work is saved on this device." Restore network, Sync now:
commands land in Postgres in order. Refresh Lisa: the three sentences are her
new visit report. Refresh Rachel: the dot and any life-change signal are in
her view — and never in Lisa's.

**6. Suppression.** As Rachel, set the status tag to LIFE-EVENT. Jordan's
radar section flips to "Held. LIFE-EVENT pauses every prompt; nothing is
deleted." Rachel's anticipation panel shows every item HELD. Set it back to
STEADY — they return. Holds, never deletes.

> **Punchline 3**: a client edit merged five minutes ago scheduled prompts
> months out (approve any client suggestion on a bound field and watch the
> worker log). The record is alive: every write feeds the trigger engine.

**7. The phone (optional).** `pnpm --filter @wellkept/hm-mobile start`, scan
the QR with Expo Go: the same close flow, same domain packages, offline queue
in AsyncStorage. Airplane-mode it mid-visit and sync on return.

## Reset between demos

```sh
pnpm db:demo   # refills content, resets tag to STEADY, releases holds
```

Sign-out is per browser (the Sign out button). Magic links are single-use;
request fresh ones at /signin whenever a link says "unable to sign in."
