---
status: living
---
# D5 payments shortlist

28 August 2026. Delivered under WK-DEV-006 D5, which asks the developer for
a two-option shortlist meeting ALL of four criteria and gives the founder 48
hours to select from it. **The founder's 48-hour clock starts at the merge of
this document.**

Nothing is built. D5 limits integration work before selection to the
abstraction, and no abstraction code ships in this change either; section 5
below describes the shape it would take so the selection is not made against
an unknown.

## 1. The four criteria, restated so the answers can be read against them

1. ACH debit with signed mandate capture at intake.
2. NACHA 2026 originator fraud monitoring provided by the processor.
3. Webhook events for returns and failures.
4. No card requirement.

## 2. A dated fact that changes what criterion 2 means

Nacha's fraud-monitoring rule runs in two phases. **Phase 1 took effect 20
March 2026** and reached ODFIs plus originators and third-party senders whose
2023 volume exceeded six million entries. **Phase 2 took effect 19 June 2026,
practically 22 June, and removes the volume threshold entirely**: every
non-consumer Originator, Third-Party Service Provider and Third-Party Sender
must have risk-based processes reasonably intended to identify entries
initiated due to fraud, regardless of volume.

Well Kept is a non-consumer Originator. **Phase 2 is therefore already in
force as of the date of this document**, not a future compliance date to plan
around, and it applies at eight households as squarely as at eight hundred.

This is why criterion 2 is written as "provided by the processor" rather than
"the processor is compliant". A processor being compliant as an originator or
sender says nothing about whether Well Kept's own obligation is discharged.
**The question to put to each vendor in writing at selection is the same
sentence: does your service satisfy our obligation as Originator under the
Phase 2 fraud-monitoring rule, and will you say so in the contract.** A
marketing page claiming fraud tooling is not that answer.

## 3. Option 1: Stripe, ACH Direct Debit

| Criterion | Reading | Basis |
|---|---|---|
| 1. ACH debit with signed mandate at intake | MET on the documented behaviour. Stripe requires the mandate terms be displayed and accepted before a debit can be initiated; with Stripe-hosted mandates Stripe responds to the customer's bank with a copy of the debit authorization on request | Stripe ACH Direct Debit docs; the mandate-collection support note |
| 2. Phase 2 fraud monitoring provided | **NOT ESTABLISHED. Confirm in writing before selecting.** Stripe ships adjacent controls (account blocking on blockable returns, the March 2026 `PURCHASE` entry-description handling) but adjacent controls are not the same claim | see section 2 |
| 3. Webhooks for returns and failures | MET. `charge.failed` fires on an ACH failure for any reason; the payment-intent and charge event families carry the return | Stripe ACH docs |
| 4. No card requirement | MET. ACH Direct Debit is usable as the only payment method; cards are not a precondition | Stripe ACH docs |

**Why it is on the list:** it is the lowest-integration option at this scale,
the mandate is hosted and evidenced by the processor rather than by us, and
the webhook surface is the one the abstraction in section 5 was drawn against.

**What it costs in posture:** Stripe is a card company that also does ACH. D5
says no card requirement; it does not say no card-capable processor. If the
founder wants the card door closed structurally rather than by our
configuration, that is an argument for option 2 and it is a real one.

## 4. Option 2: GoCardless, ACH bank debit

| Criterion | Reading | Basis |
|---|---|---|
| 1. ACH debit with signed mandate at intake | MET on the documented behaviour. GoCardless is mandate-native: the mandate is the object, and Verified Mandates additionally validates that the account exists and accepts ACH debits at the moment of setup | GoCardless Verified Mandates; ACH scheme guides |
| 2. Phase 2 fraud monitoring provided | **NOT ESTABLISHED. Confirm in writing before selecting.** Verified Mandates is positioned against the WEB-debit account-validation rule, which is a different rule from Phase 2 fraud monitoring. Two rules, one product page | see section 2 |
| 3. Webhooks for returns and failures | MET. Mandate and payment events are the product's event model: payments taken, payments failing, chargebacks | GoCardless monitoring docs |
| 4. No card requirement | MET, and structurally: the platform is bank debit, so there is no card path to configure off | GoCardless product scope |

**Why it is on the list:** recurring bank debit is the whole product rather
than a secondary method, which matches dues collection exactly, and criterion
4 is met by construction rather than by a setting somebody could change.

**What it costs in posture:** a second vendor relationship for a company whose
stack is already nine named services under REQ-085's cost gate, and a smaller
US footprint than Stripe's.

## 5. Considered and not shortlisted, with the reason

- **Dwolla.** ACH-only and credible at this scale, but the authorization and
  its evidence sit with the originator rather than with the processor, which
  weakens criterion 1 in the exact place the intake flow needs it strongest.
- **Modern Treasury.** Bank-direct rails presume Well Kept's own ODFI
  relationship and an operations posture sized for far more than 56
  households. Right answer to a question we are not asking yet.
- **Plaid alone.** Account verification, not a processor. It is a component of
  either option above, not an alternative to them.

## 6. The abstraction, described rather than built

D5 permits integration work before selection only at the abstraction. The
shape that both options fit without either leaking through:

- `createMandate({ householdId, payer, terms })` returns a mandate id and the
  evidence reference; the evidence reference is what the record keeps, never
  the bank details.
- `chargeDues({ mandateId, amountCents, periodRef })` takes integer cents and
  a period reference, never a unit word. **D4 binds here**: the amount and the
  billing period are configuration, and no client-facing copy states the unit
  until the monthly-versus-weekly ruling lands.
- `onReturn(event)` and `onFailure(event)` are the two inbound handlers. Both
  land through `emitOutboxEvent`, because the notification firewall admits no
  second path into the outbox.

Two things deliberately absent from the interface: any card concept, and any
duration or service-hour quantity, since a receipt is a client surface and D7
bars time quantities on client surfaces including receipts.

## 7. Open questions that are not the developer's to answer

- **The Phase 2 written confirmation** from whichever vendor is selected
  (section 2). This is the one that should gate signature, not just selection.
- **Whether the March 2026 `PURCHASE` company-entry-description rule reaches
  membership dues.** The rule targets e-commerce purchases of goods; the
  counsel instruction characterizes dues as membership consideration, never
  services rendered. Those two readings point the same way but the question is
  counsel's, not engineering's, and getting it wrong shows up in return codes.
- **The dues unit** (D4), which blocks the billing surface copy and nothing
  else.
- **Whether card acceptance is foreclosed structurally or by configuration**,
  which is the honest difference between the two options and is a founder
  call about a door, not a technical comparison.

## Sources

Vendor and rule readings above were taken from published documentation on 28
August 2026, listed so a later reader can re-check them rather than trust this
page:

- Nacha, Risk Management Topics, Fraud Monitoring Phase 1 and Phase 2
- Stripe, ACH Direct Debit payments; Collecting ACH Direct Debit mandates;
  the Nacha purchase-rule note
- GoCardless, Verified Mandates; ACH scheme customer protection; Monitoring

**Stated as a limit rather than left implicit:** these are readings of public
documentation, not of a contract or a sales conversation. Every "MET" above is
met on documented behaviour. The two NOT ESTABLISHED rows are not doubts about
the vendors, they are the acknowledgement that the criterion asks about an
obligation nobody has yet asked either vendor to accept in writing.
