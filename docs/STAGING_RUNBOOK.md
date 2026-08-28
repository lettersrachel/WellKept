---
status: living
---
# Staging standup runbook

Companion to ADR-007. Founder-side steps first (dashboard operations
this repo cannot perform), then the repo-side follow-ups that are gated
on the infrastructure existing. Secrets are referred to by name only,
per the standing rule; no value ever appears in this document or in any
session transcript.

## Founder ruling, 28 August 2026: build it now, under contractor-held accounts

**Staging is created now, under the accounts that exist today, rather than
waiting for the LLC.** Two accounts added to the eventual transfer is cheaper
than holding all seven Phase 1 deliverables behind entity formation, and
Phase 1 gates real household data.

**S3 and KMS are the exception and do NOT follow this ruling.** They open
clean in the entity's name at formation, because a photo written to a
contractor-held bucket is a photo that has to be moved, and the KEK is the
vault's root of trust. The transfer sequencing is in
`CUSTODY_TRANSFER_CHECKLIST_2026-08-28.md`.

So the Neon staging branch, the Vercel staging project, the Upstash database
and the Railway service below are created now and transferred later; the
object store is not created now at all.

## Founder-side standup (dashboard operations)

1. **Neon**: create a `staging` branch (or a separate database) in the
   Neon project. Its connection string becomes staging's DATABASE_URL.
   It must never be the production string.
2. **Vercel**: create a second project (working name `well-kept-web-staging`)
   from the same repository, root directory `apps/web`, deploying from
   `main`. **CORRECTED 28 August 2026: this step previously offered the
   dormant `well-kept-web` project for repurposing. That project no longer
   exists.** G-35 was answered on 26 August (it held no environment
   variables at all) and the founder DELETED it the same day, after
   confirming it carried no custom domain; the Vercel team now lists one
   project, `wellkept`. A new project is the only path.
3. **Environment variables on the staging project**, the five the deploy
   gate requires, each with a staging-distinct value:
   - DATABASE_URL: the Neon staging branch string.
   - WK_KMS_KEY: a FRESH key, generated for staging, never production's.
     The boot-time validation will prove its shape on first deploy.
   - AUTH_SECRET: fresh.
   - REDIS_URL: a separate Upstash database (free tier suffices at
     fixture scale).
   - RESEND_API_KEY: **SETTLED, and this step previously presented it as an
     open choice. It is not.** The staging ruling of 24 August (Transfer Set
     2, register drafts A569-A572) requires a SEPARATE Resend key with a hard
     internal allowlist. That is stricter than either option this step used to
     offer, and it is stricter for the reason the old wording gestured at:
     staging that can send real email can email real people, and an allowlist
     makes that structural rather than careful.
4. **Railway**: a second service for the worker, deploying from `main`,
   with the same five variables' staging values.
5. **Seeding**: run the existing seed tooling against the staging
   DATABASE_URL (synthetic fixtures only, per WK-DEV-006 section 5 and
   ADR-007; Fernbrook DEMO and the Smoke Test Fixture pattern).
6. Report the staging URLs back into a session so the repo-side half can
   start.

## Repo-side follow-ups (gated on the above existing)

- Migrations flow: staging migrations run before production migrations
  in the deploy sequence, making staging the first place a migration
  meets a running system.
- `tooling/deploy.sh` gains a staging target, proven red and green
  against the real staging project before it is trusted, per the guard
  doctrine; not written before the project exists.
- The section 4 checklist gains a staging sitting before the production
  sitting for deploy batches that change behavior.
- CI stays as-is: gates and airplane are commit-level proofs and do not
  depend on staging.
- **NEVER point the test suite at staging's database.** The suite is hermetic:
  the integration tests write, mutate and TRUNCATE, and CI runs them against
  service containers it starts and throws away. Pointing `DATABASE_URL` at the
  staging branch would destroy the seeded synthetic fixture set, which is
  exactly the data the WK-SEC-001 Phase 1 audit needs to be there. Gate 0's
  "green in staging" line does not mean this. It means the DEPLOYED staging
  system passes its checks, and the run worth having there is the airplane e2e
  against a real deployment, which is the one thing no current run exercises.
  Written here, in the runbook, rather than only in a report, because the
  person who would do it is the person reading this page with a staging
  connection string in hand.

## What staging is for, and is not for

For: the Phase 0 acceptance line; the WK-SEC-001 Phase 1 audit venue
(synthetic data only); migration rehearsal; the February 2027 training
environment question, if the founder chooses it over production
fixtures. Not for: real household data, ever (Household Zero enters
production through the Phase 2 importer, not staging); performance
claims (staging tiers differ from production).
