---
status: living
---
# Custody: the org transfer checklist, and which accounts open clean instead

28 August 2026. **Nothing here is performed.** The transfer is a founder
action with a custody consequence and belongs on a day when the checklist is
in front of her.

## 0. Status: SEQUENCED, not outstanding

**The GitHub organization transfer is blocked on LLC formation, which follows
the founder agreements.** It is not an open task being carried; it is a task
whose precondition has not happened yet.

> **Trigger: transfer when the entity exists and its accounts are open.**

That distinction matters for how 24.8 reads. 24.8's clause "the GitHub
organization … owned by Well Kept Home Operations Management LLC" is currently
**false** as a statement of fact (the repository is under a User account,
established during the G-73 diagnosis) and **not yet actionable** as a task.
Both halves should be said together, because reporting only the first makes it
look like negligence and reporting only the second makes it look fine.

## 1. Why the checklist is worth having before the trigger fires

The transfer itself is a single GitHub action and takes a minute. What takes a
day, if it is discovered afterwards, is everything keyed to the old owner path
that silently stops being enforced. **The failure mode is not an error; it is
a control that quietly is not there**, which is precisely the month this
repository already spent believing branch protection existed (G-73).

So the checklist below is ordered by what breaks silently, not by what is
hardest.

## 2. What breaks, and what has to be re-established

### 2.1 Branch protection and the ruleset. BREAKS SILENTLY. Re-create first.

The protection on `main` lives in **ruleset 21654765**, not in classic branch
protection. Rulesets are repository-scoped objects; a transfer between account
types is where they are most likely to be dropped or partially carried, and
**a missing ruleset produces no error anywhere**, only a merge that would have
been refused going through.

What has to exist afterwards, read back from the endpoint rather than assumed
(this is the whole G-73 lesson):

| Property | Required value |
|---|---|
| Name / enforcement | `main`, `enforcement: active` |
| Target | branch, conditions including exactly `refs/heads/main` |
| `bypass_actors` | empty |
| Rules | `required_status_checks`, `pull_request`, `non_fast_forward`, `deletion` |
| Required checks, BY NAME | `gates` and `airplane` |
| Checks integration | 15368 (GitHub Actions) |
| `strict_required_status_checks_policy` | `true` |

**Verify against BOTH endpoints, not one.** `/repos/OWNER/REPO/branches/main`
reports `protected: true` with empty `contexts` and `enforcement_level: off`
even when a ruleset is doing the work, and can report `protected: false` while
a ruleset protects the branch. Neither endpoint alone answers the question.
Read `/repos/OWNER/REPO/rules/branches/main` and
`/repos/OWNER/REPO/rulesets/<id>` as well. **The ruleset id will be new after
the transfer**; 21654765 is the current one and should not be expected to
survive.

### 2.2 Actions permissions. BREAKS SILENTLY. Check the setting, not the runs.

Actions were disabled on this repository for ten hours on 26 August and the
only symptom was that no `ci` run existed. Under an organization there is a
second layer that does not exist today: **org-level Actions policy can
disable or restrict what the repo setting allows**, and the repo setting will
look correct while the org policy overrides it.

After transfer, confirm in this order: org Settings, Actions, General (policy
allows the repo); then repo Settings, Actions, General; then that a real run
was created for a real push. The third is the only one that proves the first
two, which is why it is not skippable.

Also check: **`GITHUB_TOKEN` default permissions**, which organizations
commonly set to read-only fleet-wide. `ci.yml` does not currently need write
scopes, so this should be harmless, but a restrictive default is exactly the
kind of thing that is discovered by a failing job three weeks later.

### 2.3 Secrets. Nothing to migrate, and that is worth confirming rather than assuming.

**`ci.yml` references no repository secrets at all.** Verified by search across
`.github/workflows/` (one workflow file; zero `secrets.` references). Postgres
and Redis come up as service containers with fixture credentials written in
the workflow, and every guard runs against them.

So **the secrets column of this transfer is empty on the CI side**. The
secrets that matter (`DATABASE_URL`, `WK_KMS_KEY`, `AUTH_SECRET`, `REDIS_URL`,
`RESEND_API_KEY`) live in Vercel and Railway, not in GitHub, and are unaffected
by a repository transfer. They are affected by the hosting-account questions in
section 3.

Confirm after transfer that this is still true, i.e. that the repo secrets list
is empty, rather than inheriting org-level secrets that would newly be visible
to workflows.

### 2.4 The merge protocol's endpoint paths. TWO PROBLEMS, ONE OF THEM LARGER.

**`tooling/deploy.sh` handles the transfer correctly, with one silent case.**
It derives the slug from the origin URL (`deploy.sh:341`) rather than
hardcoding it, and refuses if it cannot (`:342`). So the CI gate at `:343`
follows the repository automatically **once the local remote is updated**. The
silent case: GitHub redirects API calls on the old owner path to the new
repository, so a stale `origin` keeps working and the gate keeps passing while
naming an owner that no longer holds the repo. It will not fail; it will just
be describing the wrong path. `git remote set-url origin` after transfer, on
every clone.

**The verify-then-merge script is a larger problem and it is not about the
transfer.** It hardcodes `lettersrachel/WellKept` as its API base, which would
need one edit. But:

> **The script is not in the repository.** It exists only in the session
> scratchpad at `/tmp/.../scratchpad/verify-merge.sh`, which is a temporary
> directory that does not survive the container.

`CLAUDE.md`'s Merging section describes it as one of two controls that are
**both kept**, doing a job branch protection cannot do (refusing a zero-run
suite, binding the sha read to the sha merged). A control that lives in a temp
directory is not kept; it is re-created from memory each time, which is the
class of thing this repository converts into guards on principle. **Reported
here rather than fixed, because it is outside these five tasks**, but it
should be a one-commit session: move it to `tooling/verify-merge.sh`, derive
the slug from `origin` the way `deploy.sh` does, and the transfer question
answers itself.

### 2.5 Webhook and deploy integrations keyed to the owner path

Each of these is a GitHub App installation or a webhook bound to the current
owner, and each has to be re-authorized against the organization. **None fails
loudly; each simply stops firing.**

| Integration | What stops | How it is noticed today |
|---|---|---|
| Vercel Git integration (project `wellkept`, `prj_15Q69KLCnnRMQQZp8Ou4tORuZBQq`) | builds stop being created from pushes | Vercel does not auto-deploy on push here anyway (deploys are `deploy.sh`), so this is the least dangerous one |
| Railway Git integration (the worker service) | **the worker stops picking up new commits**, silently, while the old build keeps running | nothing in the repo can see this; the dashboard is the only control surface |
| Any repository webhook | whatever consumed it | not enumerable from here; check Settings, Webhooks before and after |

**The Railway one is the sharp edge**, because a worker that keeps running old
code looks exactly like a worker that is up to date. The daily sweep would
keep firing, from the previous build.

**Also, and unrelated to the transfer but on the same settings page:** the
repository `homepage` field still points at the deleted `well-kept-web`
project, a dead link. Fix it to `PROD_HOST` while the settings page is open.

### 2.6 Order of operations

1. Entity exists; entity accounts open (section 3).
2. Create the organization under the LLC. Do not transfer yet.
3. Transfer the repository.
4. Re-create the ruleset; read it back from both endpoints.
5. Confirm Actions at org level, repo level, and by a real run.
6. Re-authorize Vercel and Railway; confirm the Railway service builds a new commit.
7. `git remote set-url origin` on every clone; fix `homepage`.
8. Confirm repo secrets list is still empty.
9. **Then** test the whole thing with one throwaway PR that must be refused: push a commit that fails `gates` and confirm the merge is blocked. A control proven by refusing something real is worth more than a settings page that looks right.

Step 9 is the one most likely to be skipped and the only one that proves the
other eight.

## 3. The other accounts 24.8 names, and which can open clean

The question worth answering now: **which of these can be opened in the
entity's name at formation rather than transferred afterwards.** Opening clean
is cheaper than migrating in every case below, and for two of them the
migration is genuinely painful.

| 24.8 account | Stack item | Open clean at formation? | Notes |
|---|---|---|---|
| Hosting | Vercel | **Partly.** A new team can be created under the entity, but the existing project carries a pinned project id, a production domain, and five environment variables | `deploy.sh` pins `prj_15Q69KLCnnRMQQZp8Ou4tORuZBQq` and `wellkept-orcin.vercel.app`. Both change on a move to a new team, and both are checked by the deploy gate, so it will refuse loudly rather than silently. Re-pin in the same commit as the move |
| Database | Neon | **NO. Migrate, do not re-open.** | The production database holds real rows. Re-creating means a dump and restore, and it is the one account where "open clean" would mean losing history. Neon supports transferring a project between orgs; use that. **Do the restore drill BEFORE this, not after**: it is owed anyway (Phase 1) and this is the moment its result matters |
| Object store | S3 / KMS | **YES, and this is the one to open clean.** | Photo retention is 5 years under REQ-075 and the KEK is the vault's root of trust. Opening an entity-owned AWS account at formation and pointing new writes at it is far cheaper than migrating a bucket and rotating a KEK later. **If it is opened clean, do it before Household Zero ingests**, since every photo written to a contractor-owned bucket is a photo that has to be moved |
| Billing | every account above, plus Upstash, Resend, Sentry, Expo/EAS | **YES for all.** | Payment instrument and billing email are per-account settings, not data. Every one of these should be opened or re-pointed to the entity at formation. This is also the REQ-085 run-rate line's natural home: one entity payer means one place to read the monthly figure, which is currently the reason the run-rate statement is founder-side guesswork |

**The one-sentence version:** open S3/KMS and every billing relationship clean
in the entity's name at formation; transfer GitHub, Vercel and Neon, in that
order; and do the Neon restore drill before touching the database account.

## 4. What this does not cover

- **The contractor IP assignment memorandum.** 24.8 requires it to execute
  before any commit beyond Gate 0, and it is in the counsel queue. That is a
  legal precondition to the whole custody question and is not an engineering
  item.
- **The second-developer custody audit** against handoff section 20's artifact
  list, also required before real household data enters. Not performed.
- **The account matrix and the simulated offboarding**, which are Phase 1
  acceptance lines and founder-side.

None of the three is blocked on the transfer, and the transfer is not blocked
on any of them.
