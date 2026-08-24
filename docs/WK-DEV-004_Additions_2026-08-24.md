---
status: living
---
# WK-DEV-004 Conventions: the 24 August 2026 additions

The full WK-DEV-004 Conventions document is founder-held and is NOT adopted
into this repo as-is: its descriptive sections (monorepo layout, tRPC, an
Expo mobile app, WatermelonDB, a permissions package) describe the July 2026
specification, not the system as built, and adopting them verbatim would
plant false claims about this codebase in a controlled document. The Phase 0
delta report (WK-DEV-006 Phase 0) is the vehicle that reconciles them; the
full document enters after that report, with its deltas annotated.

The transfer set's handling note asked for the 24 August additions to be
folded into "the repo copy"; no repo copy existed, so this document is that
fold. The three additions below are adopted conventions (two-key, register
A566), carried verbatim, and are not descriptions, so they cannot drift:

- Prohibited integration class (REQ-084): parcel/deed/assessor/MLS/consumer-property-data/people-search sources are banned for all features including capital-plan prefill. Add a CI dependency check for this class; any PR introducing one fails review automatically.
- Covenant events (REQ-083): `visit_arrival`, `visit_departure`, and `household_departure` are canonical audit-grade events; `household_departure` requires a `cause_code` from the controlled cause list. The monthly covenant report is a pure function of these events.
- Account ownership: GitHub org, hosting, database, object store, and billing accounts belong to the LLC; contractors hold membership, never ownership. Offboarding path is tested, not assumed.
