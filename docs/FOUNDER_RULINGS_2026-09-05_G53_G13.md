---
status: frozen
---
# Founder rulings, 5 September 2026: G-53, G-13, and return to the queue

Author: Rachel Letters, CEO. Paste to Claude Code. Register under WK-QA-018.

## G-53. The vault reveal outcome vocabulary, ruled
Four values, closed:

- `delivered`: the value was decrypted and returned.
- `denied`: the request was refused on authorization, before any decryption was attempted.
- `not_found`: no vault item existed for the reference.
- `failed`: decryption was attempted and did not succeed.

Four rather than the minimum two, and the reason belongs in the code beside the enum. "Who viewed this" is a question counsel asks and a member asks, and the honest answer separates a person who saw a value from a person who tried and got nothing, then separates an authorization refusal from a broken record. Collapsing `not_found` into `failed` would hide a data-integrity problem inside an access log. Collapsing `denied` into either would make a refusal look like an error, which is the opposite of what the trail is for.

The vocabulary is closed. A fifth outcome is a report to me, not an addition, because an audit vocabulary that grows silently makes old rows mean something different from new ones, and the whole value of the trail is that a row from last year and a row from today mean the same thing.

Until this lands, record on the row what the current trail actually says, in the words you used: any audit export answering "who viewed this" reads as "who was authorized to view this and attempted it."

## G-13. The staff disclosure, reclassified
It goes on my list today for counsel review, and onto the 25 September agenda as a **hiring precondition**, not as a document to be finished. Record it on the register in that form, including both facts that make it dangerous: nothing in CI can enforce it, and it is reached by the founding cohort rather than by a queue row. That combination is why it sat since August and why it would otherwise be discovered in the week we are making offers.

`time_entry` and `object_observation` already exist under the rule it gates, so the disclosure is owed against surfaces that shipped rather than surfaces we are planning. Say that plainly on the entry.

## The preparation batch is closed
Except item 5, which the spec register assigns to me, and the founder-side inputs the batch is waiting on. Do not reopen any of it.

## Return to the build queue
Continue in queue order under the standing authorization. I owe you three things and will send them: the eight Task Inventory verdicts, the staging URLs, and the v7.0 and WK-FIN-012 intake. None of them blocks the queue's next item.
