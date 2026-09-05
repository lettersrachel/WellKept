---
status: living
---
# Well Kept privacy notice

> **DRAFT: review with counsel before publishing.** Adapt to the privacy laws
> that apply to you and your clients/staff (your state's law; GDPR/UK GDPR if
> anyone is in the EU/UK). Fill the ⟨brackets⟩.

**Who we are:** ⟨legal entity⟩ ("Well Kept," "we"). Contact: ⟨email / address⟩.
**Last updated:** ⟨date⟩.

## What we collect

| Category | Examples | Why |
|---|---|---|
| Household operating details | routines, preferences, standards, layout, how each standing task is done in your home, and your stated preference rules kept one fact per line with a review date, and the Decision Rights block that records what you want decided on your behalf and what always comes to you | to run your household |
| Secured details | access codes, alarm info, where valuables are kept | to care for the home; **encrypted**, access **logged** |
| Visit records | tasks, hours, notes, photos, and what we noticed but deliberately set aside for later, with the reason and the planned timing | service delivery + accountability |
| Service records | incident and complaint records (including, noted at resolution, whether a service reminder could have prevented one), staff responses to service prompts (including whether a prompt helped and why one was set aside), your "please don't raise this" preferences | accountability + service quality |
| Practical data | important dates, vendors, appliances, subscriptions, and the condition of items we care for, observed over time, including conditions we flag to revisit and research we do toward household decisions, paused with a plan to return to it, and for equipment we care for the serial number as printed, the install date with a note of how precisely we know it, and photographs of a unit linked to that unit so a home with two of something has a record that says which is which | to anticipate needs |
| Service time & costs | time spent serving your household by activity, including the phases of a visit derived automatically from visit events, and costs incurred in serving it (supplies, materials, mileage); a receipt photo, where one is captured, is stored and retained exactly like a visit photo | accurate cost and quality of your service |
| Operational records | follow-up work we track on your household's behalf and the planned instances of your standing tasks with our internal working estimates for planning them and a record of how each actually went, items our system surfaces to our staff for attention and the situations our staff bundle related items into, choices we route internally for a decision, notes a staff member captures in their own words for filing, the pre-visit briefs we show our staff (kept exactly as shown), what our reminder engine would have suggested while we tune it, and delivery records from our email provider telling us whether a message we sent you arrived | to run the service reliably |
| Account & activity | name, email, role, sign-in and access logs | to run and secure accounts |
| Membership record | how you found us, your membership tier and its history (start, pauses, changes, cancellation) | to run your membership |

We ask clients **not** to provide government IDs, payment card/bank numbers, or
health records; the product is not designed to hold them.

## How we use it

To provide and improve the household service, coordinate the team assigned to
you, anticipate what your home needs, and keep an accurate, accountable record.
We do **not** sell personal information.

## Who sees it

Access is role-based and enforced by the software: a client sees a curated view
of their own household; assigned staff see what their role requires; management
has oversight. Every view of a secured item and every change is recorded in an
append-only log. We share outside your service team only with your instruction,
with vendors who run our infrastructure under contract (hosting, database,
email delivery), or where the law requires.

## How we protect it

Encryption of secured items at rest (AES-256-GCM) and of all traffic in transit
(HTTPS). Staff sign-in requires a personal link **and** a second factor
(authenticator app). Access is least-privilege and audited. ⟨Add your breach-
notification commitment.⟩

## How long we keep it

We retain records for the life of your service and, for continuity and
accountability, may keep archived (tombstoned) copies afterward. Some records
we keep by default even when a household asks us to delete its information,
because they are our business and employment records: the append-only access
log, incident and complaint records, records of the time our staff spent
serving your household and the costs of doing so, your membership history,
and the general category of how you found us. When we act on a deletion
request, the free-text notes those retained records carry are removed along
with everything else personal to your household.

**When we delete, it is immediate in the system and not yet immediate in our
backups.** The moment we act on a deletion request, nothing we hold can reach
the information: it is gone from the record, from every screen, and from
anything we could export. For a limited period afterwards our database backups
still contain it, because that is what a backup is. Reaching into one is a
deliberate, controlled and logged act, not something that happens in the course
of ordinary work, and after ⟨STATE THE BACKUP RETENTION WINDOW; it depends on
the database plan and is not a figure this repository holds⟩ the information is
no longer in the backups either. We would rather tell you this than say
"deleted" and mean something narrower than you would.

⟨Counsel: reconcile the tombstone model with any legal right to deletion, and
confirm the wording above. The substance is ruled (founder, 5 September 2026,
on gap register G-128) and the phrasing is yours.⟩

## Your rights

Depending on where you live, you may have rights to access, correct, delete,
or restrict use of your information, and to withdraw consent. To exercise any,
contact ⟨email⟩. The client view already shows a live summary of what we hold.

## Subprocessors

We rely on: ⟨hosting (Vercel)⟩, ⟨database (Neon)⟩, ⟨cache/queue (Upstash)⟩,
⟨background worker (Railway)⟩, ⟨email (Resend)⟩, ⟨error monitoring (Sentry;
configured to exclude personal data)⟩. ⟨Confirm each and link their
terms; a data-processing agreement with each is typically required.⟩

## Changes

We'll post updates here and date them; material changes will be communicated
directly.
