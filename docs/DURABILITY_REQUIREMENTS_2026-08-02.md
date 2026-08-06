---
status: frozen
---

# Durability requirements, 2 August 2026

What the schema must get right NOW because it is nearly free today and ruinously
expensive to retrofit into a decade of live data. The test for inclusion here:
data shape only, never features. Nothing in this file builds anything for 2036;
it prevents 2026 from foreclosing it. Most items ride the Temporal Layer
migration window (Ruling 4) so they cost one migration, not seven.

## 1. The territory seam
Every core row (household, house_manager, route, time_entry, trigger_rule where
scoped) carries territory_id, foreign-keyed to a territory table holding: name,
IANA timezone, and a legal_regime tag. Exactly one row exists until Maryland.
The multi-metro company is not being built; the column that makes it possible is.

## 2. Time that survives timezones
Timestamps in UTC with the household's territory timezone resolving display and
fire-at (fire-at is already household-local by doctrine; make the timezone
explicit, not implied Eastern). Temporal Layer fields that are dates (birthdays,
anniversaries, install dates) are DATE, never timestamp. A birthday has no
timezone.

## 3. Money history that can never be lost
membership_event carries the weekly rate at every event: price_cents already
exists per G-60 and the requirement is making it REQUIRED on start and
tier_change, which also answers G-60's first open question in the affirmative.
household.tier becomes derived from the event stream or is reconciled against it
on write (the drift query decides which). The rate card lives as versioned data
with effective dates, standards-store pattern, never as constants in code. Every
future repricing is then an event, and MRR and cohort revenue are derivable
forever. Nine years of cohort curves is what a diligence process pays for.

## 4. Lifecycle events append-only, with reasons
Membership start, tier change, pause, resume, and end are append-only events;
end carries a coded reason (the WK-QA-019 cancellation codes, as an enum that
can grow). Nothing destructively updates lifecycle history. Churn analysis in
2036 is only as good as reason codes captured in 2028.

## 5. Referral lineage at creation
household gains acquisition_source (enum) and referring_household_id (nullable
FK) set at creation and immutable. The referral graph cannot be reconstructed
later, and it is both the growth engine's instrument panel and the expansion
gates' evidence (Montgomery gate three counts pull; this column is how).

## 6. People as subjects, not just households
The erasure tool is household-shaped; people are not households. The
tokenisation ADR (Ruling 2) establishes the pattern for recipients; the
requirement is that the pattern generalises: any natural person the system
knows (member, household member, recipient, HM) resolves through an identity
mapping, so that subject-level privacy obligations arriving in any future year
(statute, aging-in-place services, a buyer's counsel) are a policy change, not
a re-plumbing.

## 7. Export as a first-class capability
Two shapes, both derivable from day one: the single-household export (exists at
membership end with a certificate; keep it complete as schema grows, enforced by
a test that fails when a new table touching household data is not in the export
manifest) and the territory package: standards store, trigger library, playbook
templates and rate card exportable and importable as a versioned bundle. That
bundle IS the transplant kit for metro two and the dataroom for anything later.

## 8. Identifiers and the data dictionary
Surrogate keys never reused, never business-meaningful. A data dictionary is
generated from the schema on every migration and filed to the library, so the
system can always answer what it holds, which is a diligence artifact, a counsel
artifact, and the WK-QA-019 automation seed.

## The don't list, equally binding
No multi-region infrastructure, no microservices, no franchise tooling, no
aging-care module, no internationalisation, no premature scale work of any
kind. One Postgres serves 1,200 households indefinitely. Anything on this list
proposed before the evidence gates that justify it is refused with a pointer to
this file.
