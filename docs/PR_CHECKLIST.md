# Pre-PR checklist — the repo's laws, applied not remembered

From the anticipation sessions doc: "a checklist a session can apply is more
reliable than noticing." Apply to every PR before pushing; each line is a
law already in force somewhere in the governing docs, gathered here.

## Language (WK-DEV-005 / repo convention)

- [ ] No em dashes in generated or client-facing text (rule prompt text,
      season summaries, notification bodies). Docs and code comments are
      exempt; anything a client or HM reads in the product is not.
- [ ] Client-facing copy is plain language (WRI style): short sentences,
      no jargon, no AI-sounding filler.
- [ ] Table names snake_case singular; money in integer cents; uuid v7 ids
      except where a natural key is the law (provision ids).

## Data protection (the non-negotiables)

- [ ] Any NEW client-facing route or payload runs the guards live:
      `assertClientPayloadSafe`, `assertNoProvisionRows`,
      `assertNoAnticipationRows`. A new internal (s2) table gets a shape
      check added to `assertNoAnticipationRows` or a sibling.
- [ ] No s3 value ever lands outside the vault; an audit row is written
      BEFORE any secured value leaves the server.
- [ ] Nothing hard-deletes except the vault crypto-shred inside the
      erasure tool. Everything else tombstones, archives, or end-dates.
- [ ] Server actions fail closed: role checked from the DB, invalid input
      returns silently, no client-supplied role or household id trusted.

## The rules the reviews taught (2026-07-25)

- [ ] Adds or changes a data category → `legal/README.md` ground truth AND
      the privacy notice's collection table updated IN THE SAME PR
      (sessions doc standing rule 7 — violated once, caught by drift check).
- [ ] Touches exclusions, floors, or the projection layer → the
      floor-bypass e2e spec still passes and the security probe section
      still applies (G-05: the assertion whose failure mode is physical).
- [ ] Changes what counts as a "fired" prompt → find EVERY reader of the
      old count (rule health, digests, exhibits) — the miss is the bug.
- [ ] Adds a dev-only surface → a 404-in-production line joins DEPLOY §4
      item 4 (standing rule from G-15).
- [ ] Adds a scripted check → ONE verdict per check; detail lines carry
      the specifics; a repair prints as REPAIRED, never silent PASS.
- [ ] New thresholds ship as `app_setting` configuration with a documented
      default, never constants (A2 finding 4). And the threshold VALUE is
      founder policy — leave it blank or bracketed rather than choosing.

## Process

- [ ] One migration per PR. Needing two means the PR is too big.
- [ ] Typecheck + tests green from the repo root, with NO dev server
      running (phantom-failure rule; reproduced five times on 2026-07-25).
- [ ] SPEC_AUDIT row(s) updated to match reality in the same PR — the
      audit decays with every merge that skips this.
- [ ] Commit messages: what changed and why it is safe, no model names,
      receipts for claims (a test, a live run, a verified output).
