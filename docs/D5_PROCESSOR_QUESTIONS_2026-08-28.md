---
status: living
---
# Criterion 2, put to both processors in writing

28 August 2026. Two paragraphs, drafted for the founder to send. **The
shortlist stands as delivered with criterion 2 marked NOT ESTABLISHED for
both options; these answers decide it, not the shortlist.**

## Why this is asked in writing rather than read off a page

Nacha's fraud-monitoring rule reached Phase 2 on 19 June 2026 (practically 22
June, the next banking day), and Phase 2 **removed the volume threshold**:
every non-consumer Originator must have risk-based processes reasonably
intended to identify entries initiated due to fraud, regardless of volume.
Well Kept is a non-consumer Originator. The obligation is live now, at eight
households as much as at eight hundred.

A processor being compliant **in its own capacity** as an Originator, ODFI or
Third-Party Sender is a different fact from that processor **discharging Well
Kept's obligation**. Both readings are consistent with every marketing page
either vendor publishes, which is exactly why the distinction has to be put as
a question rather than inferred from documentation. What is being asked for is
not reassurance; it is a statement Well Kept can hold up.

**Send both. The answers are comparable only if the question is identical**,
so the two paragraphs below differ only in the vendor name and the one
product-specific sentence.

## To Stripe

> We are a small Virginia household-services company preparing to collect
> recurring membership dues by ACH debit through Stripe, with no card
> acceptance. We will be a non-consumer Originator, and Nacha's fraud
> monitoring rule reached Phase 2 on 19 June 2026, which removed the volume
> threshold, so the requirement applies to us from day one at our size. I need
> a clear answer to one question before we select a processor: **does Stripe's
> service satisfy our obligation as Originator to maintain risk-based
> processes and procedures reasonably intended to identify ACH entries
> initiated due to fraud, and will Stripe state that in our agreement or in a
> written statement we can retain?** If the answer is that Stripe provides
> some of the monitoring and we remain responsible for the rest, I need that
> boundary described specifically, because we will be building our controls
> around wherever it falls. Related and secondary: we understand ACH Direct
> Debit mandate terms are displayed and accepted before a debit is initiated,
> and that with Stripe-hosted mandates you respond to the customer's bank with
> a copy of the debit authorization; please confirm that holds for a recurring
> membership-dues mandate captured at signup. Finally, our dues are membership
> consideration rather than payment for goods, and we want to confirm we are
> not within the scope of the March 2026 requirement to label e-commerce
> purchases with PURCHASE in the Company Entry Description.

## To GoCardless

> We are a small Virginia household-services company preparing to collect
> recurring membership dues by ACH debit through GoCardless, with no card
> acceptance. We will be a non-consumer Originator, and Nacha's fraud
> monitoring rule reached Phase 2 on 19 June 2026, which removed the volume
> threshold, so the requirement applies to us from day one at our size. I need
> a clear answer to one question before we select a processor: **does
> GoCardless's service satisfy our obligation as Originator to maintain
> risk-based processes and procedures reasonably intended to identify ACH
> entries initiated due to fraud, and will GoCardless state that in our
> agreement or in a written statement we can retain?** If the answer is that
> GoCardless provides some of the monitoring and we remain responsible for the
> rest, I need that boundary described specifically, because we will be
> building our controls around wherever it falls. Related and secondary: we
> understand Verified Mandates validates that a bank account exists and accepts
> ACH debits at the point of setup, which addresses the WEB debit account
> validation requirement; please confirm whether Verified Mandates also forms
> part of your answer on Phase 2 fraud monitoring, or whether those are two
> separate things at your end. Finally, our dues are membership consideration
> rather than payment for goods, and we want to confirm we are not within the
> scope of the March 2026 requirement to label e-commerce purchases with
> PURCHASE in the Company Entry Description.

## Added 28 August 2026 by R24: the return-code question

Row 6's dunning sequence branches on ACH return codes, and the founder's R24
ruling reclassified that branching from a failing interim control into **a
requirement on the processor integration**. Criterion 3 already covers whether
returns and failures arrive as webhooks. It does not cover **which codes a
vendor exposes and how it classifies them**, and the Day 0 branch depends on
exactly that.

Append this to both messages, unchanged between them:

> One further question, which is about the shape of the data rather than the
> service. Our dunning sequence needs to branch on the reason a debit failed:
> insufficient funds retries once after three banking days, while a closed or
> invalid account skips retry entirely. **Do your return and failure webhooks
> carry the underlying ACH return code (R01, R02, R03 and so on), or a
> normalized status of your own?** If normalized, we need the mapping, because
> two of our branches are the same to a status field and opposite to a return
> code.

**Why it is one question and not a criterion.** The shortlist stands as
delivered with its four criteria; adding a fifth after the fact would restate
the comparison and restart the clock. This is a question whose answer shapes
the integration, not one that decides the selection.

**A note on the branch that is void.** The SOP's sequence moves an account to
CARD after a second insufficient-funds return. R19 and D5 prohibit that, so it
is not being asked about and must not be implemented if a vendor offers it.

## Reading the answers

Three shapes, and only one of them settles criterion 2.

1. **"Yes, and here it is in writing."** Criterion 2 met. Retain the statement
   with the agreement; it is evidence, and a lender or an auditor asking about
   ACH controls is asking for exactly this.
2. **"We provide X, you remain responsible for Y."** Criterion 2 partially
   met, and the useful answer, because Y is then a known build item rather
   than a discovered one. **Compare the two vendors on where the line falls**,
   not on whether they drew one.
3. **A link to a compliance page, or a support reply that does not distinguish
   their obligation from ours.** Criterion 2 **not** met. Ask again, once,
   naming the distinction. A vendor that will not put the boundary in writing
   before signature will not be clearer about it afterwards.

**A third-shape answer from both is a real outcome and not a dead end.** It
would mean the monitoring is Well Kept's to build, which is a scoped
engineering item at this size, and the selection then turns on the other three
criteria plus the card-door question. It should be known before signature
either way.

**Not the developer's to answer**, and flagged so it does not get folded into
a technical comparison: whether the PURCHASE labelling question needs counsel
rather than a vendor. The counsel instruction already characterizes dues as
membership consideration, never services rendered, and both readings point the
same way. Getting it wrong shows up as return codes, which is a slow and
expensive way to find out.
