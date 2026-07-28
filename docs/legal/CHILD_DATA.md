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
