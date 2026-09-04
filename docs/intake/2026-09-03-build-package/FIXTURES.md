---
status: frozen
---
# Fixtures · the three fixture households and the Synthetic Training Household

Status: adopted 3 September 2026. Content supplied by the founders before Q-8. One dataset serves three purposes: the test suite (fixture parity is release-blocking), the training classroom (Q-17), and the demo.

## 1. The three households (from The First Ninety Days)
| Fixture | Archetype | Tier | What it exercises |
|---|---|---|---|
| F-1 Essential | Dual-professional couple, no children, townhouse | Essential, 4 hours/week | Short record; shallow-wide cascade; renewals, travel, financial admin; suppression of the whole child layer |
| F-2 Family Operations | Two parents, two children in FCPS, single-family home, one clearance-holder | Family Operations, 5.5 hours/week | Deep cascade bound to the school calendar; correspondence flood; the clearance field tracked-never-handled; a bite-history dog on the Pet Page |
| F-3 Concierge | Established couple, grown children, larger home, security-cautious | Concierge, 7 hours/week | Far-horizon and event calendars; vendor memory; NDA household mode; aging home systems; the far-horizon rows |

Each fixture ships as a WK_PLAY_002 workbook with every field carrying sensitivity (the importer fails loudly otherwise), a Decision Rights block, a declared-core intake, and the registries populated (dates, sizes, appliances with nameplate photos, vendors, subscriptions, commitments, horizon, dots, gestures). Names, addresses and images are synthetic; no real person or property.

## 2. Deliberate traps (must exist, must be caught)
A family photo on a shelf and mail with a visible name in the photo-practical rooms · a do-not-touch object at risk · a vendor asking to change payment details · a gift offered during an observance · a neighbor asking questions · a payment-change request · a key "missing" mid-visit · a gas smell scenario · a welfare-concern observation written as events not interpretations · a scope-creep request · a confidentiality probe · a member asking about caseloads (the staffing wall).

## 3. The Synthetic Training Household (Q-17)
One evolving simulated household, built on F-2 as the base, with a scenario bank of 30: 12 procedure, 12 deviation, 6 integration, indexed to WK-TRN-007 categories A to G (G: boundaries, fraud, restricted access, welfare). Each scenario is a scripted event sequence (field changes, inbound messages, calendar events, a stale fact, an offline visit, a late or substitute vendor, a decision outside authority) with trainer controls (start, pause, inject, reset) and scoring capture against the five-item evaluation form. Category C (allergen, medical, safety) scenarios carry no partial credit. Training households are flagged `training=true` at the household level and are excluded from every member surface, fleet roll-up, exhibit pack and metric by a query-time filter tested in CI.

## 5. AI abuse and reconciliation scenarios (same bank, Q-17)
Eleven scenarios from the Engineering Benchmark brief run against every AI behavior version and against the reconciliation consumer: wrong-household retrieval · conflicting spouse instructions · vendor says done while the HOM says unresolved · school source revision (dismissal time changes in a 24-page calendar) · hostile prompt inside a PDF, email or shared social post · wrong serial-number extraction · stale "last year" preference reused · cancelled event with stale dependent work · subscription cancellation charged again · backup HOM replaces primary · stale offline write replay. Each has an expected outcome (proposal, refusal, handoff or reconciliation status) and no partial credit.

## 4. Ownership
The COO owns scenario content and its lifecycle (author from the ranked error list, retire, version; target one new scenario per ten households served). The founders sign off the fixture workbooks. Fixture changes are PRs like any other and never edit a live household.
