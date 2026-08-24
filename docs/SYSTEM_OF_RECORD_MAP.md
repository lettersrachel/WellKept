---
status: living
---
# Per-workflow system-of-record map

The Gate 0 deliverable documenting WK-DEV-006 D1 as clarified by Ruling
2a of the 24 August dev-session rulings: "platform of record" governs
the software Well Kept builds and owns; external systems of record are
permitted and are documented here. Migration of any workflow in either
direction requires a register entry. This map records what IS, verified
against the repo and the controlling ADRs at `cb22b3d`; it is not a
roadmap.

| Workflow | System of record | Authority / evidence |
|---|---|---|
| Household record, playbook, registries | The app (this monorepo, Postgres on Neon) | packages/schema; WK-DEV-006 D1 |
| Visit execution, close flow, offline capture | The app (offline-queue, visit_command) | packages/offline-queue; apps/web visit surfaces |
| Audit trail | The app (audit_event in Postgres, append-only; tokenised identities per ADR-006) | ADR-006; the audit invariant in CLAUDE.md |
| S3 secured values | The app's vault (envelope encryption under WK_KMS_KEY) | packages/vault; ADR-005 custody |
| Scheduling and rostering | Jobber, until an evidence-gated migration decision with a register entry | ADR-004 section 2; Ruling 2a |
| Invoicing, collection, dunning | QuickBooks today. The selected payments processor becomes payments' system of record when D5 selection lands: mandate capture on its hosted surface, retries and dunning processor-side, the app consuming webhooks and holding mandate status plus a token only | ADR-004 section 1; Ruling 2; the superseding ADR ships with the first payments code |
| Payroll and time of record | QuickBooks; the app captures hours and arrival/departure events as service records feeding it (REQ-083 events are also the covenant inputs) | ADR-004 section 3; WK-DEV-004 additions |
| Covenant metrics (utilization, churn-with-cause) | The app, as a pure function of REQ-083 events, visible per Ruling 1's scope only | REQ-083; Ruling 1; CLAUDE.md boundary |
| Email delivery | Resend, via packages/mail; delivery-state trust is an open question (the AO delivered-but-never-arrived case) | delta report row; packages/mail |
| Background jobs, digests, trigger engine | The app's worker on Railway, BullMQ on Upstash Redis | services/worker; WORK_QUEUE 28 July record |
| Photos and media | The app (base64 in Postgres, deliberate pilot posture; object storage is a future migration with a register entry) | packages/schema tables.ts:374; delta report |
| Source control and CI | GitHub (LLC-owned org per handoff 24.8), GitHub Actions | ci.yml; A566 |
| Web hosting | Vercel; database Neon; worker Railway (dashboard-only control surface) | delta report hosting row |
| Secrets | Vercel and Railway environment stores; locally the gitignored `.neon-connection`, by name only | deploy.sh env gate; CLAUDE.md |
| Financial figures and the plan of record | The v2.9r2 model workbook, founder-held; never this repo | A553; 00_CURRENT_AUTHORITY (reference-only) |
| Outreach and named contacts | The controlled CRM boundary; never the app, never library exports | A557 |
| Member Circle (non-client records) | ON PAPER through the pilot per Ruling 5; enters the app only when REQ-077 is built | Ruling 5; G-56 |
| Legal documents and notices | docs/legal master copies plus the published /privacy page, changed only in lockstep | CLAUDE.md merge gates |

Two rows are transitional by declared intent, not drift: payments (QuickBooks
until the D5 processor selection, then the processor, with the ADR-004
supersession shipping alongside the first payments code) and photos
(Postgres until an object-storage migration is decided; REQ-070's S3
wording and the five-year retention envelope both assume that eventual
move). Everything else moves only with a register entry, per Ruling 2a.
