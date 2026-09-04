---
status: frozen
---
# RFC-001 · The schema substrate: outbox, field attributes, invariant guards

Status: adopted 3 September 2026 (build ruling); amended the same day, before Migration B ran, to absorb the Engineering Benchmark brief (docs/BENCHMARK_ADOPTION.md). This is an amendment prior to execution, not a reopen. Two migrations, two sessions (Q-3, Q-4). ADR-recorded with the reopen criteria at the end. This RFC is the single place the six August specs touch the schema; no spec adds a column outside it.

## 1. Why one RFC
The pipeline (M-25), the pre-populated record, the inference cascade, verification, task stacking and the offer surface each consume field-change events and each imply attributes on `playbook_field`. Designed separately that is six overlapping migrations. Designed once it is two.

## 2. Migration A · the outbox
Table `field_event`, written in the same transaction as any `playbook_field` write (and any registry write), drained by the BullMQ worker.

| Column | Type | Note |
|---|---|---|
| id | bigserial | |
| household_id | fk | one household per row, always |
| field_id | fk nullable | null for registry rows |
| registry_table, registry_row_id | text, uuid nullable | |
| event_type | enum: created, changed, confirmed, declined, derived, tombstoned | |
| before_hash, after_hash | text | value hashes only; never S3 plaintext |
| provenance, actor_id, actor_role | as on the field write | copied, not joined |
| occurred_at | timestamptz | UTC |
| consumed_by | text[] | consumer names append on success |
| attempts, last_error | int, text | dead-letter at 8 attempts, backoff 5 s to 5 min, same as the offline queue |

Rules: append-only; retained for the life of the household and archived with it; consumers are idempotent and keyed on `id`; the worker drains in `id` order per household. Existing provenance stamping is unchanged; the outbox row is added inside the same transaction by the one write helper.

## 3. Migration B · the coordinated field-attribute extension
Added to `playbook_field` (and mirrored on registry rows where the spec calls for it):

| Attribute | Values | Decided |
|---|---|---|
| knowing_state | `confirmed` (by the household), `observed` (by the HOM), `expected` (system-inferred; social-horizon rule), `estimated` (lookup or derivation), `unknown` | Extends the provenance enum; `assumed` is deliberately absent. An inference is offered, never recorded as fact. |
| source_kind | `source`, `derived` | Derived fields carry `derivation_expr` (text, a whitelisted expression grammar) and are read-only projections recomputed by the worker on outbox events. Hand-edits are rejected with a typed error. |
| materiality | `safety_access`, `money_legal`, `convenience` | Hard-stop classes may map only to the first two. |
| consequence_class | `editorial`, `behavioral`, `high_consequence` | The same enum the training doctrine uses for change propagation, so one column serves the household record and the HOM development layer. |
| conditional_visibility | jsonb nullable | The pre-populated record's show-when rules; evaluated server-side inside the permission package, never on the client. |
| stage | `anticipate`, `identify`, `decide`, `monitor` | On triggers, prompt-pack items, requirements and queue items (Four-Stage spec). Internal; never displayed to members. |
| validity_class | `stable`, `review_periodic`, `life_stage_bounded`, `seasonal`, `event_specific`, `temporary`, `reuse_requires_review`, `superseded` | Knowledge freshness and intentional forgetting. Runtime: stable holds until contradicted; review_periodic resurfaces at horizon; life_stage_bounded decays with age or context; seasonal activates in context; event_specific expires at closeout; temporary expires at runway transition; reuse_requires_review asks before consequential reuse; superseded keeps history, excluded from current state. |
| ownership_trace | `conceive`, `plan`, `execute` (set; on registry items and commitments) | Which of the three the household has handed to Well Kept (Fair Play taxonomy). The measurable definition of load transferred; feeds M-27. |
| latest_safe_start | date, computed | `event_date - vendor_lead - shipping - setup - dependent_decision - contingency_reserve`. Derived; recomputed on outbox events. |
| dueness | `not_due`, `approaching`, `due`, `overdue`, `condition_triggered`, `unknown` | On appliance, pars and recurring-work items. Computed from manufacturer interval, household use, condition observed at close, season, prior failures, quantity and confidence. Ships only once the close flow captures the condition inputs. |

## 3a. Domain event catalog and reconciliation (consumers, not attributes)
- `domain_event` catalog (Migration A, alongside `field_event`): families `capture.*`, `knowledge.*`, `expectation.*`, `source.*`, `commitment.*`, `changeset.*`, `work.*`, `decision.*`, `vendor.*`, `ai.*`, `delight.*`, each with `correlation_id` and `causation_id`. Published through the same outbox; consumers idempotent.
- `expected_event` (consumer table, Q-12b): pattern, household, window, source of expectation, and `reconciliation_status` in `matched`, `missing_expected`, `unexpected`, `changed`, `conflicting`, `stale`, `cannot_determine`, with `candidate_decision_refs[]`. Reconciliation is a consumer of the outbox and never a field attribute.
- `changeset` (consumer table, Q-12b): source change, dependent recomputes, `safe_automatic_changes[]`, `review_required_changes[]`. Near-term commitments lock unless a real change occurs (stability increases as execution approaches).
- `fallback_plan` (on repetitive operational choices): `preferred`, `approved_substitute`, `established_backup`, `vetted_bench`, `ask`; authority and price/quality bounds evaluated at each step.
- `capture_artifact` (Q-7): states `captured`, `processing`, `proposed`, `confirmed`, `routed`, `failed`, `needs_review`; source identity and authority class; quarantine result. Nothing leaves `proposed` without a human.

## 4. Invariant guards (ship with Migration B)
- CI schema introspection fails the build if any new column name or comment matches the person-characterizing pattern list (adjectives about people, temperament words, demographic inferences) or if any table carries two household foreign keys. The pattern list lives in `packages/schema/judgment_free.ts` and is founder-editable, versioned.
- `defineAction` wrapper (Q-1) is a prerequisite: every new action the six specs add declares its permission at the type level.
- The pattern list also includes ranking constructs over HOMs, stress, emotion and health inferences, and any inference from social content into household truth or authority.
- Derived-field recompute is one idempotent job; a manual recompute endpoint exists for corporate_admin and logs.

## 5. Paper equivalents
Until each consumer ships, the launch runs the paper form the specs already define (if-yes-implies worksheet column, portfolio load sheet, decision-rights block). The outbox makes the later cut-over a consumer switch, not a data migration.

## 6. Reopen criteria (falsifiable)
Reopen this RFC only if: a consumer needs an event the outbox cannot express without a schema change; a fifth knowing-state is required by observed intake behavior in two or more households; or the CI guard produces a false positive rate above one in twenty PRs for a quarter. Anything else is a consumer change, not a substrate change.
