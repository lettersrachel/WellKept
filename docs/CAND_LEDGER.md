---
status: living
---
# CAND ledger: handoff section 22 candidates with dispositions

The Gate 0 instrument for handoff 24.7. First drafted 24 August with
owner/forum/date blank; **closed the same day by the founder's Phase 0
inputs document** (`FOUNDER_INPUTS_PHASE0_CLOSE_2026-08-24.md` section 3,
register draft A571): sixteen candidates assigned, one closed by its own
condition, none left blank, so nothing closed by default under 24.7.
**Reopened for the nine recovered concepts by the v5 intake (section 4,
25 August 2026):** one merged by the intake's own ruling, eight entered
blank below awaiting the founder's assignment; under 24.7 those blanks
close rather than carry if no inputs document lands.

## The fourth attribute, added 28 August 2026

24.7 requires **four** attributes on every surviving candidate: an owner, a
decision forum, a target date, **and the named register it promotes into**.
The first three have been filled since 24 and 25 August. The fourth was never
a column, and its absence was not visible while three of four looked complete
(reported in `GATE0_AND_PHASE_STATUS_2026-08-28.md` section 2.1).

The column exists below. **Every row reads UNRESOLVED**, because no row's own
text names a destination and a guessed register is a wrong pointer, which is
the cost G-93 records. Filling it is a founder pass: a promotion target is a
destination she chooses, not one that can be derived from adjacency.

**The destinations that actually exist**, listed so the pass is a choice among
known options rather than a taxonomy invention:

| Register | What lands there | Id form |
|---|---|---|
| `WK-DEV-001_Requirements.md` | a candidate that becomes a build obligation | REQ-### |
| ADR series | a candidate that becomes an architectural decision | ADR-### |
| The assumption register (founder-side) | a candidate that becomes an adopted decision or ruling | A### |
| `GAP_REGISTER.md` | a candidate that turns out to be a defect rather than a feature | G-## |
| Closed, no promotion | a candidate that is decided against, or subsumed | n/a |

The last row is a real answer and should not be treated as a blank. Three of
the five closed candidates at the top of this file took exactly that path.

## Closed

| CAND | Closed by |
|---|---|
| CAND-PLAT-01 | D1 (platform of record confirmed; the map is `SYSTEM_OF_RECORD_MAP.md`, delivered) |
| CAND-A11Y-01 | D2 (promoted; REQ-074 at WCAG 2.2 AA) |
| CAND-AUTH-01 | D3 (passkey MFA target adopted; joins the brief-08 security checklist per A566 rather than duplicating it) |
| CAND-DEV-01 | Its own condition: the trigger (team scale) is unmet; reopen by register entry when it is |
| SituationEvent | Merged, not closed on merit: the v5 intake (section 4) rules it one concept with the Situation/Event Bundle already authorized in WK-DEV-009; the SITUATIONS bundling session is stubbed by name in the firewall policy module and carries the concept forward |

## Recovered concepts (v5 intake section 4, 25 August 2026)

The audit's nine recovered concepts enter here under the 24.7 forcing
function: owner, forum, and date assigned at this housekeeping pass or
they close (blanks close, not carry; any close reopens by register
entry). SituationEvent is already dispositioned by the intake itself
(merged, above; the SITUATIONS bundle shipped 25 Aug as migration
0056). The eight blanks were the founder's columns, and she filled
them: ASSIGNED 25 August 2026 per register A581 (the founder response
sheet section 6, confirmed in the proceed instructions), transcribed
verbatim below. The repo context column stays adjacency only.

| Concept | Owner | Forum | Date / gate | Promotes into | Repo context (adjacency, not disposition) |
|---|---|---|---|---|---|
| CaseHierarchy | Dev | Founder | With the vendor-repair slice: its verified-closure rule (a parent case closes only on verified overall outcome) is already adopted design law, so the object lands when the slice needs case structure | UNRESOLVED | work_item (0041) and the SITUATIONS bundle (0056) are the nearest existing structures |
| ZoneState | Dev | Founder | With the Purpose Pack build after the slice proves reuse; its reason-privacy shape (project do_not_disturb without the private reason) is already adopted | UNRESOLVED | the close flow's zoneDrift capture is a partial instance |
| FunctionalStateTarget | Dev | Founder | With the standards-library work, after the 300-row floor review lands: targets attach to reviewed standards, not unreviewed seeds | UNRESOLVED | condition_flag and the registry's condition series are adjacent |
| OrganizationPreferenceProfile | Dev | Founder | Substrate window, low priority; consolidates preferences already scattered as rules | UNRESOLVED | household_task_profile notes (0050) and preference_rule (0057) carry the scattered pieces today |
| WorkCognitiveLoadProfile | Dev | Founder | With the workload layer's WL Gate 3; carries Ruling 1's never-ranking bar in its schema comment, planning input only | UNRESOLVED | CARRIES RULING 1'S BAR EXPLICITLY per the intake: planning input, never ranking, never per-HOM comparison; its own disposition already states this |
| RelationshipMomentRecord | Founder | Founder | HOLD for founder definition: encodes service philosophy and is not shaped by engineering default; founder writes the two-paragraph definition before any schema, target with the anticipation engine's first promotions | UNRESOLVED | the Member Circle register (G-56, REQ-077) gates any non-client person record |
| VendorProviderProfile | Dev | Founder | With the vendor-repair slice, where provider history first accumulates | UNRESOLVED | VND-01 above and the WK-DEV-010 vendor slice are the authorized adjacent work |
| AIHumanHandoff | Dev | Two-key | Gated with the Tier M entry: the handoff object is meaningless until inference exists, and it lands in the same PR as AI-01 | UNRESOLVED | AI-01 above and the Tier M gate are the authorized adjacent machinery |

## Assigned (founder inputs section 3, 24 August 2026)

| CAND | Owner | Forum | Date / gate | Promotes into | Repo context |
|---|---|---|---|---|---|
| OUTBOX-01 | Dev | Founder | Immediate; substrate workstream week one | UNRESOLVED | field_event_outbox is the seed |
| REL-01 | Dev | Founder | Week one | UNRESOLVED | the shadow engine's kill switches require it anyway |
| PRIV-01 | Dev | Founder | BEFORE HO real data enters | UNRESOLVED | telemetry redaction tests are a Phase 1 line |
| RESTORE-01 | Dev | Founder | First drill in the HO sprint Day 1-2; quarterly thereafter | UNRESOLVED | overlaps the Phase 1 acceptance line and G-02 |
| SYN-01 | Dev | Founder | With the sprint; journeys grow with each surface | UNRESOLVED | airplane e2e is the existing member of the class |
| OBS-01 | Dev | Founder | Phase 1 tail; correlation IDs before the dashboards build | UNRESOLVED | Sentry present; envelopes absent |
| DELIV-01 | Dev | Founder | Before the first real digest to HO | UNRESOLVED | staging Resend ruling is its test bed; the AO delivered-never-arrived case motivates it |
| INC-01 | Dev | Founder | Phase 1/2 boundary | UNRESOLVED | the corporate board's exception queue consumes it |
| WORK-01 | Dev | Founder | Nine-primitives substrate window (WK-DEV-007 section 4) | UNRESOLVED | deferral/paused_decision/condition_flag share the vocabulary it generalizes |
| DEC-01 | Dev | Founder | Substrate window; internal UI with the Cockpit, client UI deferred | UNRESOLVED | Prepared Decision component, handoff 8.3 |
| AUTHZ-01 | Dev | Founder | Substrate window; authorized as the engine's authority machinery (WK-DEV-007 section 3) | UNRESOLVED | packages/permissions is per-action today |
| ATTN-01 | Dev | Founder | With the dashboards/notification workstream; no feature sends outside it thereafter | UNRESOLVED | |
| CHANGE-01 | Dev | Founder | HOM/corporate projection with the dashboards; client projection deferred | UNRESOLVED | briefing deltas are partial instances |
| VND-01 | Dev | Founder | P1; with the vendor primitive, post-launch window | UNRESOLVED | |
| 3P-01 | Founder + Dev | Founder | Adopted now as PROCESS, zero build | UNRESOLVED | every proposed integration passes the security/privacy/accessibility/degraded-mode review before its register entry |
| AI-01 | Dev | Two-key | Gated to the first model-inference dependency, itself register-visible (WK-DEV-007 section 3); the test suite lands in the same PR as that dependency | UNRESOLVED | no AI feature exists yet |

## Housekeeping pass, 25 August 2026 (WK-DEV-011 item 7)

Status recorded against the assigned sixteen, facts only; assignments
unchanged:

- **OUTBOX-01 LANDED** (0046): `event_outbox` carries the WK-DEV-010
  section 4 envelope, `emitOutboxEvent` is the one write path, all
  emitting sites swept.
- **WORK-01 LANDED** (0041) and **DEC-01 LANDED** (0043): the work and
  decision primitives are built to the section 4 definition of done.
- **ATTN-01 PARTIAL** (0048): the notification firewall's destination
  vocabulary and conservative v1 policy exist; the full
  dashboards/notification workstream remains gated as assigned.
- **SYN-01 GROWING** as assigned: twenty-one e2e journeys at this pass,
  every shipped surface adding its own.
- **AUTHZ-01 PARTIAL**: the engine's A0 cap is enforced in code
  (WK-DEV-007 section 3); the generalized authority machinery remains
  substrate-window work.
- The remaining assigned rows (REL-01, PRIV-01, RESTORE-01, OBS-01,
  DELIV-01, INC-01, CHANGE-01, VND-01, 3P-01, AI-01) stand at their
  assigned gates, none tripped early, none stale.
- The nine recovered concepts entered above; SituationEvent merged by
  the intake's own ruling; the eight blanks await the founder's inputs
  document under 24.7 (blanks close, not carry).
