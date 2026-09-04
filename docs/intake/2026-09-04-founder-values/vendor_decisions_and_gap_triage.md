---
status: frozen
---
# Two vendor decisions and the G-register triage method

## SMS and voice provider: Twilio
Telnyx is cheaper per message and has good 10DLC support. For a company with one part-time engineer, Twilio's advantages decide it: the most complete 10DLC brand and campaign registration flow, Conversations for two-way threads, Verify if MFA ever moves to SMS, and the broadest documentation a coding agent already knows. Cost difference at 20 households is immaterial. Register the brand and campaign the week the entity exists (2 to 4 weeks of carrier lead time); campaign description: "transactional household service coordination and acknowledgments to opted-in members; no marketing." Sole SMS producer in code stays the routing layer (Q-9).

## Managed KMS: AWS KMS
The stack already uses S3 for object storage. AWS KMS with a customer-managed key per environment and envelope encryption for the per-household libsodium keys keeps one cloud, one IAM model, one audit log (CloudTrail) for the security assessor. Google Cloud KMS is equivalent technically and adds a second provider to explain. Migrate when funded as the review says; the key hierarchy (KMS master, per-household data keys) is already designed.

## Triaging G-1 to G-119 in one hour
For each gap, one of four marks:
- CLOSE: the value or decision is in known_unknowns_values.csv or decision_rights_by_tier.csv; cite the row.
- DEFER_E2: needs live data; give the measurement that closes it.
- LAUREN: training or delivery doctrine; assign.
- COUNSEL: legal; goes in the counsel letter.
Send the marked list to Claude Code as a document-only session (no code), the same shape as Q-0b. Gaps marked CLOSE become configuration in one PR.
