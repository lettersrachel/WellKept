---
status: living
---
# Diligence answers, 31 August 2026

The founder put a due-diligence question set to the developer. The developer
here is this development process: Claude Code sessions directed by the
founder, with the repository as the durable record. Every answer below is
from that record, with file or entry cited, and "unverifiable from here"
where the answer lives founder-side. Nothing is estimated where the record
holds no figure; per the standing rule, financial figures never enter this
repository, so the money questions are answered by naming where the answer
lives rather than by a number.

Premise corrections first, because several questions assume facts the
record contradicts:

- **There are no "three households" with more than a week of use.** The
  real tenants are Household Green (provisioned 25 August, pseudonymized,
  one external tester) and Field Test Home (a July field import, corporate
  access only since 25 August). Fernbrook and the Smoke Test Fixture are
  fixtures. **No client account has ever signed in; the member side is
  frozen at the digest by directive** (WK-DEV-007), and the digest itself
  is dark behind its flag awaiting the founder's sample approval.
- **There is no shipped iOS surface.** The native hours capture exists in
  code and was fixed (G-104) before the Apple Developer enrollment, which
  has not happened; the enrollment is the named pacing item.
- **"The four data models" has no referent here.** There is one schema, 60
  migrations, one database.
- **The v3.4 document and its remaining-cost figure are not in this
  repository** and cannot be examined from here.

## 1. What exists, against WK-DEV-006/007

One row per feature, four states as asked. "Done to acceptance" is used
only where a written acceptance exists and was met; the definition-of-done
question is answered below the table.

| Feature | State | Evidence and caveat |
|---|---|---|
| Substrate primitives: work_item, attention_record, decision_record | Built and tested (0041, 0042, 0043) | Each to the WK-DEV-011 section 4 definition of done; journeys in CI; production execution of their SWEEPS began only with the 31 August worker recovery (G-115) |
| Situation bundling | Built and tested (0056) | Manual bundling only; automatic grouping deliberately unbuilt (founder's relatedness rules) |
| PreferenceRule | Built and tested (0057) | App creates explicit rows only; confidence scale deliberately uninvented |
| capture_artifact (Tell Well Kept) | In use on real data (0044) | One production row through its whole lifecycle; file-into-work path unexercised outside tests |
| visit_brief_snapshot (evidence rail) | Built and in production (0045) | Every composed brief persisted; proven live |
| TrustCredential | Not started | Waits for the vendor slice by directive (WK-DEV-010) |
| IdentityAccessGrant expansion | Not started | Touches auth; its own session by decision |
| RelationshipMomentRecord | Not started | Held schema-free by the founder until her written definition |
| AIHumanHandoff | Not started | Tier M gate only, by directive |
| HOM Cockpit (/visit, mobile briefing, drafted close, contextual entry, company time, /my-time) | Built; in use by the founder and exercised by the tester provisioning | The "perfection pass" is open by design; no HOM other than the founder and Lauren has used it |
| Member digest | Built, dark | Behind the client_weekly_digest flag until the founder approves the sample; the scheduler had no production execution before the worker recovery |
| Client report email | Done to its written acceptance | First production run verified sentence by sentence (fourteenth-run record) |
| Standards store | Loaded, dark | 1,146 provisions; the 300-row floor review is undone, so seed_reviewed stays false and nothing provision-related renders anywhere. Floor enforcement exists as a tested library nothing calls |
| Anticipation engine | Built in shadow mode; ZERO production executions before 31 August | The A0 cap is enforced in code; promotion is computed and nothing promotes while rateThreshold is null (shipped default). The hourly shadow pass never ran in production until the worker recovery, because no worker build since 24 August could boot (G-115 second addendum) |
| Corporate dashboards (fleet board, corporate board, economics, drill-in) | In use on real and demo data | The founder reads them; capacity section under Ruling 1's amended bars |
| Household-state surfaces (drill-in, client preview) | In use | Check 8 passes are on the PREVIEW surface; no client has loaded their own playbook, because no client account exists |
| WL Gate 1 (six task objects, 0049 to 0054) | Built and tested | Gate 2 estimator waits on HG actuals and the Inventory adoption |
| G-111 paid time (0059, producer, self-access) | Built, deployed, journey-proven | The null-household CHECK has fired in CI journeys; no production row yet |
| Native capture surface | Built in part, unshipped | No device testing; enrollment pending |

**Used on real data for more than a week: nothing, by the calendar.**
Household Green is six days old as of this writing. The honest split is
not week-versus-demo but founder-exercised-in-production (visit close,
capture, provisioning, the dashboards, the client report email) versus
CI-proven-only (most refusal paths, the shadow engine, the digest).

**The definition of done, as practiced:** a feature is done when its
rails are proven in both directions (red on a violation, green on a
known-good case), its journey is in CI, its erasure treatment ships with
it or it does not ship, its legal surfaces update in the same PR, its
payload guards hold, and its refusals and confirmations are visible on
the page the operator stands on. That definition includes tests and error
handling structurally. It does NOT include "someone other than the
developer has used it": for most features the only human operators have
been the founder and one tester, and the record says so per feature
rather than claiming otherwise.

**Descoped or deferred, and whether quietly:** nothing was descoped
quietly; the register is the mechanism that prevents it. Deliberately
deferred, each with its recorded reason: the scheduling optimizer (the
standing first entry of the weekly deliberately-not-built line), every
founder taxonomy (severity routing, confidence scales, variance codes,
relatedness rules), auto-promotion and auto-commit (adopted invariants),
Tier M entirely, the member surface beyond the digest, and the systems
capture form (out of launch scope under 24.2, named so it does not drift
back). The one gap closest to a quiet descope is accessibility: the
WCAG 2.2 AA baseline is adopted law with NOTHING enforcing it (G-102),
and the record flags it as the one total gap rather than hiding it.

## 2. What finished means

The written acceptance framework exists: WK-DEV-006's four phases, Gate 0
item by item in GATE0_AND_PHASE_STATUS_2026-08-28.md, and per-feature
definitions of done in the directives. What is missing is a single
end-to-end acceptance for "a HOM can do X without a workaround" and "a
member sees Y"; drafting that with the founder is the right next
document, and this table is its input.

**What the developer would refuse to sign off today, and why:**

- Anything provision-facing, until the floor review runs: the entire
  standards layer is dark behind one founder afternoon.
- The covenant metrics as specified: **the monthly report does not exist,
  and Phase 2's acceptance criterion is not currently satisfiable as
  written** (G-103): per-HOM utilization is not a pure function of the
  outbox while the covenant events deliberately carry no person. That is
  a specification question for the founder, not an engineering gap.
- The member experience, until a real client account signs in and the
  digest sample is approved: everything member-facing is verified only
  through the corporate preview.
- Security posture as "audited": WK-SEC-001 is scoped and NOT run,
  because staging (its ruled venue, ADR-007) is not stood up; the whole
  of Phase 1 sits behind six dashboard operations.
- Accessibility: adopted baseline, zero enforcement, verified by search.
- The worker's reliability story, until the 31 August recovery holds for
  a week: it ran stale for a month while looking healthy (G-115), and
  the monitoring that should have caught it captured five days of
  failures nobody read.

## 3. Technical debt and hardening

**Test coverage.** The suite is 11 turbo tasks, uncached green as of this
writing: schema tests, web unit and integration tests, and the e2e
journeys plus the airplane offline drill (the counts live in the CI
output, not here, per the no-hand-carried-counts rule). **No line-coverage
percentage is measured; no coverage tooling is configured.** The
project's substitute is deliberate and different in kind: sixteen CI
guards that COMPUTE their inputs (payload signatures, erasure coverage,
legal census, staff disclosure, success and refusal visibility, and the
rest), each with a written not-covered column in CLAUDE.md. What breaks
on a change is what those guards and the journeys catch; what they do
not cover is written down next to each one, which is more than a
coverage number says.

**Known bugs and backlog.** The gap register runs G-1 through G-115,
append-only, each with disposition. Open as of this writing, counted by
hand: G-67 (an unreproduced silent-click failure mode, detection in
place), G-102 (accessibility enforcement), G-103 (covenant
specification), G-105 (a one-line directive edit awaiting the second
key), G-108/G-110 (library citation defects), G-114 (the drain's batch
window), and G-115 (in remediation this morning). None blocks daily
operation; the blocking items for LAUNCH are not bugs but undone
founder-side gates (floor review, staging, enrollment).

**Data model.** Sixty migrations, one per session by rule, generated SQL
read before applying, producers named per column. Existing records have
survived nineteen production deploys including the one non-additive
migration (0037, a reviewed copy-then-drop that preserved rows). Erasure
coverage is CI-enforced per table.

**Security.** Magic-link auth with a staff TOTP second factor and backup
codes (the recovery path proven reachable, G-54); the vault's secured
values encrypted under WK_KMS_KEY with boot-time key validation; the
audit-before-reveal invariant (no audit row, no value); three
permission-filtered projections with payload guards re-asserted in the
page; append-only audit with tokenized subject identity (ADR-006).
Backups: Neon branch snapshots are the standing rollback hatch; **the
restore drill has NOT been run** and is named in the custody checklist as
preceding any database-account transfer. **No external party has reviewed
the code, and the WK-SEC-001 penetration test has not run**; its scope
document is in the repo and staging is its ruled venue. What the
developer expects a pen test to find, from the section 32 review's own
concessions: the free-text residue class (a staff-only fact typed into a
client-visible field, which no mechanism catches), URL-borne state on the
confirmation and refusal params (the observability-privacy risk's live
surface), and the accessibility gap. The monitoring gap G-115 just
demonstrated (loud failures, nobody assigned to read them) is the
operational finding a reviewer would write first.

**Infrastructure.** Vercel (web), Neon (Postgres), Railway (worker),
Upstash (Redis), Resend (mail), Sentry (errors). Monthly cost is
founder-side and not in this repository by rule; the record notes
free-tier constraints twice (the Upstash command quota, which the worker
config was tuned for, and a Vercel free-tier observation in the run-rate
note). Single points of failure, honestly: every account is a personal
account (the custody checklist's subject); the worker is one service
whose failure modes were just demonstrated; there is no staging; and the
one human operator is the founder. If the development process is
unavailable for two weeks, the web app keeps serving and nothing merges;
continuity is designed to live in the written record rather than in
anyone's head, which is the next answer.

**Third-party dependencies.** The stack is pinned (TypeScript, Next.js,
Drizzle, Zod, BullMQ, pg, pnpm/turbo) with a no-new-dependencies rule
and a CI audit that fails on high or critical advisories. **The
anticipation engine has NO AI model or API dependency: it is
deterministic rules.** Tier M, the AI tier, is gated and unbuilt, so the
AI cost per household today is zero and any future cost arrives through
a two-key gate. No license audit has been run; the direct stack is
MIT/Apache-class, and a `pnpm licenses list` pass is cheap and is named
here as its own small session rather than asserted as done.

## 4. Effort and capacity

**Hours and rate.** The developer is an AI development process; there is
no hourly rate in the usual sense, and the actual spend (subscription,
founder hours directing it) is founder-side. The v3.4 figure's
assumptions cannot be examined from here because the document is not in
the repository. What the record does support: the cost driver is not
build hours but founder decision latency, because the build stalls only
on rulings, reviews, and dashboard operations, all of which are hers.

**Per-row estimates with confidence.** Deliberately not invented in this
document: an estimate table is its own pass against section 1's rows,
and this repository's own conventions (the estimate hierarchy, NULL as
the honest unknown) apply to its estimates too. At half budget, the
things to cut are the things already deferred (Tier M, the native app,
Gate 2's estimator); the things that cannot be cut are founder gates,
which cost calendar, not money. At double budget, the additions worth
making are hardening, not features: accessibility enforcement, the
outbox consumer buildout, staging plus the audit. The real risk sits in
the founder-side queue, not in engineering padding.

**A second engineer.** Yes, within a month, and arguably by design: the
repository is written for a reader with no shared context. CLAUDE.md
loads as premise; WORK_QUEUE.md is the index of what is open; the gap
register is the institutional memory; the guards fail loudly on the
mistakes a newcomer makes. Onboarding is: read CLAUDE.md, WORK_QUEUE,
and the register's last twenty entries; `pnpm install`, a local
Postgres, `db:demo`; the suite and the journeys. The gate on a second
engineer is credentials, not knowledge.

**Documentation and deployment.** DEPLOY.md, deploy.sh with an
eighteen-case selftest, STAGING_RUNBOOK, the custody checklist, ADRs,
and the directives. Someone else can deploy today in the knowledge
sense; in the access sense they cannot, because the Vercel link and env
live in the founder's accounts, which is the custody question, answered
next.

## 5. Ownership and custody

**Where things live.** The repository is under a personal GitHub User
account (lettersrachel), not an organization; 24.8's "GitHub
organization" is recorded as currently false. Vercel, Neon, Railway,
Upstash, Resend, and Sentry are contractor/founder-held accounts by the
28 August staging ruling, with S3 and KMS the named exception that opens
clean in the entity's name at formation. There is no custom domain in
the record; production serves from a vercel.app host. The Apple
Developer account does not exist yet. API keys live in the platform
dashboards, founder-controlled, never in the repository (a git-history
secret scan ran clean, ROUND6_FINDINGS_Q).

**Transfer.** SEQUENCED, not outstanding: the custody checklist's
trigger is "transfer when the entity exists and its accounts are open,"
blocked on LLC formation, which follows the founder agreements. The
checklist covers what breaks silently in the transfer, and the Railway
half of it was just proven prescient by G-115.

**IP assignment.** Not in this repository and unverifiable from here.
The custody engagement exists because this gap was identified; nothing
in the record shows it closed, so it should be treated as open until a
signed document says otherwise.

**Open-source licences.** No audit run; none of the pinned direct
dependencies is known-copyleft; the cheap definitive answer is the
licence pass named in section 3.
