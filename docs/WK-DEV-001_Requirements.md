---
status: living
---

# WK-DEV-001: Requirements
Version 1.1 | July 2026, amended in place through 28 August 2026 | Scope contract for the Year 2 build | Priority: P0 = launch-blocking, P1 = fast follow, P2 = later

*The version moved from 1.0 to 1.1 on 28 August 2026 by founder ruling. It had
read 1.0 through seven in-place amendments, so a reader checking the version to
decide whether a copy was current got the same answer from an amended copy and
an unamended one. The library copy needs the same bump under its own
change-control path.*

> **READ THIS BEFORE QUOTING THIS DOCUMENT ELSEWHERE.** This copy carries
> in-place dated amendments made AFTER the version line above, and the version
> line is not bumped when one lands. **A dated snapshot of this document taken
> on any given day is not a statement of current state**, and reporting a
> snapshot's contents as current is a mistake that has already been made once
> (28 August 2026; see `DOCUMENT_AUTHORITY_2026-08-28.md`).
>
> The seven amendments this copy carries, each annotated at its own line:
> REQ-076 withdrawn and REQ-077 added (1 August); section I appended with
> REQ-078..082 (5 August); section J appended with REQ-083..085, REQ-074
> promoted to WCAG 2.2 AA, and REQ-075's parenthetical corrected (24 August);
> REQ-031's hours clause amended from auto-capture to HOM-entered times, with
> REQ-036 annotated as the unchanged target (28 August). Section J's
> canonicity note at the end of this document records which copy won which
> divergence.
>
> **This is a mirror, not the system of record.** The library under WK-SOP-000
> and WK-SOP-029 is the system of record (`LIBRARY_INDEX.md`). Where this copy
> and the library disagree, report the disagreement; do not reconcile it here.
> Content-wise this copy is currently the superset, which is a fact about
> content and not a claim of authority.

## A. Platform, auth & tenancy
- REQ-001 (P0) Multi-tenant single organization: one Well Kept instance holding many households; every record scoped to a household except fleet-level corporate data.
- REQ-002 (P0) Roles: client, house_manager, backup_hm, corporate_ops, corporate_admin (founder), cfo_readonly. One user may hold different roles per household (an HM is backup elsewhere).
- REQ-003 (P0) Auth: email + password with mandatory TOTP MFA for staff roles; magic-link option for clients; session revocation from corporate.
- REQ-004 (P0) Field-level permission enforcement server-side from the S1/S2/S3 x role matrix (WK-APP-003 S2). The client app must never receive S2/S3 payloads for a client session.
- REQ-005 (P0) Full audit log: every read of an S3 field and every write of any field records user, role, timestamp, household, field, old/new value hash.
- REQ-006 (P1) NDA household mode: tightens S3 reveal rules, disables all media reuse flags, restricts backup-HM visibility until familiarization is scheduled.

## B. The Playbook data model
- REQ-010 (P0) Household record: identity, tier (essential/family_ops/concierge), membership terms, founding-rate lock date, status tag (ONBOARDING-90 / STEADY / LIFE-EVENT / WATCH / RENEWAL-WINDOW / CHAMPION).
- REQ-011 (P0) The fixed sections as schema; sections cannot be deleted or reordered; N/A-confirmed is a first-class field state. CORRECTED 1 August 2026: there are 25 section slots, numbered 0 to 24. Section 0 is record-level (field-level decline as a confirmed fact, and the returned Record Preview). Sections 1 to 24 are the Playbook's content sections and the "24-section Playbook" standard in WK-SOP-000 Addendum A3 continues to refer to those. WK-PLAY-003 holds 218 fields across the 25 slots.
- REQ-012 (P0) Field record: value, note, sensitivity (S1/S2/S3), provenance (asked/observed/verified_by_touch/client_written + date + actor), confirmed boolean, flag (none/CRITICAL/CAUTION/DELIGHT), section ref, optional photo refs.
- REQ-013 (P0) S3 vault: credentials stored encrypted (envelope encryption), never rendered in document views, revealed only on a per-field reveal action that is logged; auto-hide after 60s.
- REQ-014 (P0) Registries as structured sub-tables: dates registry, sizes registry, appliance registry (nameplate photo, filter size, cadence), vendor directory, subscriptions inventory, commitments ledger, horizon list, dot log, gesture log.
- REQ-015 (P0) Change log per household: every Playbook edit appears in a human-readable timeline (feeds Section 24).
- REQ-016 (P1) Import: ingest WK_PLAY_002 workbook (xlsx) mapping columns to field records; dry-run report before commit (the pilot-to-app migration, WK-APP-003 S5).
- REQ-017 (P1) Export: render a household's S1 view to branded PDF (the client Playbook artifact) and a full S1+S2 internal PDF for coverage binders.

## C. Client portal
- REQ-020 (P0) Read-mostly S1 Playbook view, branded per WK house style, fast search within own household.
- REQ-021 (P0) Weekly visit report feed (the 3-sentence report + approved photos).
- REQ-022 (P0) Self-service S1 updates limited to an allowlist (travel dates, contact changes, preference notes); every client write enters an HM review queue before merging (flagged, never silent).
- REQ-023 (P1) Quarterly review artifacts and Year in Review / Year Ahead documents surfaced when published.
- REQ-024 (P2) Data stewardship view: what categories are held, last S3 audit date (the trust ceremony, WK-APP-001 S6).

## D. House Manager portal (mobile-first, offline-first)
- REQ-030 (P0) Pre-visit briefing auto-generated per WK-APP-001 S2.1: flags first, deltas since last visit, today's sequence specials, occasion radar (14 days), open dots, planned gesture, proposal window (suppressed under LIFE-EVENT).
- REQ-031 (P0) Enforced close flow per WK-APP-001 S2.2: tasks confirm, HOM-ENTERED START AND END TIMES, photos, changes-noticed (required, "none" allowed), dots quick-capture, life-change signal screen (yes routes to corporate same day), zone drift one-tap + photo, then the 3-sentence report drafts last. Report cannot submit with required steps empty. AMENDED 28 August 2026 (founder ruling, K-OPS-002 re-point trace): was "hours auto-capture", which nothing has ever done; the close flow takes two typed times and always has. **Interim control: the HOM enters start and end herself, and those times are the hours of record for payroll and for the REQ-083 covenant events.** The geofenced arrive/leave suggestion with manual override remains the TARGET state and stays at P1 under REQ-036, unpromoted; this amendment describes what is, and REQ-036 describes what is wanted. Recorded because a P0 that reads as met and is not is worse than an absent one (GAP_REGISTER G-103, G-104).
- REQ-032 (P0) Offline-first: briefing caches on open; all close-flow capture queues locally and syncs on reconnect; last-write-wins with conflict flag to corporate.
- REQ-033 (P0) Stranger mode: amplified first-visit runbook for backup coverage; friction notes route to primary HM and log as a Stranger Test record.
- REQ-034 (P0) S3 reveal in context (alarm code on the alarm step, at the door), logged per REQ-005.
- REQ-035 (P1) Service intelligence quick-log per visit (emotional read, client-effort events, anticipation hit/miss, strain), three taps max, never client-visible.
- REQ-036 (P1) Timer-free hours: geofenced arrive/leave suggestion with manual override (never auto-bill from geofence alone). ANNOTATED 28 August 2026: unchanged and deliberately still P1. This is the target state; REQ-031's amendment of the same date records the interim, which is HOM-entered times. Nothing in the product implements any part of this requirement, and its language must not appear on a surface until it does (G-104).

## E. Corporate portal
- REQ-040 (P0) Household list with status tags, relationship-health panel (rating trend, days-since-delight, thank-you log, open recoveries), compliance panel (unconfirmed count, staleness, Stranger Test date, media release, access log), economics panel (hours vs model, supplies, drive time, non-billable split).
- REQ-041 (P0) Status tag administration; LIFE-EVENT suppresses all proposal prompts app-wide the moment it is set.
- REQ-042 (P0) Corporate gesture queue per WK-APP-001 S7: triggers land here, cultural-fit checklist gate, HM-notified-before-lands step, quiet log.
- REQ-043 (P0) Fleet roll-ups: retention board, horizon calendar across households, dots economy by HM, proposal outcomes, Playbook health league.
- REQ-044 (P0) Exhibit-pack feed: hours, retention, cohort, and funnel tables exportable in the WK_SBA exhibit shapes (CSV/xlsx).
- REQ-045 (P1) Trigger administration: enable/disable library cascades per household, edit local booking-race dates, author new if/thens into the versioned library.
- REQ-046 (P1) Weekly dot triage screen: promote dots to field changes (which fires attached triggers).
- REQ-047 (P2) Recall monitoring job: CPSC feed matched against appliance registry nameplates; matches open corporate alerts.

## F. Trigger engine (WK-APP-002 realized)
- REQ-050 (P0) Triggers bind to fields; a field change emits an event; the engine evaluates attached rules and emits prompts routed by role, respecting proposal protocol text and status-tag suppression.
- REQ-051 (P0) Trigger families: roster/age (birthdate math incl. school-year), calendar/season (incl. movable non-Gregorian dates), data thresholds (zone score, hours trend, days-since-delight, reorder points), signals (close-flow events), relationship state (tag transitions), external feeds (weather, school calendar; P1).
- REQ-052 (P0) Prompt packs: a trigger can schedule a staged series over months (the high-school pack); each item lands in the right briefing on its date.
- REQ-053 (P1) Commitment cascade: commitment type derives a prep template with T-14/T-3 prompts; weekend density metering.
- REQ-054 (P1) Repeat-season memory: completed bundles/engagements auto-create next year's pre-filled window.

## G. Notifications & comms
- REQ-060 (P0) Push (mobile) + email digests; per-role notification preferences; quiet hours per household comms contract.
- REQ-061 (P0) Client report delivery on close-flow submit; corporate alerted on WATCH/LIFE-EVENT homes every visit close.
- REQ-062 (P2) In-app message thread per household (client to HM), batched per the comms contract; no free-chat during LIFE-EVENT proposals freeze exceptions.

## H. Non-functional
- REQ-070 (P0) Security: TLS 1.3, AES-256 at rest, envelope-encrypted S3 vault, per-field ACL checks in the API layer, dependency scanning, secrets in a managed store, annual pen test line item.
- REQ-071 (P0) Privacy: no third-party analytics on client portal; media-release flag gates any photo reuse; NDA mode per REQ-006; data deletion workflow on membership end per retention policy.
- REQ-076 WITHDRAWN 1 August 2026 (counsel ruling: no statute obliges deletion of records about people who are not clients; the "hard delete, not a soft flag" scope asserted a legal necessity that was never verified). Replaced by REQ-077. Original text of 1 August, preserved as the dated record: Deletion on request for records about people who are not clients. WK-STD-026 governs records held about recipients, vendors, neighbours and Member Circle entries: people who never consented and cannot see their record. It requires deletion on request and a 24-month retention ceiling. REQ-071's deletion clause covers a CLIENT household at membership end and does not reach these records. See GAP_REGISTER G-56 for the full resolution.
- REQ-077 (P2) Non-client record lifecycle. ADDED 1 August 2026, replacing withdrawn REQ-076. The member_circle_entry register (scoped by WK-PLAY-003 Addendum A) plus a recipient-shaped erasure path (erase-household.mjs is household-shaped; a recipient is not a household). WK-STD-026's four rules stand as COMPANY POLICY: deletion on request, 24-month retention ceiling, the deletion itself audited with the audit row surviving, and a non-marketable constraint excluding these rows from every export and analytics view by default. Tombstone-pattern mechanics satisfy the policy (counsel confirmed the mechanism is unconstrained); audit identity follows ADR-006 tokenisation. GATE: no non-client record may be created on the platform before this is built; the pilot runs the Member Circle ON PAPER per the founder's stricter-than-required choice (Ruling 5).
- REQ-072 (P0) Availability target 99.5%; RPO 24h (nightly encrypted backups), RTO 8h; status page.
- REQ-073 (P0) Performance: briefing opens < 2s on cached data; search results < 500ms p95 within a household.
- REQ-074 (P1) Accessibility: WCAG 2.2 AA is the engineering baseline for critical client, HOM, and corporate workflows, enforced through the shared component library's accessibility contract. PROMOTED 24 August 2026 per WK-DEV-006 D2 (register A567); was "WCAG 2.1 AA on client portal".
- REQ-075 (P0) Scale envelope: design for 150 households, 60 staff users, 5-year photo retention (~1TB) without re-architecture (comfortably covers the 2031 plan of 56 households with headroom for gated growth beyond; parenthetical corrected 24 August 2026 from a retired-plan reference, per the dev-session rulings).

## I. Response architecture (WK-STD-028, ADOPTED 2 August 2026, ruling A121; appended 5 August 2026)

Adopted as requirements at the numbers proposed; IMPLEMENTATION remains gated
per item. Do not renumber existing requirements.

- REQ-078 (P1) Inbound routing: member-facing phone number, SMS number and shared inbox route to corporate surfaces; no member surface exposes a House Manager's personal contact details; no HM surface exposes member contact details in a form enabling direct off-platform contact. GATE: after AR; prerequisite, SMS/voice provider selected and A2P/10DLC registration completed (registration takes weeks; corporate starts it outside any code session).
- REQ-079 (P1) Auto-acknowledgment: channel-aware and time-aware acknowledgment for inbound messages outside business hours, specific to the message, naming the follow-up time and the emergency line. Doctrine, binding: the 9pm-to-7am rule governs OUTBOUND notifications the company initiates; a reply to an inbound member message is exempt. GATE: with REQ-078.
- REQ-080 (P1) Response-time capture: inbound and first-response timestamps per channel, reported quarterly against the WK-STD-028 commitment table (feeds WK-QA-019 M-23). GATE: with REQ-078.
- REQ-081 (P2) Emergency line: dedicated number to the on-call Ops Lead, call log with member attribution and a non-emergency flag, on-call rotation administration. Conduct governed by WK-STD-022 and the emergency-response procedure, not by the platform. GATE: after AR.
- REQ-082 (P2) After-hours HM contact incident capture (feeds WK-QA-019 M-24, expected zero). GATE: after AR.

## J. Adopted 24 August 2026 (two-key, registers A561/A566/A567; appended per the dev-session rulings of 24 August 2026)

The rulings document calls this the "section I append"; the library copy of
this document letters it I because it lacks the repo's Response-architecture
section above. Lettered J here; the requirement ids, not the section letters,
are the public API. Text below is verbatim from the rulings document.
Canonicity after this merge: the repo copy is canonical for REQ-078..082
(the 5 August append; the dated verbatim check found wording-level divergence
from INSTRUCTION_UPDATES v2 and the rulings resolved it in the repo copy's
favor), the library copy contributed REQ-083..085, and the merged 070..085
set is canonical in both.

- REQ-083 (P0) Covenant metrics as first-class events: visit arrival/departure events produce per-household monthly HOM utilization; every household departure carries a structured cause code; the monthly lender covenant report (utilization per household, churn with cause) generates from these events, not from spreadsheets. Gate: production-ready before the first covenant reporting month. Source: register A561; SBA support workbook Exhibit 9. Scope per Ruling 1 of the 24 August dev-session rulings (capacity measurement, never performance scoring; see the amended boundary in CLAUDE.md).
- REQ-084 (P0, policy control) Property-data enrichment prohibition: no integration, import, scrape, or API enrichment from parcel records, deeds, assessor data, MLS or consumer property-data services, or people-search sources, for any feature, expressly including capital-plan prefill. Record data originates only from the household, the HOM's own observation, and member-provided documents. CI fails any dependency or integration matching this class.
- REQ-085 (P1) Software cost gate: stack run-rate and build spend tracked against the modeled software budget line; any commitment above the modeled line requires a two-key model change before it is incurred. Gate 0 deliverables include a current run-rate statement.
