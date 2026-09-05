---
status: living
---
# Well Kept staff records disclosure

> **FOUNDER-APPROVED 2026-07-28; counsel review required before use.**
> This is the G-13 document (gap register G-41): it must exist and be
> acknowledged before any non-founder staff member logs their first hour.
> Built from the 2026-07-27 staff-data inventory
> (POST_DEPLOY_FINDINGS_E_I.md, session I), which lists every record with
> its audience and retention; approved by the founder as written. Counsel
> may prefer to fold this into the confidentiality acknowledgment (counsel
> packet, section 7), and sets the retention bracket. Fill the ⟨brackets⟩.

> **NOTE FOR COUNSEL, 5 September 2026, and NOT part of the text a staff
> member signs.** The software's staff-attribution surface is wider than the
> numbered items below. Computed from the schema rather than counted by hand,
> and asserted in CI (`staff-disclosure.test.ts`) so this paragraph cannot go
> stale. The system carries 45 staff-attributed tables. Of those,
> 19 are covered by the numbered items in this document, and
> 26 are not yet named here and stand on written engineering reasons in the
> guard's allowlist.
>
> Most of the unnamed ones record the WRITING of something (who entered a work
> item, who recorded an estimate) rather than the doing of it, and several were
> deliberately built to hold no performer at all. That distinction is
> engineering's view and not a legal one, which is why the number is put in
> front of counsel rather than resolved here. The founder's revision collapses
> the allowlist; until then the gap is on the record rather than in it.

**Name:** ⟨staff member⟩   **Role:** ⟨house manager / corporate⟩   **Date:** ⟨date⟩

The confidentiality acknowledgment covers what you owe the business. This
page is the reverse: what the business's software records about you, who can
see it, and what it is and is not used for. We would rather you read this
before your first shift than discover it later.

## What the system records about you

<!-- surface-anchor: action-log -->
1. **An append-only action log.** Every consequential action you take in the
   app is recorded to your name: viewing a secured item, editing household
   information, logging or resolving an incident, recording consent or a
   membership change. This log is permanent, and nothing in it can be edited
   or deleted, by you or by us. It exists so that the service is accountable
   to clients, and it means nothing you do in the system is anonymous.

<!-- surface-anchor: hours-costs -->
2. **Your hours and costs.** Time entries you log (by activity category) and
   costs you record, attributed to you. These are employment and business
   records; they are retained even if a client household's data is deleted.

<!-- surface-anchor: written-work -->
3. **Your written work.** Visit reports you author (clients see their
   content), internal observations you log ("dots" and object condition or
   fill-level observations stay internal and are never shown to clients),
   and, when you cover another manager's household, the first-visit notes
   which include whether the visit went smoothly.

<!-- surface-anchor: prompt-judgment -->
4. **Your judgment calls on service prompts.** When the app suggests an
   action and you act on it or set it aside, it records your answer,
   whether the prompt told you something new, and the reason you gave when
   setting one aside.

<!-- surface-anchor: incident-involvement -->
5. **Incident involvement.** Who reported and who resolved each incident.

<!-- surface-anchor: signin-device -->
6. **Sign-in and device records.** That you signed in, your paired device,
   and your notification settings. Your authenticator secret is stored
   encrypted and can be read by no one; it is used only to check your codes.

## Who can see these records

Management can see all of the above in the course of oversight, per
household. Clients see only the content written for them (visit reports);
they never see your hours, costs, observations, prompt answers, or the
action log.

## What this data is, and is not, used for

Honesty requires stating this plainly: several of these records could, in
principle, support inferences about an individual staff member's
performance or productivity. Today, no screen or report in the system
computes any per-person rating, ranking, or act-rate, and we commit to not
building one without first reviewing that decision on its own and telling
you about it before it is used.

## How long we keep it

The action log is permanent. Other records about you are kept for the
duration of your employment plus ⟨period: counsel sets this, no shorter
than the retention federal and Virginia employment recordkeeping rules
require for time and payroll records⟩.

## Acknowledgment

I have read this disclosure and understand what the system records about my
work, who can see it, and how long it is kept.

Signature: ____________________   Date: __________
