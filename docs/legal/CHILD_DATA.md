---
status: living
---
# Child data in the record: classification and handling

Founder item 3, 2026-07-28. Extends the registry-kind classification
(child-data-kinds.test.ts, W-14) one level up: children appear in more of
the record than registry kinds, and each surface needs a stated treatment
rather than a remembered one. WK-SOP-019 is the governing process rule;
this document is its map onto the schema. Counsel packet §6(d) and §6(g)
carry the open legal questions.

## The classification

**Child data is any record content that names, describes, schedules, or
measures a minor in the household.** It is never client-visible-by-default
(minimum s2), never reaches a client view except content written FOR the
client (visit report prose), and its structured kinds carry database
constraints where expressible.

## Surface-by-surface treatment

| Surface | How children appear | Treatment today | Enforced by |
|---|---|---|---|
| `registry_entry` (structured kinds) | sizes now; school/schedule/roster kinds when Phase 0 builds them | classified set; child kinds cannot be s1 | CHECK constraint + child-data-kinds.test.ts (unclassified kind fails CI) |
| `playbook_field` | names, routines, preferences in field values and notes | per-field sensitivity chosen at capture; child-touching fields are s2 minimum BY POLICY (Client Profiles §3 content lands here) | policy (this doc); payload guards keep s2+ out of client views |
| `dot` | verbatim observations may name a child | dots are structurally internal; never shown to any client | code (no client render path) + payload guards |
| `visit` reports | prose written FOR the client may mention their own children | client sees their own household's report content only | permission filtering |
| `visit_photo` | a photo may capture a child | staff+management only, second factor on view, never in client views; 90-day byte purge | code + purge job |
| `incident_report` | an incident may involve a child | internal; never shown in the app to clients | code + payload guards |
| `condition_flag` (W-5, 2026-07-28) | a flagged condition's subject, location, or concern may mention a child's room or belongings | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guards (condition_flag signature) |
| `deferral` (W-6, 2026-07-28) | what was noticed or the reason may mention a child's room or belongings | client-visible BY DESIGN to the household's own client only; staff attribution never rides the client shape; free-text policy applies | permission filtering + payload guard (unprojected-deferral signature) |
| `paused_decision` (W-7, 2026-07-28) | the decision or the research notes may concern a child's room, schedule, or belongings | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (paused_decision signature) |
| `work_item` (RFC-PRIM-01, 2026-08-25; row added in the 2026-08-25 catch-up, one PR late) | a title or detail may concern a child's room, schedule, or belongings | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (work_item signature) |
| `attention_record` (RFC-PRIM-01, 2026-08-25; row added in the 2026-08-25 catch-up, one PR late) | the reason derives from source records that may mention a child | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (attention_record signature) |
| `situation` (WK-DEV-009 s10, 2026-08-25, same-PR) | the bundle's label is the bundler's own words about grouped noticing and may mention a child's room, schedule, or belongings | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (situation signature) |
| `preference_rule` (WK-DEV-007 s4, 2026-08-25, same-PR) | an operating preference may concern a child's room, schedule, or routine (bedtime handling, snack rules) | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (preference_rule signature) |
| `decision_record` (RFC-PRIM-01, 2026-08-25; row added in the 2026-08-25 catch-up, one PR late) | a question, recommendation, or evidence line may concern a child | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (decision_record signature) |
| `shadow_log` (WK-DEV-007 s3, 2026-08-25; row added in the 2026-08-25 catch-up) | evidence lines derive from condition flags that may mention a child's room or belongings | engine-internal; visible only to founder/CFO/developer roles; free-text policy applies as everywhere | role-gated query + payload guard (shadow_log signature) |
| `capture_artifact` (WK-DEV-009 s8, 2026-08-25) | the HOM's free-text capture may mention a child's room, schedule, or belongings | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (capture_artifact signature) |
| `household_task_profile` (WL Gate 1, 2026-08-25) | how-a-task-is-done notes may mention a child's room, schedule, or belongings | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (household_task_profile signature) |
| `work_requirement` (WL Gate 1, 2026-08-25) | a stated context window may mention a child's schedule or belongings | internal (s2); never shown to any client; free-text policy applies as everywhere | code (no client render path) + payload guard (work_requirement signature) |
| `estimate_snapshot` (WL Gate 1, 2026-08-25) | a basis line may reference a child-related task's circumstances | internal (s2); never shown to any client (D7: no duration ever reaches a client route, guard-enforced); free-text policy applies | code (no client render path) + payload guard (estimate_snapshot signature) + client-duration guard |
| `visit_brief_snapshot` (WK-DEV-009 s2.1, 2026-08-25) | the persisted brief carries whatever the staff projection carried, including child-related fields | internal (s2); never shown to any client; a snapshot is the staff view verbatim, so the projection rules that governed the brief govern the snapshot | code (no client render path) + payload guard (visit_brief_snapshot signature) |
| `visit_command` (census catch-up, 2026-08-25: these fifteen rows added when the legal-census guard computed the surface set; each restates the standing treatment, none decides new policy) | the applied visit's stored payload carries the report prose and close content; the `visit` row above states the content treatment | the visit surface's storage row; report prose is client-facing by design, everything else internal; free text erased with the visit content | permission filtering + the visit row's treatments |
| `client_edit` (census catch-up, 2026-08-25) | a client may type anything into an edit, including child content | client-submitted; reviewed by corporate before merging into the record; free-text policy applies | review flow + payload guards on the merged destination |
| `time_entry` / `cost_entry` (census catch-up, 2026-08-25) | an optional note may mention what the work or purchase concerned | internal (s2); never shown to any client; notes blanked on erasure, rows kept as business records | code (no client render path) |
| `membership_event` (census catch-up, 2026-08-25) | a cancellation reason may mention family circumstances | corporate-only; reasons blanked on erasure, rows kept as commercial history | code (no client render path) |
| `gesture` (census catch-up, 2026-08-25) | a gesture idea or definition may reference a child (a birthday, an age band) | internal library content, corporate-edited; never client-visible pre-delivery | code (no client render path) |
| `trigger_rule` / `prompt_pack_item` (census catch-up, 2026-08-25) | household-scoped rule definitions and templated prompt text may bind child-related fields | internal (s2); household-scoped rules stubbed on erasure; prompt text reaches staff only | code + the staff-facing copy discipline |
| `prompt_outcome` (census catch-up, 2026-08-25) | an optional staff note on a prompt answer | internal (s2); notes blanked on erasure | code (no client render path) |
| `season_observation` (census catch-up, 2026-08-25) | a recall summary derives from household history that may involve a child | internal (s2, DEV-005 applies); blanked on erasure | code (no client render path) |
| `stranger_test` (census catch-up, 2026-08-25) | friction notes are staff prose about covering a visit | internal (s2); blanked on erasure | code (no client render path) |
| `notification` (census catch-up, 2026-08-25) | a title or body may carry household content | ephemeral UX rows; DELETED on erasure | code + deletion treatment |
| `anticipation_exclusion` (census catch-up, 2026-08-25) | a "don't raise this" target may be a person reference, possibly a minor, and the reason is prose | internal (s2, corporate-approved); target and reason blanked on erasure | code (no client render path) |
| `object_observation` (census catch-up, 2026-08-25) | an observation note may mention whose room or belongings an object is | internal (s2); DELETED with the household on erasure | code (no client render path) |
| `event_outbox` (census catch-up, 2026-08-25) | a field.changed payload carries plaintext field values, which inherit the field's own child-content possibilities | transient delivery rows, s2-labeled where values ride; DELETED on erasure | code + the s4 envelope's sensitivity label |
| `task_occurrence` (WL Gate 1, 2026-08-25) | a variance reason may mention a child's room, schedule, or belongings | internal (s2); never shown to any client (D7: the actual duration never reaches a client route, guard-enforced); free-text policy applies | code (no client render path) + payload guard (task_occurrence signature) + client-duration guard |

## The rules this document adds

1. **A new capture surface that can hold child content states its child-data
   treatment before it ships**, in this table, the same way a new data
   category ships with its erasure treatment (G-40 pattern).
2. **Phase 0's kinds join `CHILD_DATA_KINDS`** with their constraints in
   the same migration that creates them; the classification guard makes
   shipping them unclassified impossible.
3. **Free-text surfaces are policy-plus-payload-guard, not constraint**,
   because a database cannot read prose. The compensating control is that
   every free-text surface above is structurally internal (dots, incidents)
   or per-field classified at capture (playbook).

## Open question for the founder

Whether `playbook_field` should gain a structural marker (a
`concerns_minor` flag or a child-data section convention) rather than
policy-only handling. That is a schema change with intake-workflow
consequences; not assumed here.
