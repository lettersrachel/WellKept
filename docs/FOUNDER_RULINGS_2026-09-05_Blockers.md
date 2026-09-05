---
status: frozen
---
# Founder rulings on the seven blockers, 5 September 2026

Author: Rachel Letters, CEO. Paste whole to Claude Code. Register under WK-QA-018. Three of the four decisions are settled here; the fourth needs a format from you before I can answer it. The intakes are mine and are dated below.

## Decision 1. Shadow-mode households, settled
Fernbrook Demo, The Training Household, and Household Green. Fernbrook because it is the richest record and the cascade needs something to reason from; Training because it is where the COO works; Green because it is my own house and the one I can judge fastest. Smoke Test Fixture stays out deliberately: it is the deploy-checklist target and shadow output would confuse it. HO Twin and Shadow Test are not selected. Record the reasons, not only the names, so a later reader does not swap one for another on the assumption that any three would do. Q-11s unblocks.

## Decision 2. time_entry.tz NOT NULL, not yet
I cannot confirm that no pre-0060 offline command is still queued on a device, because I do not know what is on the COO's phone or the test handsets. The nullable column is the honest state until I can. Give me the exact query or check that would settle it, including how to read a device's queue if that is what it takes, and I will answer definitively. Until then the row stays blocked on me with that condition named rather than on a general uncertainty.

## Decision 3. ExecutionActual versus section 29, resolved against ExecutionActual
Section 29 wins. There is no universal HOM stopwatch, ever. Seven time segments per visit is precisely the measurement the never-measured doctrine bars, and I would rather carry a weaker E2 metric than run a system that times my operators. Strike ExecutionActual's seven segments rather than deferring them, so nobody reopens the question later looking for a better metric. E2 measures visit minutes per household, which is what item 3 says it will do by default. Record the conflict as resolved with the doctrine as the stated reason, and flag any future row that would reintroduce per-task timing.

## Decision 4. Task Inventory v1.4, the 15 UNCERTAIN rows
This one is mine and it is an afternoon, so make it forty minutes. Send the 15 rows as a single list, each with: the row, what the verdict turns on in one line, the two candidate verdicts, and which one the tree's existing precedent would suggest if any. Formatted so I can answer straight down the page. I will return the verdicts in one message. Do not guess any of them in the meantime and do not let WL Gate 2's estimator proceed on an assumed answer.

## The three intakes
- **A129 (Q-7):** retrieval, mine, this week. If it turns out to be paper-only, I will say so and the row stays blocked with that recorded as its condition rather than as an absence.
- **WK-SVC-004 (Q-11t):** retrieval, mine, this week.
- **WK-TRN-009 (Q-16):** not retrieval. It does not exist and must be written, and it is the COO's program being written down, so it is hers and mine together. It goes on the 25 September agenda. Record it as a founder writing task with that date rather than as a missing document.

## v7.0 and WK-FIN-012, which are the more serious gap
Neither is in the tree, and `E1_READINESS.md` is therefore making claims about a gate whose source documents this repository has never seen. Two things. First, mark every E1 condition in that document as unverified against source, so it stops reading as settled. Second, I will intake both this week. Until they land, no document should state what E1 requires without that qualifier attached.

## Staging
I will do all six steps in one sitting this week and report the URLs. Taking your correction: a separate Neon database, not a branch of production, since the audit exercises destructive paths and the erasure rule now names branches by name. Fresh `WK_KMS_KEY` and `AUTH_SECRET`, separate Upstash for `REDIS_URL`, separate Resend key with the hard internal allowlist per the 24 August ruling. Your correction of "six clicks" to three creations, one secrets step, one command and one handoff is the accurate framing and is what I am working from.

## Continue
Then continue with preparation batch item 4 and onward in order.
