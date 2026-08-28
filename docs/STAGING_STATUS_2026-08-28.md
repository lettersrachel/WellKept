---
status: living
---
# Staging: what is missing, and what running the suite against it would take

28 August 2026. Report only. Nothing is stood up and nothing is proposed as a
substitute for standing it up.

## 1. The short answer

**No staging environment exists.** Not unreachable, not misconfigured, not
partially built: nothing has been created. This is unchanged from the finding
that produced ADR-007 on 24 August, and none of the six founder-side standup
steps in `STAGING_RUNBOOK.md` has been reported done in the four days since.

**So the Gate 0 acceptance line splits.** Its local half PASSES, read today
uncached (`pnpm test --force`, 11 turbo tasks, 0 cached, exit 0). Its staging
half is not failing; there is nothing for it to run against. ADR-007
anticipated exactly this and wrote the interim reading into the decision: the
line reads "locally, and in staging once staging exists".

## 2. This is on the critical path, not in housekeeping

Two Phase-gated things depend on staging, and one of them is a hard blocker.

- **Phase 0's acceptance line** is soft: ADR-007 already relaxed it, and the
  local half is genuinely passing.
- **Phase 1's WK-SEC-001 white-box audit** is not soft. ADR-007's own words:
  "the Phase 1 audit does not start without it, since staging is its venue."
  The audit is on synthetic data by design, so it cannot be run against
  production, and the alternative venue does not exist.

**Which makes staging the first item in the Phase 1 chain, not one of seven
parallel ones.** Phase 1's acceptance line requires zero criticals open from
WK-SEC-001; the audit cannot start; the audit's venue does not exist; the
venue's first step is a Neon dashboard click. The whole of Phase 1 is
currently behind six dashboard operations.

And Phase 1 gates real household data. Household Zero enters through the
Phase 2 importer after Phase 1 clears.

## 3. What is missing, itemized

The six founder-side steps, from `STAGING_RUNBOOK.md`, with what each is
blocking. None can be performed from this container; all are dashboard
operations.

| # | Step | Status | Note |
|---|---|---|---|
| 1 | Neon: a `staging` branch or separate database | NOT DONE | its connection string becomes staging's `DATABASE_URL`; must never be the production string |
| 2 | Vercel: a second project from the same repository, root `apps/web`, deploying from `main` | NOT DONE | the runbook's note about repurposing the dormant `well-kept-web` project is **moot**: that project was deleted on 26 August after G-35 was answered. A new project it is |
| 3 | Five environment variables, each staging-distinct | NOT DONE | `DATABASE_URL`, `WK_KMS_KEY` (**fresh**, never production's), `AUTH_SECRET` (fresh), `REDIS_URL` (separate Upstash), `RESEND_API_KEY` |
| 4 | Railway: a second worker service from `main` | NOT DONE | same five values, staging versions |
| 5 | Seed the synthetic fixture set against staging | NOT DONE | Fernbrook DEMO and the Smoke Test Fixture only; synthetic-only is an ADR-007 rule, not a convention |
| 6 | Report the staging URLs back into a session | NOT DONE | this is the handoff point where the repo-side half can start |

**Step 3 carries the one rule worth restating rather than assuming.** A shared
`WK_KMS_KEY` would make staging a second custody surface for production data,
which is the reason ADR-007 names that variable specifically. Staging must not
be able to decrypt anything production sealed.

**And one decision inside step 3 that should be made deliberately rather than
by default:** the Resend key. The runbook says either the existing key or a
dead-letter key, "because staging that can send real email can email real
people". The staging ruling of 24 August already settled the shape for the
staging Resend key (a separate key with a hard internal allowlist). Use that;
it is stricter than either option the runbook offered.

## 4. What running the suite against staging would actually require

Worth stating precisely, because "run the suite against staging" describes two
different things and only one of them is what Gate 0 asks for.

**What the suite is today.** `pnpm test` runs 11 turbo tasks: unit and
integration suites plus the guard set, against a **local Postgres and Redis**.
CI runs the same thing against **service containers** it starts itself
(`ci.yml` brings up `postgres:16` and `redis:7` with fixture credentials; there
are no repository secrets involved at all). Both are hermetic: the suite
creates its own world and tears it down.

**So pointing that suite at staging's database would be wrong**, and not in a
subtle way. The integration tests write, mutate and truncate. Running them
against the staging Neon branch would destroy the seeded fixture set the
security audit needs to be there. The hermetic suite should keep running
hermetically.

**What Gate 0's staging half actually means, then**, and this is a reading
rather than a quotation, flagged as such: the acceptance line is asking that
the same code, deployed to a running staging system, passes its checks in a
real environment rather than only in a test harness. Concretely, three things,
in increasing order of what they prove:

1. **The deploy path works against staging.** `deploy.sh` gains a staging
   target and runs clean: migrations apply, the build id verifies, the health
   endpoint reads ok with db up. ADR-007 already pins the condition on this:
   the staging target is written only after the infrastructure exists to prove
   it against, red and green, per the guard doctrine.
2. **The airplane e2e runs against the deployed staging app**, rather than
   against a locally started server. This is the one that would genuinely
   prove something new: the offline queue, service worker and drain path
   against a real deployment on real network conditions, which no current run
   exercises.
3. **The mechanical checks and a section 4 sitting run against staging first**,
   which the runbook names as a repo-side follow-up.

**Item 2 is where the real value is**, and it is worth saying because the
cheap reading of "suite green in staging" is item 1, which mostly proves the
deploy script works.

## 5. What this report does not do

It does not propose a substitute venue for the WK-SEC-001 audit. There is a
tempting one (run the audit against a local instance with synthetic data) and
it should be resisted: the audit is white-box against the deployed system's
configuration, and a local instance has different secrets, different network
boundaries, no CDN, no serverless edge, and no Neon. **Auditing a system that
is not the system is the shape of finding that reads as clean and is not**,
which is the class this repository has spent the week cataloguing.

It also does not estimate the standup. The six steps are dashboard operations
whose duration depends on accounts, not on engineering, and three of them
touch the custody question that `CUSTODY_TRANSFER_CHECKLIST_2026-08-28.md`
sequences behind LLC formation. **Whether staging is created under the
contractor-held accounts now or waits for entity-held accounts is a founder
call with a real trade in it**: waiting delays Phase 1, and not waiting means
creating a fourth and fifth account that will later need transferring. That
trade is stated, not taken.
