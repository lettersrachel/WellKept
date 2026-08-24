---
status: living
---
# Staging standup runbook

Companion to ADR-007. Founder-side steps first (dashboard operations
this repo cannot perform), then the repo-side follow-ups that are gated
on the infrastructure existing. Secrets are referred to by name only,
per the standing rule; no value ever appears in this document or in any
session transcript.

## Founder-side standup (dashboard operations)

1. **Neon**: create a `staging` branch (or a separate database) in the
   Neon project. Its connection string becomes staging's DATABASE_URL.
   It must never be the production string.
2. **Vercel**: create a second project (working name `well-kept-web-staging`)
   from the same repository, root directory `apps/web`, deploying from
   `main`. The existing dormant `well-kept-web` project can be
   repurposed IF the queue chore question about it is answered first
   (whether it carries a production DATABASE_URL; that check decides
   G-35 and predates this runbook).
3. **Environment variables on the staging project**, the five the deploy
   gate requires, each with a staging-distinct value:
   - DATABASE_URL: the Neon staging branch string.
   - WK_KMS_KEY: a FRESH key, generated for staging, never production's.
     The boot-time validation will prove its shape on first deploy.
   - AUTH_SECRET: fresh.
   - REDIS_URL: a separate Upstash database (free tier suffices at
     fixture scale).
   - RESEND_API_KEY: the existing key is acceptable if staging email is
     wanted, or a dead-letter key if not; decide deliberately, because
     staging that can send real email can email real people.
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

## What staging is for, and is not for

For: the Phase 0 acceptance line; the WK-SEC-001 Phase 1 audit venue
(synthetic data only); migration rehearsal; the February 2027 training
environment question, if the founder chooses it over production
fixtures. Not for: real household data, ever (Household Zero enters
production through the Phase 2 importer, not staging); performance
claims (staging tiers differ from production).
