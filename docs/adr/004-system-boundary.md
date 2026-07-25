# ADR-004: System boundary - what Well Kept deliberately does not do

Date: 2026-07-25 | Status: Proposed (needs founder acceptance) | Decider: Rachel Letters (founder)

## Context

A functional-gap review of the 2026-07-25 pilot handoff package found seven
business functions that appear nowhere in the handoff files - not marked
incomplete, simply absent. Three of them are absent on purpose: the product
decisions were effectively made (payment stays out of the app; scheduling
lives in Jobber; app hours are service records), but none of them were
written down, so nothing names the system that actually performs them. This
ADR writes the boundary down. The other four are genuine gaps, registered in
SPEC_AUDIT ("Functional gaps outside the requirement table") and gated in
LAUNCH.md - they are not boundary decisions and are not covered here.

The App Build Plan's own rule applies (per ADR-001): boundary decisions are
made deliberately, in writing, not defaulted into.

## Decision

Well Kept the application is the household record, oversight, and
field-execution system. Three adjacent functions are deliberately performed
OUTSIDE the application, each with a named system of record:

### 1. Billing and payment collection

- The app never collects, stores, or retries payment. The privacy notice
  already instructs clients not to provide card or bank numbers; that is
  policy, not an accident.
- The economics panel's admin-set monthly rate (integer cents, audited,
  REQ-040) exists for oversight math only - effective $/hr, portfolio
  totals. It is not an invoice and nothing bills from it.
- System of record for invoicing, collection, and dunning:
  ⟨name it - e.g. the Jobber stack's invoicing, an accounting system, or
  bank transfer + spreadsheet; for a weekly membership billed in advance
  this must exist before the first paying household⟩.

### 2. Scheduling and rostering

- Assigning which House Manager goes to which household in which week is
  performed in the Jobber stack (App Build Plan 9.2, referenced in
  ADR-001), not in the app. At target scale (dozens of HMs across ~100+
  households) this is the core operational function; it is out of the app
  by decision, not omission.
- The app records who DID visit (visit payloads, fleet board), never who
  WILL. The only "roster" in the codebase is the `roster_age` trigger
  family (household members' birthdays) - it is unrelated to staff
  rostering.

### 3. Time of record and payroll

- Hours in visit payloads are service records: HM-confirmed, geofence is a
  suggestion only and nothing bills or pays from it (REQ-036). They are
  NOT payroll-grade time records.
- Payroll-grade time - FLSA-accurate hours including compensable travel
  time and the economic model's non-productive allowance - is kept and
  paid from ⟨name the payroll/timekeeping system of record⟩. It may be
  cross-checked against visit payloads, but is never derived from them.

## Guardrails

1. At each seam the app may DISPLAY figures that originate outside (as the
   economics panel displays the admin-entered rate) but never originates
   or executes the outside function.
2. Nothing in the app may be presented to a client, HM, or auditor as an
   invoice, a schedule, or a time card while this ADR stands.
3. Moving any of these three functions inside the app requires a written
   ADR superseding this one - not an incremental feature.

## Consequences

- The stack is honest about what it does: the largest functions it does
  not perform are now named, with named owners, instead of being invisible.
- The bracketed systems of record above are founder decisions; until they
  are filled in, this ADR remains Proposed and the gap register in
  SPEC_AUDIT carries billing and payroll as open items.
