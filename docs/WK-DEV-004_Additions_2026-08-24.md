---
status: living
---
# WK-DEV-004 Conventions: the 24 August 2026 additions

The full WK-DEV-004 Conventions document is founder-held and is NOT adopted
into this repo as-is: its descriptive sections are the July 2026
specification and have not been verified line-by-line against the system as
built. Much of its layout IS real here (apps/hm-mobile on Expo,
packages/permissions, packages/schema, services/worker, tooling/seed and
tooling/import all exist), but verified deltas also exist: tRPC and
WatermelonDB appear nowhere in this repo (server actions and an
IndexedDB-backed offline queue instead), packages/ui and packages/config do
not exist, and the triggers package is named trigger-engine. Adopting the
document verbatim ahead of the Phase 0 delta report would freeze a mix of
true and false claims in a controlled document; the delta report is the
vehicle that reconciles it, and the full document enters after that report
with its deltas annotated.

The transfer set's handling note asked for the 24 August additions to be
folded into "the repo copy"; no repo copy existed, so this document is that
fold. The three additions below are adopted conventions (two-key, register
A566), carried verbatim, and are not descriptions, so they cannot drift:

- Prohibited integration class (REQ-084): parcel/deed/assessor/MLS/consumer-property-data/people-search sources are banned for all features including capital-plan prefill. Add a CI dependency check for this class; any PR introducing one fails review automatically.
- Covenant events (REQ-083): `visit_arrival`, `visit_departure`, and `household_departure` are canonical audit-grade events; `household_departure` requires a `cause_code` from the controlled cause list. The monthly covenant report is a pure function of these events.
- Account ownership: GitHub org, hosting, database, object store, and billing accounts belong to the LLC; contractors hold membership, never ownership. Offboarding path is tested, not assumed.
