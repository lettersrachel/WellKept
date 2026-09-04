---
status: frozen
---
# Copy for freeze-gated surfaces · drafted now, released by the 25 September two-key decision

Voice: plain, warm, brief. Never "AI", never "system". The company name is the config value {BRAND}. The HOM's name is {HOM_FIRST}. Times are household local.

## Auto-acknowledgment (REQ-079), sent immediately on inbound, exempt from quiet hours
SMS, business hours:
> Got it. {HOM_FIRST} will reply by {REPLY_BY}. If this is urgent, call {EMERGENCY_LINE}.

SMS, after hours:
> Got it. We'll pick this up at {NEXT_WINDOW_START}. If it can't wait, call {EMERGENCY_LINE} and a person answers.

Email, any time:
> Subject: Received: {SUBJECT_ECHO}
> Thanks, we have it. {HOM_FIRST} will reply by {REPLY_BY}. Anything urgent goes to {EMERGENCY_LINE}. Nothing needs to be done on your side.

Voicemail transcription acknowledgment (SMS):
> We got your message. {HOM_FIRST} will call back by {REPLY_BY}.

## Decision inbox (Q-6 member half)
Empty state:
> Nothing needs you this week.

Item header pattern:
> {ONE_LINE_WHAT}. {ONE_LINE_WHY_NOW}.
> Recommended: {OPTION_A}. Alternative: {OPTION_B}. Decide by {DEADLINE} or we'll go with the recommendation. [Yes to recommended] [Choose alternative] [Talk to {HOM_FIRST}]

Handled confirmation:
> Done. {ONE_LINE_OUTCOME}. Nothing else needed.

Approaching (no action required):
> Coming up: {WHAT} on {DATE}. {HOM_FIRST} has it. You'll only hear from us if something changes.

Changed:
> Change: {WHAT} moved to {NEW}. We've updated {DEPENDENT_ITEMS}. Nothing needed from you.

## Weekly digest (WK-DEV-007, freeze-gated)
Header:
> Your week, handled.

Empty week:
> A quiet week. Everything scheduled ran as planned. Next up: {NEXT_ITEM} on {DATE}.

Footer (from config):
> {BRAND} · Questions? Reply to this note or text {HOM_FIRST}. Urgent: {EMERGENCY_LINE}.

## Anticipation opt-in at intake (Q-7)
> We can notice things before they become tasks: a renewal coming due, a school day that changes your pickup, a service your house will need before the season. We'll suggest, never act, and you can dismiss anything. Turn this on?
> [On] [Not yet]

## Export (Q-8b, member-initiated, freeze-gated control)
> Your household record belongs to you. Download a complete copy any time. Sensitive values (codes, account details) are included only after you confirm.
> [Download my household record]
