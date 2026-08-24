---
status: frozen
---
**WELL KEPT**

**Software Developer Implementation Handoff**

Final library and research reconciliation

**Prepared 24 August 2026  
CONFIDENTIAL - INTERNAL IMPLEMENTATION USE**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Purpose<br />
</strong>Give the software developer a single, implementation-oriented
guide that reconciles the current confidential library, the
running-system documentation, and the product, trust, accessibility,
notification, dashboard, and developer-maintenance research completed in
this chat. This document is not permission to override controlled
requirements. Where the library conflicts, it names the decision or
reconciliation that must occur before code changes.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Contents

1\. Executive implementation brief

2\. Authority, source-of-truth and conflicts

3\. First implementation gates

4\. What appears to exist now and what must be verified

5\. Target product architecture: nine core primitives

6\. Shared engines that prevent duplicate systems

7\. HOM Cockpit

8\. Client experience: calm anti-dashboard

9\. Corporate and operating dashboards

10\. Notification and attention architecture

11\. Accessibility architecture

12\. Trust, privacy and security architecture

13\. Vendor trust and recommendation provenance

14\. AI and automation authority

15\. Developer observability, release safety and continuous learning

16\. Data, events and integration conventions

17\. Implementation sequence

18\. Definition of Done and pull-request gate

19\. Test matrix and launch-readiness gates

20\. Developer custody and handoff package

21\. Risk and decision register

22\. Candidate requirement deltas

23\. Source map and benchmark lessons

24\. Business reconciliation deltas (24 Aug 2026)

Appendix A. Developer checklists

Appendix B. Example domain/event shapes

# 1. Executive implementation brief

Well Kept should not be implemented as a conventional household task
manager, CRM, or concierge chat app. The library and the external
software research converge on one product thesis: the company is a
human-led household operations service whose software holds memory,
tracks state, detects exceptions, routes decisions, enforces trust
boundaries, and makes excellent service repeatable while exposing as
little complexity to the household as possible.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>North-star product rule<br />
</strong>Every internal system must either reduce member effort or stay
invisible. The client product should therefore optimize for relief,
confidence, and fewer required decisions, not engagement, task
completion, or time spent in the app. This is the software expression of
WK-STD-042, The Invisibility Rule.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## The developer should optimize for five outcomes

> **1.** One source of truth, many role-specific views. Client, HOM,
> Desk, corporate, Trust, and developer surfaces may look different, but
> they should not create conflicting underlying states.
>
> **2.** Normal work disappears; exceptions earn attention. The system
> should watch routine work so people do not have to watch the system.
>
> **3.** Human judgment remains where consequence, uncertainty, privacy,
> safety, or irreversibility require it. Automation should prepare,
> route, and execute only within explicit authority.
>
> **4.** The safest and most accessible path is the default path.
> Security, privacy, accessibility, provenance, and audit behavior
> belong in shared components and services, not feature-by-feature
> memory.
>
> **5.** Every material failure leaves the product easier to diagnose,
> harder to break the same way again, and clearer to the next developer
> who maintains it.

## Do not start by adding features

The immediate work is reconciliation, custody, security clearance, and
shared substrate. The current library contains both a documented running
proprietary core and older launch documents that still describe a
Jobber/paper operating model. Building new features before resolving
that platform authority would create avoidable rework and could put real
household data into a system that has not yet passed its current
security gate.

# 2. Authority, source-of-truth and conflicts

## 2.1 Authority hierarchy for implementation

| **Tier**                        | **Use**                                                         | **Primary sources / rule**                                                                                                              |
|---------------------------------|-----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| A - Controlling                 | Code against these first                                        | 00_CURRENT_AUTHORITY.txt; WK-DEV-001..005; WK-SEC-001; adopted INSTRUCTION_UPDATES_2026-08-05_v2; current assumption register and ADRs. |
| B - Current operating doctrine  | Translate into product behavior                                 | Current STD, SOP, PLAY, TRN, OPS and APP documents in folders 01-11, when consistent with Tier A.                                       |
| C - Design direction / research | Use as design input, not authority over controlled requirements | Architecture review, anticipation/collision/verification/inference specs, benchmark research, and this handoff.                         |
| D - Superseded                  | Do not implement from these                                     | 99_ARCHIVE_superseded and any current file explicitly marked stale or awaiting rebuild.                                                 |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Conflict rule<br />
</strong>If the code, requirement, ADR, current authority page, or
controlled SOP disagree, stop the affected implementation path and
record the conflict. Do not silently reconcile a conflict in code.
WK-DEV-004 already establishes the same discipline for architecture and
permissions.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 2.2 Conflicts that must be resolved before implementation expands

| **Conflict**                      | **Why it matters**                                                                                                                                                                                                          | **Developer action**                                                                                                                                                              |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Operating platform for 2027       | Older APP/SOP materials describe paper + Jobber at launch and proprietary software later. Newer architecture review, scope estimate, and corrected stack document a functioning proprietary permissions/vault/offline core. | Founder-signed 2027 Operating Platform Decision after repo verification and security review. Name the authoritative system for each workflow and Jobber's exact role, if any.     |
| Security audit timing             | Older technology schedule deferred independent penetration testing. WK-SEC-001 and current external material now gate real household data on a white-box security audit with retest.                                        | Treat WK-SEC-001 as the current security gate. No real household data enters the proprietary system until the gate is cleared.                                                    |
| Adopted requirements not appended | REQ-078 through REQ-082 are adopted in INSTRUCTION_UPDATES_2026-08-05_v2 but not yet appended to WK-DEV-001.                                                                                                                | Housekeeping change only: append without renumbering and preserve their stated implementation gates.                                                                              |
| Accessibility baseline            | REQ-074 still references WCAG 2.1 AA and P1 client portal only. Current W3C recommendation is WCAG 2.2.                                                                                                                     | Propose WCAG 2.2 AA as the engineering baseline for critical client, HOM, and corporate workflows, and document founder approval before changing controlled requirement priority. |
| Staff MFA                         | REQ-003 mandates TOTP MFA. CISA now recommends phishing-resistant MFA such as FIDO/WebAuthn.                                                                                                                                | Design passkey/security-key support for staff/admin with documented recovery. Do not remove TOTP until migration and recovery are proven.                                         |
| Deletion logic                    | REQ-076 is withdrawn; REQ-077 replaces it as company policy. APP-008 corrected docs still contain stale deletion references.                                                                                                | Reconcile deletion behavior with REQ-077 and counsel/founder ruling before coding recipient deletion. Never resurrect REQ-076 assumptions.                                        |
| Terminology/date drift            | Older files still use pilot, Academy, old scale assumptions, and stale stack technologies.                                                                                                                                  | Do not encode historical terms or old scale figures as constants. Current language is commercial launch, Founding HOM Training, Household Operations Manager/HOM.                 |
| Email deliverability              | A Resend message was reported delivered but not received.                                                                                                                                                                   | Delivery, bounce, complaint and suppression webhooks plus alerting are required before email is relied upon for decisions or escalation.                                          |

# 3. First implementation gates

## Gate 0 - Repository and authority reconciliation

- Obtain the current repository, production/staging commit IDs,
  hosting/deployment configuration, database migration history, worker
  configuration, mobile build configuration, and observability account
  access.

- Run the monorepo locally and in staging. Run the complete current test
  suite before changing dependencies or architecture.

- Produce a short VERIFIED AGAINST REPO delta report against WK-DEV-003.
  Mark every stack row as verified, changed, planned, removed, or
  unknown.

- Confirm whether Redis/BullMQ workers and trigger sweeps are active,
  paused, or partially implemented. Do not infer from old plans.

- Inventory all existing migrations, feature flags, queues, scheduled
  jobs, synthetic fixtures, integration credentials by owner, and
  environment variables. Record names and ownership, never secret
  values.

- Append adopted REQ-078..082 to the requirements document as
  housekeeping.

- Reconcile current terminology, status-tag spellings, stale deletion
  references, and any repo documentation that still states a withdrawn
  requirement.

- Produce the one-page 2027 Operating Platform Decision and
  source-of-truth map for founder sign-off.

## Gate 1 - Security and custody before real household data

- Complete WK-SEC-001 white-box audit using staging and synthetic data
  only. The explicit gate is zero unresolved critical/high findings
  touching tenant isolation, authentication/authorization, photo layer,
  or restricted-access class, plus closure or formal risk acceptance of
  named technical debt.

- Prove a second authorized technical owner can deploy, roll back,
  revoke sessions, restore a database backup, rotate a secret, and
  locate the incident runbook without founder intervention.

- Implement or verify the centralized permission-action wrapper and lint
  rule so business actions cannot bypass the permissions package by
  habit.

- Verify S3 presigned URL scoping and expiry, photo-destruction
  semantics, mobile at-rest behavior, session revocation, and audit
  tamper resistance.

- Add phishing-resistant staff/admin authentication plan, including
  passkey or hardware-key path, recovery process, and device/offboarding
  controls.

- Run a restore drill. A backup that has never been restored is not
  evidence of recoverability.

- Configure observability to scrub household data at collection time,
  not by developer convention after ingestion.

## Gate 2 - Shared substrate before feature expansion

The architecture review correctly identified two missing shared
substrates. Build these before allowing anticipation, verification,
recommendation, or notification features to invent their own mechanisms.

> **1.** Transactional field-change outbox/event stream. A
> state-changing database transaction writes the business change and its
> durable outbox event together. BullMQ drains the outbox idempotently.
> This becomes the common source for triggers, derived fields,
> waiting/attention resurfacing, monitoring, audit-linked notifications,
> and analytics.
>
> **2.** Coordinated field-attribute extension. Define
> provenance/knowing state, source-vs-derived, derivation expression,
> confidence, materiality, consequence class, lifecycle/staleness, and
> judgment-free schema constraints once in a schema RFC. Migrate
> incrementally after repo reconciliation.

# 4. What appears to exist now and what must be verified

The library contains evidence of a running, deliberately boring
modular-monolith stack. Treat the following as implementation claims to
verify against the current repository, not as permission to rebuild
them.

| **Area**                | **Library evidence**                                                                     | **Developer posture**                                                                                                                       |
|-------------------------|------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Monorepo / web / mobile | TypeScript, Node, pnpm/Turborepo, Next.js, React, Expo/React Native.                     | Verify exact versions and current build commands. Run pnpm outdated once, propose a pin-refresh PR, then freeze to an intentional baseline. |
| API / schema            | Next.js server actions, Zod, Drizzle/Postgres.                                           | Do not re-platform to tRPC or another API style without a demonstrated problem and ADR.                                                     |
| Offline                 | In-house @wellkept/offline-queue.                                                        | Preserve the airplane-test invariant. Do not replace with WatermelonDB based on stale docs.                                                 |
| Permissions             | Shared permissions package; client should never receive S2/S3; S3 and writes audited.    | Verify centralized enforcement and generated contract tests. UI hiding is never security.                                                   |
| Vault / photos          | S3-compatible object store, per-household data keys, KMS wrapping, presigned access.     | Security audit must prove tenant isolation, expiration and destruction semantics.                                                           |
| Auth                    | Auth.js, staff MFA, client magic links.                                                  | Verify session revocation and role transitions. Add phishing-resistant MFA plan.                                                            |
| Worker                  | Redis + BullMQ planned/used for background work.                                         | Verify worker state and ownership before outbox design.                                                                                     |
| Observability           | Sentry + Axiom named in current stack.                                                   | Verify SDK configuration, data scrubbing, release mapping, alert ownership, retention and whether replay is enabled.                        |
| Email / push            | Resend and Expo Notifications.                                                           | Treat deliverability as unresolved until webhooks and end-to-end tests exist.                                                               |
| Testing                 | Vitest, Playwright, Maestro, GitHub Actions.                                             | Preserve and expand around critical user journeys, permissions, accessibility, offline, and release regression.                             |
| Architecture            | One model / three projections, provenance on writes, close flow, LIFE-EVENT suppression. | Preserve. These are load-bearing design decisions unless evidence requires an ADR change.                                                   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Do not rebuild verified P0 functions<br />
</strong>The July developer scope document suggests most P0 capability
was already built/verified at that point. The next developer should
first establish current truth in code. The highest-value early
contribution may be custody, security, testability, observability, and
reconciliation rather than greenfield construction.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 5. Target product architecture: nine core primitives

The chat sweep and library sweep repeatedly converged on the same domain
concepts. Consolidating them prevents separate modules from creating
duplicate task, notification, decision, audit, and vendor states.

| **Primitive**       | **Purpose**                                                                                                 | **Key design rule**                                                                                                    |
|---------------------|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| Household           | Tenant/security boundary, service context, role relationships, status and operating preferences.            | Every household-scoped object must carry household_id; authorization is checked at query/action time.                  |
| WorkItem            | Any meaningful unit of household work, including recurring work, vendor work, Runways and follow-up.        | Stateful lifecycle, owner, dependencies, deadline/window, sensitivity, source, completion evidence.                    |
| AttentionRecord     | A reason a person/system needs to notice or act. Powers Needs You, Waiting, Watching, alerts and reminders. | Owner, audience, urgency, deadline, acknowledgment, resolution, sensitivity, delivery strategy.                        |
| DecisionRecord      | A genuine choice routed to the household or authorized operator.                                            | Recommendation, alternatives, evidence/provenance, authority rule, outcome, decider, time, expiry.                     |
| PreferenceRule      | Household-specific fact about how to operate, including standing approval and decision style.               | Explicit vs observed vs inferred provenance; confidence; expiry/review date; never silently convert inference to fact. |
| IdentityAccessGrant | Role and purpose-limited authority to a household/object.                                                   | Scope, role, purpose, start/expiry, authentication strength, reason, revocation, break-glass flag.                     |
| TrustCredential     | Verified attribute about vendor/employee/provider.                                                          | Credential type, issuer/source, scope, result, date, expiry, reviewer, limitations.                                    |
| IncidentException   | Abnormal condition, trust/safety event, service recovery, or system defect.                                 | Severity, owner, containment, affected scope, recovery, root cause, corrective action, learning link.                  |
| EventAuditRecord    | Immutable or append-oriented history of material state changes and evidence for observability/learning.     | Event type, actor, household/pseudonym, object, prior/new state hashes, correlation ID, timestamp, provenance.         |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Physical schema caution<br />
</strong>These are semantic primitives, not a mandate to create nine new
tables immediately. Write one domain RFC that defines ownership,
lifecycle, invariants and event semantics. Reuse existing tables where
they already express the concept cleanly. Migrate only after the repo
has been reconciled.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 6. Shared engines that prevent duplicate systems

| **Engine**                  | **Combines**                                                                                                   | **Non-negotiable**                                                                                                                                                                                          |
|-----------------------------|----------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Household Attention System  | Today, Needs You, Waiting, Watching, reminders, notifications, escalation, widgets, accessibility.             | One attention object. Channels are projections, not separate queues. Delivery is not acknowledgment; acknowledgment is not resolution.                                                                      |
| Household Work State Model  | Tasks, vendor workflows, Runways, visits, follow-ups.                                                          | Detected -\> Owned -\> Researching -\> Waiting -\> Decision prepared -\> Approved -\> Scheduled -\> In progress -\> Verify -\> Record updated -\> Closed. Specialized workflows may extend, not contradict. |
| Exception Engine            | Household Watch, Andon, vendor expirations, safety, access anomalies, quality, software errors, company drift. | Normal work stays quiet. Exceptions have source, severity/materiality, owner, next action, resolution condition and learning outcome.                                                                       |
| Authority Engine            | HOM authority, client decision routing, AI permission, spending/standing approval, escalation.                 | Confidence + consequence + reversibility + explicit household rule determine who can act.                                                                                                                   |
| Trust Boundary              | Tenant isolation, access grants, consent, sensitive reveal, audit, data minimization.                          | A relationship never implies permission. Seniority never implies unrestricted household access.                                                                                                             |
| Learning and Release System | Telemetry, experiments, incidents, near misses, regression tests, ADRs, release health.                        | Every material problem produces a durable change to code/test/runbook/architecture or a documented decision to accept it.                                                                                   |

# 7. HOM Cockpit

The HOM surface is an action cockpit, not a reporting dashboard. It
should answer: what deserves attention next, where do I need to be, what
changed, what am I waiting on, what could become a problem, and what
household context do I need before I act?

## 7.1 Home screen

| **Band**        | **What appears**                                                                                                  | **Design behavior**                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| TODAY           | Visits, travel buffers, hard deadlines, vendor windows, preparation items.                                        | Visual timeline. Do not mix low-priority open loops into the timeline.                       |
| NEEDS ATTENTION | Client decision due, overdue vendor response, hard-stop verification, coverage issue, new safety/trust exception. | Rank by consequence/deadline. Each card has owner and next action.                           |
| WHAT CHANGED    | Material changes since last HOM view/visit.                                                                       | System performs comparison. HOM should not reconstruct deltas manually.                      |
| WAITING         | Externally blocked items.                                                                                         | Hidden from active attention until reply or resurfacing date; then returns automatically.    |
| WATCHING        | Potential future work or uncertain signals.                                                                       | Not a to-do. Shows reason, confidence and next observation date.                             |
| MY CAPACITY     | Used, committed and likely/in-flight load.                                                                        | No productivity leaderboard. Surface overload and coverage risk, not task-count competition. |

## 7.2 Household briefing

- Today's purpose and sequence.

- Critical/caution/delight flags first.

- Deltas since last meaningful touch.

- Household preferences relevant to today only.

- Open work by state, not raw task list.

- Current decision rights that may apply.

- Upcoming occasion/routine radar and known constraints.

- Watch items and hard-stop verification due.

- What not to forget, including items physically with the HOM.

- One tap to full Household Record when deeper context is needed.

## 7.3 Visit Mode

> **1.** Arrival: show objectives, access instructions only in context,
> vendor arrivals, relevant watch items and safety information.
>
> **2.** Capture: photo, scan, voice note, observation, handled item,
> follow-up, dot, anomaly/Andon, Desk request. System captures state
> automatically where possible.
>
> **3.** Focused execution: hide unrelated corporate work and unrelated
> households.
>
> **4.** Close: confirm tasks, hours, photos, required changes-noticed
> (none allowed), dots, life-change signal, zone drift, new
> waiting/watch items, completion evidence.
>
> **5.** Generate the client-facing report from the operational record.
> The HOM edits judgment/tone, not a second administrative
> reconstruction.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Preserve the airplane test<br />
</strong>The full visit must remain capturable offline and drain in
order on reconnect. Offline conflicts should not block HOM submission;
they should create a corporate conflict row under the existing
last-write-wins rule.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 8. Client experience: calm anti-dashboard

The client product should expose the minimum information needed to feel
confident and take actions that genuinely require household judgment. It
should not turn operational transparency into another household project.

## 8.1 Recommended home hierarchy

| **Section**           | **Default content**                                                          | **What should stay hidden unless opened**                    |
|-----------------------|------------------------------------------------------------------------------|--------------------------------------------------------------|
| NOTHING NEEDS YOU     | Preferred empty state when no client decision/action exists.                 | No counts of internal tasks.                                 |
| NEEDS YOU             | Only real decisions, approvals or information only the household can supply. | Internal research, vendor chasing, staff coordination.       |
| TODAY                 | Awareness items that materially affect the household today.                  | Routine internal status changes.                             |
| WELL KEPT IS HANDLING | High-level state for meaningful work.                                        | Subtasks, comments, internal SLAs, vendor message history.   |
| WATCHING              | Only if a client benefits from knowing WK is monitoring something.           | Raw anomaly score, speculative models, internal risk queues. |
| RECENTLY DONE         | Meaningful outcomes, not activity feed.                                      | Every field edit and administrative event.                   |

## 8.2 Explicit UI prohibitions

- No giant red badge representing internal household work.

- No household productivity score, maintenance grade, streak, engagement
  loop or infinite activity feed.

- No client requirement to monitor a dashboard to ensure Well Kept is
  doing its job.

- No status notification simply because an internal task changed.

- No progress bar for intake completeness where the user can be served
  safely with incomplete data. N/A-confirmed and declined are valid
  states.

- No exposure of S2/S3 information through client payloads,
  notifications, widgets, URLs, analytics, crash reports or page source.

- No return of raw research when a prepared recommendation can reduce
  decision burden.

## 8.3 Prepared Decision component

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Decision title<br />
Recommended option<br />
Why it fits this household<br />
Key evidence / provenance<br />
Alternative option<br />
Tradeoff<br />
Confidence + why<br />
Deadline / consequence of waiting<br />
[Approve] [Choose alternative] [Ask HOM]<br />
Full research: progressive disclosure</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

The same component should be reused for vendors, purchases, repairs,
travel, Runways, and other household choices. The Decision Rights block
determines whether the decision appears at all.

# 9. Corporate and operating dashboards

Corporate needs different altitudes, not one giant dashboard. The same
underlying data should drive an Operating Control Tower, Company Health
view, and Strategic/Board view.

## 9.1 Operating Control Tower - daily operations

- Needs Intervention first: unowned work, coverage gap, hard-stop
  verification, overdue client decision, vendor exception, trust/safety
  issue, failed delivery, critical software degradation.

- Today's field picture: HOM status, visits, travel/coverage, active
  resets/onboarding, high-consequence vendor windows.

- Capacity: USED, COMMITTED, IN-FLIGHT. Separate current consumption
  from work already promised and likely emerging demand.

- Aging/stalled: items outside expected state window. Distinguish
  stale/unknown from known bad.

- Vendor/client exceptions: show patterns, not only individual
  incidents.

- Trust and safety: open incidents and unclosed access/credential
  issues.

- Upcoming demand: known Runways, seasonality, major household events
  and capacity constraints.

## 9.2 Company Health - weekly leadership

| **Question**                  | **Signals**                                                                                                       | **Drill-down**                                  |
|-------------------------------|-------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| Are clients receiving relief? | Client reminders/interventions, returned decisions, reopened loops, status inquiries, retention/referral signals. | Household pattern, not raw message volume.      |
| Is quality holding?           | Repeated exceptions, hard-stop misses, trust recovery, handoff errors, founder interventions.                     | Root cause category and owner.                  |
| Do we have capacity?          | Used/committed/in-flight, onboarding load, coverage exposure, geography, Desk support burden.                     | HOM/cluster only where operationally necessary. |
| Are people supported?         | Coverage, training/certification, workload imbalance, manager support signals.                                    | No surveillance or task leaderboard.            |
| Are economics tracking?       | Plan vs actual, committed spend, major variance, cash/runway as authorized.                                       | Source of variance.                             |
| Is trust intact?              | Privacy/security/access/screening incidents, unresolved audit items.                                              | Authorized drill-down only.                     |
| Are priorities moving?        | Initiative owner, on-track/at-risk/off-track, milestone, blocker, latest meaningful update.                       | Project detail only when needed.                |
| What changed?                 | Material delta since last review.                                                                                 | Explain cause and consequence.                  |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Dashboard rule<br />
</strong>Every widget must answer a decision question. Remove metrics
that are interesting but do not change action. Empty exception sections
should collapse into a simple healthy state so real abnormalities remain
salient.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 10. Notification and attention architecture

## 10.1 One canonical Attention Record, multiple surfaces

Push, email, SMS, in-app, web, widget, Live Activity, wearable and phone
are delivery channels, not separate sources of truth. Features should
create an Attention Record. A Notification Orchestration Service
determines whether, when and where it appears based on role, household
rules, sensitivity, urgency, quiet hours, accessibility preferences and
current acknowledgment state.

## 10.2 Required lifecycle

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>CREATED -&gt; ROUTED -&gt; DELIVERED -&gt; SEEN (weak evidence)
-&gt; ACKNOWLEDGED -&gt; RESOLVED<br />
\-&gt; ESCALATED if required and unacknowledged<br />
<br />
Delivery never equals ownership. Acknowledgment never equals
resolution.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 10.3 Interruption tiers

| **Tier**                    | **Meaning**                                  | **Default behavior**                                                                          |
|-----------------------------|----------------------------------------------|-----------------------------------------------------------------------------------------------|
| 0 - Record only             | No person needs interruption.                | Durable history; optional digest.                                                             |
| 1 - Awareness               | Useful to know, no immediate action.         | In-app/digest; widget only if relevant; push optional by preference.                          |
| 2 - Action required         | A person must decide or supply information.  | Needs You + push; email fallback if configured; deadline-aware reminder.                      |
| 3 - Urgent / trust / safety | Immediate action or acknowledgment required. | Redundant channels intentionally; escalate until explicit acknowledgment according to policy. |

## 10.4 Delivery rules

- If Well Kept owns the work, do not notify the client merely because
  work was discovered.

- If the user is active in the relevant surface, suppress duplicate
  immediate push where platform behavior allows.

- Email opens and push delivery are not acknowledgment.

- Quiet hours apply to outbound communication. Preserve the adopted
  inbound-reply exception in REQ-079.

- Widgets provide ambient awareness, never assurance for critical
  information.

- Ongoing events should update one live surface rather than emit a
  stream of repeated pushes when the platform supports it.

- Notification privacy must support full detail, reduced detail and
  private mode. Never expose security codes, child/health details,
  financial data, sensitive access details or revealing travel-away
  status on lock screens.

- Every meaningful notification remains represented in the authoritative
  in-app record after transient surfaces disappear.

- Implement delivery/bounce/complaint/suppression webhooks and an
  observable delivery state before relying on email operationally.

# 11. Accessibility architecture

Accessibility should be a system property, not a remediation project.
Current W3C guidance recommends WCAG 2.2. Well Kept should propose WCAG
2.2 AA as the engineering target for critical client, HOM and corporate
workflows and keep legal/compliance interpretation with counsel.

## 11.1 Component accessibility contract

| **Component requirement** | **Implementation expectation**                                                                                    |
|---------------------------|-------------------------------------------------------------------------------------------------------------------|
| Keyboard                  | All functionality operable without mouse; logical tab order; no keyboard trap; arrow-key patterns where standard. |
| Focus                     | Consistent visible focus token; focus moved/restored intentionally after dialog, error summary and route changes. |
| Names/roles/states        | Native semantic controls first. Accessible name, role and state defined for custom controls.                      |
| Contrast                  | Approved semantic palette; text/UI contrast validated; never encode status through color alone.                   |
| Forms                     | Persistent programmatic labels, linked hints/errors, retained input, error summary that links to fields.          |
| Dynamic status            | Meaningful status exposed to assistive technology without stealing focus; avoid excessive live-region chatter.    |
| Images/data               | Meaningful visuals have equivalent text; charts provide conclusion and accessible data table where useful.        |
| Media                     | Captions + searchable transcript; audio description where visual information is not otherwise conveyed.           |
| Reflow/zoom               | Critical workflows usable at large text/zoom without loss of action or content.                                   |
| Motion                    | Respect reduced-motion settings; motion never required to understand state.                                       |
| Touch                     | Adequate target sizing and alternatives to precision dragging.                                                    |
| Authentication            | Do not require inaccessible cognitive puzzles; support password managers/passkeys and accessible recovery.        |

## 11.2 Accessibility QA

- Automated accessibility checks in Storybook/component CI and
  full-flow CI. Automated passing is not proof of accessibility.

- Manual keyboard-only tests for every critical flow.

- VoiceOver/iOS and macOS, NVDA/Windows, TalkBack/Android for relevant
  surfaces.

- High zoom, large text, reduced motion, high contrast and
  orientation/reflow testing.

- Periodic compensated testing by actual users with disabilities using
  real tasks such as finding Needs You, approving a repair, finding the
  next HOM visit and changing notification preferences.

- Accessibility Vendor Gate for embedded calendar, payments, chat, maps,
  signatures and other third-party UI. Request current ACR/VPAT where
  available, but independently test critical flows.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Design implication<br />
</strong>A calm premium interface should get its subtlety from spacing,
hierarchy, limited content and progressive disclosure, not pale gray
text, thin type or ambiguous color distinctions.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 12. Trust, privacy and security architecture

## 12.1 Household is the security boundary

- Every household-scoped record carries household_id and every
  query/action checks household scope server-side.

- A relationship between records never inherits access automatically. A
  relative, vendor or backup HOM may be related without being
  authorized.

- Least privilege by role, household, purpose and time. Seniority alone
  never creates broad household visibility.

- S3 reveal is contextual, explicit, time-limited and audited.
  Break-glass access, if supported, requires reason, narrow duration,
  security logging and post-review.

- Client payloads never contain S2/S3 keys. Test this in CI on every
  build.

- No sensitive household content in logs, analytics, crash reports,
  session replay, URLs or notification bodies unless a specific
  controlled design permits it.

- Data minimization: ask whether the service genuinely needs to retain
  each field. High-touch service does not justify unrestricted
  collection.

- Deletion must consider derivatives, caches, exports and AI artifacts
  where policy requires deletion. Do not claim automated deletion
  behavior until implemented and verified.

## 12.2 Security audit acceptance

WK-SEC-001 is the current operational gate for real household data in
the proprietary platform. Its critical test areas must be represented in
the developer threat model and release checklist: tenant isolation,
presigned-photo layer, authentication/authorization, consent
enforcement, known technical debt, mobile device behavior, OWASP
coverage plus AI prompt-injection/data-exfiltration,
infrastructure/secrets/backups, and tamper-evident audit behavior.

## 12.3 Recommended supplemental standards

- Use OWASP ASVS 5.0 as a structured engineering verification matrix for
  application security controls. This is a technical benchmark, not a
  legal compliance claim.

- Add phishing-resistant MFA support for privileged staff/admin accounts
  using FIDO2/WebAuthn/passkeys or security keys, with documented
  recovery and offboarding.

- Maintain dependency, code and secret scanning in CI. High-risk
  findings block release until resolved or formally accepted by the
  authorized risk owner.

- Treat external content consumed by AI, including email/web/vendor
  documents, as untrusted input. Prompt content cannot change policy,
  permissions or tool authority.

# 13. Vendor trust and recommendation provenance

Do not collapse verification and recommendation into one badge. A vendor
can have valid insurance and still be a poor fit; a trusted
client-preferred vendor can be known without every credential being
verified.

## 13.1 Trust Credential Ledger

| **Field**            | **Example / rule**                                                                |
|----------------------|-----------------------------------------------------------------------------------|
| Credential type      | Identity, license, insurance, background screen where appropriate, certification. |
| Source / issuer      | Who supplied or verified it.                                                      |
| Scope                | Jurisdiction, service category, person/entity covered.                            |
| Verified date        | Exact date.                                                                       |
| Expiration / recheck | Date or none; drives attention resurfacing.                                       |
| Result               | Verified / not verified / expired / unavailable / not applicable.                 |
| Limitations          | What this verification does not establish.                                        |
| Reviewer             | Authorized internal reviewer.                                                     |
| Evidence             | Controlled reference to source document, not an ungoverned duplicate.             |

## 13.2 Recommendation provenance

- Client preferred or previously used.

- Well Kept previously used, with relevant household/service context.

- Referred by trusted source.

- Externally researched candidate.

- Credential status and limitations.

- Geographic fit, availability, household preference fit and price/value
  fit.

- Historical reliability and service-recovery evidence where
  lawful/appropriate.

- Why this recommendation is being surfaced now.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>UI wording<br />
</strong>Avoid generic "Verified" or "Well Kept Approved" unless the
product can define exactly what was verified, when, and with what
limitations. Recommendation evidence should travel with the
recommendation.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 14. AI and automation authority

The library already has an unusually strong single-consent rule: every
AI output is a suggestion and each suggestion requires individual HOM
confirmation; no select-all or batch approval. Preserve that rule until
controlled evidence supports a narrower exception. Generalize it with an
Authority Engine so the same logic governs HOMs, clients and future
automation.

| **Class**                      | **System may**                                                        | **Examples**                                                                                                                                                    |
|--------------------------------|-----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| A0 Observe                     | Detect and record a possible signal only.                             | Possible upcoming maintenance; anomaly; pattern candidate.                                                                                                      |
| A1 Prepare                     | Research, summarize, draft or organize.                               | Vendor shortlist, email draft, decision card, visit briefing.                                                                                                   |
| A2 Reversible low-risk execute | Execute only where policy explicitly authorizes and rollback is easy. | Internal classification, reminder creation, non-sensitive state housekeeping.                                                                                   |
| A3 Human authorization         | Prepare fully, but authorized human confirms action.                  | Meaningful purchase, new provider, material schedule change.                                                                                                    |
| A4 Elevated authorization      | Require designated higher authority and stronger context.             | Access changes, sensitive disclosure, major financial or trust consequence.                                                                                     |
| A5 Never autonomous            | System may support, never decide/execute alone.                       | Home-entry authorization, contracts, employment decisions, medical/legal/financial advice, severe incident communication, destructive critical-record deletion. |

## 14.1 AI safety requirements

- Every AI-created fact is marked as suggestion/inference until
  individually confirmed under current policy.

- Inference carries provenance, confidence, source, timestamp and
  expiry/revisit rule where appropriate.

- External content is untrusted. The model cannot elevate permissions,
  modify system policy, reveal other household data, or execute
  arbitrary tool instructions from content.

- No third-party model training on household data unless a future
  explicit policy and contract authorizes it.

- Human reviewers see the source/evidence needed to evaluate a
  recommendation, not only the model answer.

- Log model/version/prompt-policy identifier and action outcome without
  logging sensitive raw household content unnecessarily.

- AI-generated accessibility descriptions and summaries must remain
  grounded in authoritative source data.

# 15. Developer observability, release safety and continuous learning

## 15.1 Error Envelope

Every material application failure should produce a developer-ready
issue with enough context to reproduce the problem without opening
unrestricted household data.

| **Field**              | **Required behavior**                                                           |
|------------------------|---------------------------------------------------------------------------------|
| Error / correlation ID | Stable reference shown in telemetry and optionally to support user.             |
| Release + commit       | Exact version and suspect change correlation.                                   |
| Feature flags          | Flag states active for the failed request.                                      |
| Role / surface         | Client, HOM, corporate, worker; page/workflow.                                  |
| Household reference    | Pseudonymous/internal ID, not name/address.                                     |
| Action attempted       | Business action name from centralized action wrapper.                           |
| Breadcrumbs            | Recent safe state transitions/actions, scrubbed of sensitive content.           |
| Trace                  | Frontend -\> server action -\> DB -\> worker -\> external provider as relevant. |
| Impact                 | First/last seen, occurrences, users/households affected, workflow criticality.  |
| Owner / severity       | Named component owner and page/ticket/log class.                                |
| Workaround / rollback  | Known safe fallback if one exists.                                              |
| Privacy status         | Confirmation that payload was scrubbed; no S2/S3 raw content.                   |

## 15.2 Observability architecture

- Adopt OpenTelemetry-compatible correlation semantics for traces,
  metrics and logs even if Sentry/Axiom remain the primary tools.

- Attach one correlation ID across a user action, server action,
  database transaction, outbox event, worker job, notification and
  third-party request where practical.

- Monitor business outcomes as well as HTTP errors. A 200 response that
  fails to move a decision or close a visit is a product defect.

- Create synthetic critical journeys in staging/production-safe form:
  login, Needs You approval, HOM visit close, permission revocation,
  client S1 update/review, delivery flow, LIFE-EVENT suppression,
  offline sync and vault reveal.

- Group duplicate failures into issues. Alert based on user impact and
  consequence, not raw log volume.

- Separate PAGE, TICKET and LOG. Do not train developers to ignore an
  alert stream.

- Every significant production defect gets a regression test. Every
  repeated manual diagnostic should become better telemetry or a
  runbook.

## 15.3 Safe release pattern

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>CODE -&gt; STATIC/SECURITY/A11Y CHECKS -&gt; AUTOMATED TESTS -&gt;
STAGING -&gt; SYNTHETIC FLOWS<br />
-&gt; FEATURE FLAG / SMALL COHORT -&gt; RELEASE HEALTH -&gt; EXPAND |
HOLD | ROLLBACK | KILL<br />
-&gt; POST-RELEASE REVIEW -&gt; REGRESSION TEST / RUNBOOK / ADR / DOC
UPDATE</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

- No consequential feature should require a new app-store deployment to
  disable it. Provide a kill switch or server-side gate where feasible.

- Treat percentage rollout changes as production changes with actor,
  time and reason recorded.

- Database migrations receive stricter review than UI changes. Favor
  additive, dual-read/write, validate, switch, then retire patterns when
  practical.

- Routine dependency updates, security updates and breaking upgrades
  have different maintenance paths. Do not auto-merge untested
  dependency changes.

- Produce a release health view showing deployment status, critical
  journey pass/fail, error regression, performance, support anomalies
  and rollback availability.

## 15.4 Learning loop

| OBSERVE -\> DETECT DEVIATION -\> INTERPRET -\> CLASSIFY -\> DECIDE -\> CODIFY -\> TEST -\> PRESERVE |
|-----------------------------------------------------------------------------------------------------|

The same loop should govern household exceptions, vendor failures,
software incidents, AI misses, accessibility defects and strategic
experiments. A postmortem should focus first on system design and
detection, not personal blame. Near misses belong in the same learning
system because they reveal controls before harm occurs.

# 16. Data, events and integration conventions

**Standing prohibition (adopted 24 Aug 2026, REQ-084):** no property-data enrichment of any kind: no parcel, deed, assessor, MLS, consumer property-data, or people-search integrations, imports, or scrapes, for any feature including capital-plan prefill. Record data originates only from the household, the HOM's observation, and member-provided documents.

## 16.1 Work state semantics

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>DETECTED -&gt; OWNED -&gt; RESEARCHING -&gt; WAITING_EXTERNAL -&gt;
DECISION_PREPARED<br />
-&gt; APPROVED / DECLINED -&gt; SCHEDULED -&gt; IN_PROGRESS -&gt;
VERIFYING -&gt; RECORD_UPDATED -&gt; CLOSED<br />
<br />
Transitions emit events. A work item always has an owner or an explicit
unowned exception.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 16.2 Example outbox event

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>{<br />
"event_type": "work_item.state_changed",<br />
"event_version": 1,<br />
"event_id": "uuid",<br />
"correlation_id": "uuid",<br />
"household_id": "hh_pseudonymous",<br />
"object_id": "work_uuid",<br />
"actor_id": "user_uuid",<br />
"actor_role": "house_manager",<br />
"from_state": "waiting_external",<br />
"to_state": "decision_prepared",<br />
"occurred_at": "UTC timestamp",<br />
"sensitivity": "S1",<br />
"payload": {"decision_id": "decision_uuid"}<br />
}</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 16.3 Integration adapter rule

- External providers are adapters behind Well Kept interfaces. Business
  rules should not be embedded in Resend, Expo, Jobber or future
  SMS/payment provider-specific code.

- Every external call has idempotency/retry semantics appropriate to the
  consequence. Avoid duplicate appointments, messages, approvals or
  payments when a network retry occurs.

- Record provider delivery/result identifiers for support without using
  provider systems as the authoritative household state.

- Every critical provider has a degraded-mode or business-continuity
  decision documented. The app should know when Well Kept is healthy but
  a dependency is degraded.

- Third-party procurement includes security, privacy, accessibility,
  retention, export/delete, incident-notification and data-use review
  before integration.

# 17. Implementation sequence

This sequence deliberately separates what must be verified or hardened
now from capabilities that should be architected for later. It avoids
building advanced anticipation before the operating model has produced
enough real evidence.

| **Sequence**                         | **Primary work**                                                                                                                                                                                      | **Gate / restraint**                                                  |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| 0\. Authority + repo truth           | Repo/staging audit, stack delta, requirements housekeeping, operating-platform decision, source-of-truth map, current dependency/version baseline.                                                    | No feature expansion based on stale assumptions.                      |
| 1\. Custody + security + reliability | WK-SEC-001 audit/remediation, centralized action wrapper, auth hardening plan, backup restore, deliverability webhooks, privacy-safe telemetry, synthetic critical flows, incident/rollback runbooks. | No real household data until current security gate clears.            |
| 2\. Shared substrate                 | Transactional outbox; coordinated field-attribute RFC; domain primitive semantics; event/version conventions.                                                                                         | No separate polling/event path per new feature.                       |
| 3\. Staff-first operating surface    | Verify/complete HOM Cockpit, Work State Model, Attention System, Decision routing, Corporate Control Tower, credential/provenance surfaces.                                                           | Let actual staff use generate evidence before client sophistication.  |
| 4\. Calm client surface              | Nothing Needs You, Needs You, Today, Handling, prepared decisions, progressive disclosure, adaptive delivery, WCAG 2.2 AA baseline.                                                                   | Do not expose internal operational complexity.                        |
| 5\. Anticipation + AI                | Dependency graph, prepopulation confidence, collision detection, Household Watch, inference cascade, knowledge half-life, recommendation assistance, individual confirmation.                         | Automate only after manual workflow and failure modes are understood. |
| 6\. Scale capabilities               | Advanced geography/capacity optimization, cross-household batching of time/route only, richer privacy center, SLO/error budgets from real data, developer portal if team complexity warrants.         | Do not build because a future platform scenario is imaginable.        |

## 17.1 First ten implementation sessions

> **1.** Repo and environment bootstrap; run all tests; capture current
> commit, services and deployment path.
>
> **2.** Architecture reconciliation report against WK-DEV-003/004/005
> and current ADRs; list mismatches only, do not silently fix.
>
> **3.** Housekeeping: append REQ-078..082, update adopted-document
> index, remove stale withdrawn-requirement references, normalize
> terminology.
>
> **4.** Produce 2027 Operating Platform Decision and system-of-record
> map; founder approval before system integration work.
>
> **5.** Observability/privacy audit: Sentry/Axiom data fields, release
> mapping, scrubbers, alert ownership, replay settings, correlation IDs.
>
> **6.** Deliverability and notification transport audit: Resend
> delivery/bounce/complaint webhooks, Expo push behavior, quiet-hour
> enforcement, retry/idempotency.
>
> **7.** Permission/action review: central defineAction wrapper,
> generated permission contract tests, client S2/S3 payload test,
> session revocation.
>
> **8.** Security audit preparation and synthetic fixture validation
> against WK-SEC-001; close known debt that would make the audit fail by
> design.
>
> **9.** Restore and degraded-mode drill: database restore, worker
> restart, lost-device/session-revoke, provider outage path, rollback
> procedure.
>
> **10.** Post-audit substrate RFC: outbox + coordinated field
> attributes + event schema + migration plan, then execute only after
> the gate clears.

# 18. Definition of Done and pull-request gate

A material feature is not done when it renders. It is done when
behavior, permissions, accessibility, observability, failure recovery
and documentation are all known.

| **\#** | **Release gate**                                                                                                                    |
|--------|-------------------------------------------------------------------------------------------------------------------------------------|
| 1      | Requirement/standard/ADR source linked; no conflict with current authority.                                                         |
| 2      | Business owner and informed decision owner identified.                                                                              |
| 3      | Data classification and household scope declared.                                                                                   |
| 4      | Permission action defined centrally; deny case tested.                                                                              |
| 5      | Client payload tested for S2/S3 exclusion where applicable.                                                                         |
| 6      | Provenance/audit behavior defined for material writes/read-reveals.                                                                 |
| 7      | Work/attention/decision state transition and resolution condition defined.                                                          |
| 8      | Idempotency/retry behavior defined for side effects.                                                                                |
| 9      | Offline behavior defined for HOM-critical flow.                                                                                     |
| 10     | Accessibility contract satisfied: keyboard, focus, semantics, contrast, labels/errors, reflow/zoom, reduced motion, dynamic status. |
| 11     | Privacy-safe telemetry added; no sensitive raw household content in logs/errors/replay.                                             |
| 12     | Critical failure alert is actionable and has owner; non-actionable telemetry does not page.                                         |
| 13     | Unit/integration/E2E/synthetic coverage appropriate to risk.                                                                        |
| 14     | Regression test added when feature fixes a production defect.                                                                       |
| 15     | Feature flag/rollback/kill path exists for consequential change where feasible.                                                     |
| 16     | Database migration includes forward/backward/restore consideration.                                                                 |
| 17     | Third-party failure and degraded-mode path defined.                                                                                 |
| 18     | Client-facing change passes Invisibility Rule: reduces effort, decision burden, awareness burden or stays invisible.                |
| 19     | Documentation, runbook and ADR updated. Stale docs are superseded, not silently rewritten.                                          |
| 20     | Founder walkthrough required for portal-affecting milestone per current handbook acceptance rule.                                   |

# 19. Test matrix and launch-readiness gates

| **Risk area**          | **Minimum recurring test**                                                                      | **Release consequence**                                 |
|------------------------|-------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| Tenant isolation       | Cross-household read/write attempts across every role and key query path.                       | Release blocking.                                       |
| Permissions            | Generated contract matrix + 100% branch coverage in permissions package.                        | Release blocking.                                       |
| Client payload         | Automated assertion that client-session responses never include S2/S3 keys.                     | Release blocking.                                       |
| Offline HOM            | Full visit close in airplane mode, ordered sync, conflict row on collision.                     | Release blocking forever.                               |
| LIFE-EVENT suppression | Set tag and verify every proposal surface suppresses within expected request cycle.             | Release blocking.                                       |
| Critical decisions     | Approve/decline/ask routes update all surfaces exactly once.                                    | Release blocking.                                       |
| Notification delivery  | Push/email path, quiet hours, acknowledgment, delivery failure, retry and escalation.           | Block affected channel/flow.                            |
| Email deliverability   | Provider delivery/bounce/complaint webhook and known-good mailbox end-to-end.                   | Do not use email as sole required channel until stable. |
| Accessibility          | Automated scan + keyboard + representative screen-reader flows + zoom/reflow.                   | Critical blocking defects block affected release.       |
| Photos/vault           | Presigned scope, expiry, no cross-tenant fetch, destruction behavior, access log.               | Release blocking.                                       |
| Session/offboarding    | Remote revoke, lost device, role removal, backup HOM expiration.                                | Release blocking.                                       |
| AI containment         | Prompt injection, cross-household data exfiltration, unauthorized tool/action attempts.         | Release blocking for AI feature.                        |
| Backup/restore         | Periodic restore drill with documented result.                                                  | Trust/reliability remediation if failed.                |
| Release regression     | Before/after release error rate and critical journey health by cohort.                          | Hold/rollback rollout.                                  |
| Fixture parity         | Canonical synthetic households import and render correctly in client/HOM/corporate projections. | Release blocking for schema/import changes.             |

# 20. Developer custody and handoff package

The next developer should be able to leave Well Kept in a state where
another qualified developer can operate the platform without
reconstructing knowledge from memory. This is the software equivalent of
Well Kept household continuity.

## Required custody artifacts

- Architecture map: monorepo packages, web/mobile surfaces, worker,
  database, object store, auth, notification providers, observability.

- Environment and account matrix: GitHub, Vercel, Neon/Postgres, Redis,
  S3/KMS, Resend, Expo/EAS, Sentry, Axiom, DNS/domain, Apple/Google
  developer accounts, SMS/voice when adopted. Record
  owner/backup/recovery path, never secrets.

- CI/CD diagram and exact deployment/rollback commands.

- Database schema map, migration discipline and last verified restore.

- Queue/worker runbook, dead-letter/retry behavior and job ownership.

- Security threat model and audit findings/remediation status.

- Permission contract matrix and sensitive-data classification.

- Observability map: dashboards, alerts, owners, paging thresholds and
  telemetry redaction.

- Test matrix and synthetic fixtures; how to run local, CI, E2E, mobile
  and accessibility tests.

- Third-party integration inventory: purpose, data exchanged, retention,
  accessibility/security evidence, failure mode and contact.

- ADR index and supersession chain. Never edit an old ADR to erase
  history.

- Known issues/technical debt register with risk, owner, trigger and
  next review. Do not maintain an unranked endless backlog.

- Release calendar/versioning/deprecation policy and active feature
  flags.

- Incident/on-call tree and client/trust escalation interface.

- "How to replace me" validation: another authorized developer performs
  a deploy, rollback and restore using only documented procedures.

# 21. Risk and decision register

| **ID** | **Risk**                        | **Level** | **Failure mode**                                                                     | **Control**                                                                                       |
|--------|---------------------------------|-----------|--------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| R1     | Platform ambiguity              | Critical  | Builds could target stale Jobber/manual or proprietary assumptions.                  | Resolve 2027 Operating Platform Decision before integration expansion.                            |
| R2     | Tenant isolation / broad access | Critical  | One cross-household leak undermines the core trust proposition.                      | Security audit gate, centralized permission action, query-scope tests, least privilege.           |
| R3     | Feature sprawl                  | High      | The August design surface exceeds what a small team should implement at once.        | Shared substrates first; NOW/NOT NOW roadmap; do not build advanced intelligence before evidence. |
| R4     | Notification fragmentation      | High      | Features could independently send push/email/SMS and create noise or missed action.  | One Attention Record + orchestration service.                                                     |
| R5     | Observability privacy           | Critical  | Debugging tools can become an uncontrolled household-data copy.                      | Scrub at source; pseudonymous IDs; replay disabled/masked on sensitive flows; audited access.     |
| R6     | Email false-delivery            | High      | Provider can report delivered without user receipt.                                  | Webhooks, end-to-end test, fallback/escalation, never equate delivery with acknowledgment.        |
| R7     | Accessibility debt              | High      | Late remediation creates product and legal risk and blocks users/HOMs.               | WCAG 2.2 AA proposal, accessible component library, automated + manual tests, vendor gate.        |
| R8     | AI overreach                    | Critical  | Automation could make consequential household decisions or leak data.                | Authority Engine, single-confirmation rule, prompt-injection testing, hard prohibited actions.    |
| R9     | Schema fragmentation            | High      | Anticipation/verification/features could add overlapping columns/events.             | One schema RFC and transactional outbox before feature expansion.                                 |
| R10    | Founder/developer bus factor    | High      | Knowledge or account custody concentrated in one person.                             | Second-person custody drill and documented runbooks/access ownership.                             |
| R11    | Stale docs driving code         | High      | Archived/old terms, stack, security timing or deletion assumptions re-enter product. | Authority tier + reconciliation reports + ADR discipline.                                         |
| R12    | Release blast radius            | High      | A bad change affects every household before detection.                               | Feature flags, progressive rollout, synthetic critical journeys, rollback/kill switch.            |

# 22. Candidate requirement deltas

The following are implementation recommendations from the combined
sweep. They are deliberately labeled CAND, not REQ, so they do not
bypass the controlled requirement register. Promote them only through
the existing governance process.

| **Candidate**   | **Priority**           | **Recommended delta**                                                                                                                  |
|-----------------|------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| CAND-PLAT-01    | P0 candidate           | 2027 Operating Platform Decision and per-workflow system-of-record map required before production integration expansion.               |
| CAND-A11Y-01    | P0 candidate           | WCAG 2.2 AA engineering baseline for critical client, HOM and corporate workflows; accessibility contract in shared component library. |
| CAND-AUTH-01    | P0/P1 candidate        | Phishing-resistant MFA for privileged staff/admin using FIDO2/WebAuthn/passkey/security key, with recovery and offboarding.            |
| CAND-ATTN-01    | P0/P1 candidate        | Canonical Attention Record and Notification Orchestration Service. Features cannot send direct user notifications outside it.          |
| CAND-WORK-01    | P0/P1 candidate        | Common WorkItem state model with owner, dependencies, waiting/resurface semantics, completion evidence and audit events.               |
| CAND-DEC-01     | P1 candidate           | Reusable DecisionRecord + prepared-decision UI linked to Decision Rights and returned-choice review.                                   |
| CAND-AUTHZ-01   | P1 candidate           | General Authority Engine governing client/HOM/AI action rights by rule, consequence and reversibility.                                 |
| CAND-OUTBOX-01  | P0 substrate candidate | Transactional outbox/event stream for durable field/work/decision changes, drained idempotently.                                       |
| CAND-OBS-01     | P0 candidate           | Correlation IDs, privacy-safe Error Envelope, release mapping, issue grouping and business-outcome monitoring.                         |
| CAND-REL-01     | P0 candidate           | Feature flags, progressive rollouts, kill switches and rollback for consequential changes.                                             |
| CAND-SYN-01     | P0 candidate           | Synthetic critical journeys for permissions, decision, close-flow, offline, notification and consent flows.                            |
| CAND-PRIV-01    | P0 candidate           | Telemetry redaction policy and automated tests prohibiting S2/S3/raw household content in logs/errors/replay.                          |
| CAND-VND-01     | P1 candidate           | Trust Credential Ledger separated from Recommendation Provenance.                                                                      |
| CAND-DELIV-01   | P0/P1 candidate        | Delivery-state webhooks for email/push/SMS adapters and explicit DELIVERED/ACKNOWLEDGED/RESOLVED semantics.                            |
| CAND-3P-01      | P1 candidate           | Third-party security/privacy/accessibility gate with data-flow and degraded-mode review before integration.                            |
| CAND-INC-01     | P0 candidate           | Unified Incident/Exception object with containment, ownership, recovery, postmortem and corrective-action closure.                     |
| CAND-RESTORE-01 | P0 candidate           | Periodic restore drill and documented result. Backup success alone is insufficient.                                                    |
| CAND-AI-01      | P0 for AI features     | AI prompt-injection/data-exfiltration test suite, source provenance, no policy/permission changes from model content.                  |
| CAND-CHANGE-01  | P1 candidate           | Universal What Changed projection for HOM/corporate/client where appropriate, based on material state deltas.                          |
| CAND-DEV-01     | Later                  | Developer Control Tower/portal only when engineering team/system count makes discovery and ownership a real problem.                   |

# 23. Source map and benchmark lessons

## 23.1 Primary confidential-library sources used in this handoff

| **Source**                                                  | **Implementation use**                                                                                              |
|-------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| 00_CURRENT_AUTHORITY.txt                                    | Current financial/terminology authority, stale-item warnings and controlled boundaries.                             |
| 00_START_HERE_Library_Index.txt                             | Current vs archive handling and model/document authority.                                                           |
| WK-DEV-001 Requirements                                     | P0/P1/P2 feature and nonfunctional requirements.                                                                    |
| WK-DEV-003 Stack                                            | Corrected actual/planned stack and dependency/version discipline.                                                   |
| WK-DEV-004 Conventions                                      | Monorepo, permissions centralization, provenance, branch/migration/ADR rules.                                       |
| WK-DEV-005 Developer Handbook                               | Vocabulary, privacy, offline behavior, acceptance tests, build order and known unknowns.                            |
| WK-SEC-001 Application Security Audit Scope                 | No real household data before clearance; audit threat model and pass criteria.                                      |
| WK Software Architecture Review 2026-08-02                  | Verified strengths, missing outbox/field-attribute substrates, deliverability and schema risks.                     |
| INSTRUCTION_UPDATES_2026-08-05_v2                           | Adopted REQ-078..082, Decision Rights, stage enum and pipeline target.                                              |
| WK-STD-042 The Invisibility Rule                            | Client effort reduction as product criterion.                                                                       |
| WK-STD-028 Response Architecture                            | Company-owned channel routing, response timing and emergency architecture.                                          |
| WK-SOP-019 Technology Photo Data Security                   | Least privilege, company channels, photo/data controls, fast incident reporting, AI individual confirmation.        |
| WK-APP-001..008                                             | Briefing, close flow, triggers, collision detection, knowledge half-life, anticipation and batching design.         |
| WK Four Stage Application Spec                              | Anticipate -\> identify -\> decision-routing -\> execute -\> monitor; Decision Rights and decision inbox.           |
| WK Verification Discipline and Performance                  | Materiality, hard stops, separation of duty, verification debt and just culture.                                    |
| WK Pre-Populated Intake / Inference Cascade / Task Stacking | Confidence/provenance, guarded inference, and batching time/route without batching household data/property.         |
| Current SOP/PLAY/TRN/SVC files                              | Operational truth for intake, record, boundaries, vendor coordination, incident response, Runways and HOM training. |

## 23.2 External benchmark patterns incorporated

| **Benchmark**                                                                                             | **Lesson adopted**                                                                                                                                                                                                                 |
|-----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Airbnb                                                                                                    | Layered physical-world trust: prevent, detect, respond, remediate.                                                                                                                                                                 |
| 1Password / Apple                                                                                         | Minimize data and structural blast radius; secure defaults.                                                                                                                                                                        |
| Cloudflare                                                                                                | Design for human error; phishing-resistant auth; rapid blame-free reporting.                                                                                                                                                       |
| Stripe                                                                                                    | Idempotency, safe automation, granular permissions, backward-compatible change.                                                                                                                                                    |
| Toyota                                                                                                    | Andon/jidoka: stop abnormalities; automate only after understanding the manual work.                                                                                                                                               |
| Capital One Eno                                                                                           | Proactive anomaly/renewal detection without requiring the user to monitor.                                                                                                                                                         |
| Delta / Flighty / Domino's / FedEx                                                                        | Current-state visibility, live events and disruption recovery.                                                                                                                                                                     |
| Wellthy / Honor / DispatchHealth                                                                          | Human-led technology, frontline cockpit and central control tower.                                                                                                                                                                 |
| Superhuman                                                                                                | Hide waiting work until response or follow-up time.                                                                                                                                                                                |
| Tiimo / Crouton / Things / Focus Friend                                                                   | Calm hierarchy, progressive disclosure and less required app use.                                                                                                                                                                  |
| GitHub Primer / Adobe Spectrum / Microsoft Fluent / GOV.UK                                                | Accessibility encoded in components and forms.                                                                                                                                                                                     |
| Storybook / axe / Deque                                                                                   | Continuous automated accessibility checks plus manual testing.                                                                                                                                                                     |
| Sentry / Datadog / OpenTelemetry                                                                          | Error grouping, traces, impact and user-journey observability.                                                                                                                                                                     |
| LaunchDarkly / Shopify                                                                                    | Feature flags, progressive rollout and explicit blast-radius control.                                                                                                                                                              |
| Google SRE                                                                                                | SLO thinking, actionable alerting, error budgets after evidence and blameless postmortems.                                                                                                                                         |
| Spotify Backstage                                                                                         | Long-term developer portal, ownership and golden paths.                                                                                                                                                                            |
| Negative cases: Ring, 23andMe, Knight, Sonos, Zillow, Robinhood, Care.com, HomeAdvisor, Zenefits, Homejoy | Avoid broad access, interconnected blast radius, unbounded automation, risky redesign migration, overconfident prediction, engagement incentives, vague verification, soft compliance gates and workforce/software-model mismatch. |


# 24. Business reconciliation deltas (added 24 August 2026 · adopted under two-key authority, A566)

The eight deltas below reconcile this handoff to the business it serves. Three are promoted directly to controlled requirements (REQ-083..085 in WK-DEV-001) under the 24 August two-key sign-off; the rest carry owners and dates so they cannot rot as unowned candidates.

## 24.1 Cost gate (ADOPTED · REQ-085)
The named stack (Vercel, Neon, Redis, S3/KMS, Resend, Expo/EAS, Sentry, Axiom, SMS when adopted) carries a real monthly run-rate. Track stack run-rate and build spend against the modeled software budget line; any commitment above the modeled line is a two-key model change BEFORE it is incurred, like every other base-case change. The developer's Gate 0 deliverables now include a current run-rate statement.

## 24.2 Minimum viable launch, bound to the service calendar (ADOPTED doctrine)
The implementation sequence is hereby pinned to the operating calendar. Launch scope, and nothing more, must be production-ready in this order: the Household Record and ingest of the paper intake (needed for Household Zero conversion and first members, March 2027); intake with ACH mandate capture (first paid Resets, March 2027); the weekly digest (first full-service month); arrival/departure event capture feeding payroll AND the covenant metrics (first covenant reporting month). Everything else in sections 5-10 is architected-not-built until the operating gates produce the evidence R3 already demands. February 2027 training uses the same surfaces the founding HOMs will run, so training readiness is the true deadline for the HOM-facing slice.

## 24.3 Covenant metrics as first-class events (ADOPTED · REQ-083)
Monthly HOM utilization per household and churn-with-cause are lender reporting commitments (register A561; SBA support workbook Exhibit 9). They are not spreadsheet afterthoughts: the same arrival taps that build payroll produce utilization, and every household departure carries a structured cause code. The monthly covenant report generates from these events.

## 24.4 Property-data enrichment prohibition (ADOPTED · REQ-084; also inserted in section 16 conventions)
No integration, import, scrape, or API enrichment from parcel records, deeds, assessor data, MLS or consumer property-data services, or people-search sources, for any feature, expressly including capital-plan prefill. Record data originates only from the household itself, the HOM's own observation, and member-provided documents. This is the privacy-screen prohibition expressed as an engineering control; the temptation it forecloses is exactly the shortcut a capable developer would otherwise take on the capital plan.

## 24.5 Demo-to-commitment ledger (owner: founder + developer at Gate 0; date: with the platform decision)
Every surface shown in the overview deck maps to a build status and a launch commitment: the weekly digest (launch-committed, 24.2); arrival-tap payroll and covenant events (launch-committed); capital plan (post-launch; manual-first by the Desk from member-provided documents; no enrichment per 24.4); desk triage timers and recall matching (verify current worker/job status at Gate 0; until verified, the Desk runs these manually against the published SLAs and the system logs the SLA clock); school-calendar and mailing-cutoff updates (configuration-driven, manual refresh acceptable at launch); vendor COI tracking (P1). Anything demonstrated but not launch-committed gets either a dated ticket or a sales-guidance note before external use of the deck resumes at V4.

## 24.6 Billing scope (owner: founder + CFO; blocked on the open dues-unit decision)
Payments enter the product as: ACH mandate capture at intake through the chosen processor; NACHA 2026 originator fraud-monitoring confirmed as a processor capability at selection; dues presented in the unit the two-key decision adopts (monthly vs weekly remains OPEN as of 24 August and blocks the billing surface copy, not the mandate plumbing); agreement language per the counsel instruction (membership consideration, never services rendered). No card acceptance without re-costing per the model's processing sensitivity.

## 24.7 Candidate forcing function (ADOPTED practice)
Every CAND in section 22 now requires an owner, a decision forum (founder vs two-key), a target date, and the named register it promotes into, recorded at the next requirements housekeeping pass (Gate 0). A candidate without an owner and date after Gate 0 is closed, not carried.

## 24.8 Custody is ownership, not only knowledge (ADOPTED rule)
The GitHub organization, hosting, database, object store, and every billing account are owned by Well Kept Home Operations Management LLC, never by a contractor account; the developer holds membership, not ownership. IP assignment executes through the contractor memorandum already in the counsel queue before any commit beyond Gate 0. A second qualified developer performs a custody audit against section 20's artifact list at least once before real household data enters the system, and the offboarding path in the account matrix is tested, not assumed.

# Appendix A. Developer checklists

## A1. Repository reconciliation checklist

- Current default branch and production commit recorded.

- Local bootstrap documented and reproducible.

- All tests run with result recorded.

- Current Node/pnpm/package versions verified.

- Current Next/React/Expo/Drizzle/Postgres/Redis versions verified.

- All migrations enumerated and applied state known.

- Worker/scheduled jobs enumerated.

- Feature flags enumerated and stale flags identified.

- Integrations and data flows inventoried.

- Observability SDKs, retention and scrubbing verified.

- No real household data found in staging/synthetic-only environments
  before security clearance.

- Current repo docs reconciled against DEV-003/004/005 and authority
  page.

- Unknowns reported without guessing.

## A2. Security release checklist

- Tenant scope is explicit in query and action.

- Least-privilege permission check executed server-side.

- Sensitive fields never included in unauthorized response payload.

- Sensitive reveal is logged and expires.

- Consent checked server-side before gated action.

- No secret in source, logs or client bundle.

- Input validation and output encoding appropriate.

- External content treated as untrusted.

- Rate/abuse controls considered.

- Idempotency/replay behavior considered.

- Audit event emitted for material action.

- Session revocation tested if relevant.

- Rollback/kill path defined.

- Security test added for material trust boundary.

## A3. Accessibility review checklist

- Keyboard completes the workflow.

- Focus is visible and never lost/obscured.

- Modal opens/closes with logical focus movement and restoration.

- Native semantic controls used where possible.

- All controls have accessible names and states.

- Labels persist; placeholder is not the only label.

- Errors are specific, associated with fields and summarized when
  needed.

- Status does not depend on color alone.

- Text/UI contrast meets approved standard.

- Zoom/reflow retains content and action.

- Reduced motion respected.

- Meaningful image/chart has equivalent text/data.

- Screen reader announces meaningful dynamic state without excessive
  chatter.

- Critical third-party UI passes the same test.

## A4. Incident/postmortem template

- What happened and when?

- Which households/users/workflows were affected?

- How was it detected?

- Why was it not detected sooner?

- What limited the blast radius?

- What increased the blast radius?

- What did we do to contain it?

- What did we do for the affected household/user?

- Root cause and contributing conditions?

- What assumption was wrong?

- What code/test/runbook/policy/training changes result?

- Which regression test was added?

- Who owns each corrective action and when is closure reviewed?

- Does this change a current requirement, ADR or risk acceptance?

## A5. Third-party integration gate

- Purpose and business owner documented.

- Exact data sent/received documented.

- S1/S2/S3 exposure assessed.

- Retention/deletion/export behavior known.

- Training/advertising/secondary data use known and acceptable.

- Authentication and least privilege reviewed.

- Incident notification commitment reviewed.

- Accessibility evidence requested and critical flow tested.

- Availability and degraded-mode behavior documented.

- Webhook/retry/idempotency behavior tested.

- Vendor exit/replacement path documented.

- Contract/legal review routed when risk warrants.

# Appendix B. Example domain/event shapes

## B1. AttentionRecord example

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>AttentionRecord<br />
- id<br />
- household_id<br />
- source_object_type / source_object_id<br />
- audience_role / recipient_id<br />
- category: awareness | decision | verification | safety | delivery |
system<br />
- state: created | routed | delivered | seen | acknowledged | resolved |
escalated<br />
- urgency / materiality / consequence_class<br />
- action_required boolean<br />
- owner_id<br />
- deadline_at / resurface_at<br />
- sensitivity<br />
- quiet_hours_override_reason (nullable)<br />
- delivery_policy_id<br />
- acknowledged_at/by<br />
- resolved_at/by<br />
- correlation_id<br />
- provenance / created_at</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## B2. DecisionRecord example

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>DecisionRecord<br />
- id / household_id / work_item_id<br />
- decision_category<br />
- recommendation<br />
- alternatives[]<br />
- evidence_refs[] / recommendation_provenance[]<br />
- confidence + explanation<br />
- authority_rule_snapshot<br />
- household_display_mode<br />
- deadline / consequence_of_waiting<br />
- state: preparing | surfaced | acknowledged | approved | declined |
superseded | expired<br />
- decider_id / decided_at<br />
- execution_event_id<br />
- audit/provenance</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## B3. Trust Credential example

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>TrustCredential<br />
- subject_type / subject_id<br />
- credential_type<br />
- issuer/source<br />
- jurisdiction/scope<br />
- status<br />
- verified_at / expires_at / next_review_at<br />
- limitations<br />
- evidence_ref<br />
- reviewer_id<br />
- event/audit refs</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## B4. Release Health object example

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>ReleaseHealth<br />
- release_id / commit<br />
- rollout cohort / feature flags<br />
- deployed_at / actor<br />
- critical journey results<br />
- error regression vs baseline<br />
- performance regression vs baseline<br />
- accessibility/security checks<br />
- support anomaly count<br />
- rollback_available<br />
- decision: expand | hold | rollback | kill<br />
- decision_owner / reason</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Final implementation principle

Well Kept should become a hierarchy of cognitive offloading systems. The
household offloads operational responsibility to the HOM. The HOM
offloads memory, monitoring and administrative complexity to software
and the Desk. Operations offloads anomaly detection and prioritization
to the Control Tower. Developers offload detection and repeatable
maintenance to observability, tests and release controls. Leadership
receives changes, exceptions and decisions instead of the entire
activity stream.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Developer test for every feature<br />
</strong>Does this feature reduce necessary human cognition, improve
trust, or make a required judgment safer and more reliable? If it merely
relocates complexity into another screen, queue or notification stream,
redesign it before adding it.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>
